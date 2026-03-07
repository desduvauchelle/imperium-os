import { describe, expect, test } from 'bun:test'
import { Engine, DEFAULT_ENGINE_CONFIG, SuspensionError, AgentStateMachine } from '../src/index.js'
import type { ParsedToolCall } from '../src/index.js'
import { PermissionGuard } from '../../permissions/src/index.js'
import { MockLlmProvider } from '../../llm/src/index.js'
import type { AgentTask, AgentContext, AgentId } from '@imperium/shared-types'
import { createAgentId, createProjectId, createTimestamp, isOk, isErr } from '@imperium/shared-types'

// ============================================================================
// Helpers
// ============================================================================

function makeTask(overrides: Partial<AgentTask> = {}): AgentTask {
  return {
    agentId: createAgentId(),
    projectId: createProjectId(),
    description: 'Write a hello world function',
    state: 'idle',
    startedAt: createTimestamp(),
    ...overrides,
  }
}

function makeContext(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    agentId: createAgentId(),
    projectId: createProjectId(),
    model: 'claude-3.5-sonnet',
    systemPrompt: 'You are a helpful assistant.',
    messageHistory: [],
    fileTreeDepth: 3,
    memoryBlockIds: [],
    ...overrides,
  }
}

// ============================================================================
// AgentStateMachine tests
// ============================================================================

describe('AgentStateMachine', () => {
  test('starts in idle state by default', () => {
    const sm = new AgentStateMachine(createAgentId())
    expect(sm.state).toBe('idle')
  })

  test('accepts custom initial state', () => {
    const sm = new AgentStateMachine(createAgentId(), 'running')
    expect(sm.state).toBe('running')
  })

  test('transitions idle → running', () => {
    const sm = new AgentStateMachine(createAgentId())
    sm.transition('running')
    expect(sm.state).toBe('running')
  })

  test('transitions running → suspended', () => {
    const sm = new AgentStateMachine(createAgentId(), 'running')
    sm.transition('suspended', { action: 'file-delete', reason: 'Requires approval' })
    expect(sm.state).toBe('suspended')
    expect(sm.suspension?.action).toBe('file-delete')
  })

  test('transitions running → completed', () => {
    const sm = new AgentStateMachine(createAgentId(), 'running')
    sm.transition('completed')
    expect(sm.state).toBe('completed')
  })

  test('transitions running → error', () => {
    const sm = new AgentStateMachine(createAgentId(), 'running')
    sm.transition('error')
    expect(sm.state).toBe('error')
  })

  test('transitions suspended → running (resume)', () => {
    const sm = new AgentStateMachine(createAgentId(), 'suspended')
    sm.transition('running')
    expect(sm.state).toBe('running')
    expect(sm.suspension).toBeNull()
  })

  test('transitions suspended → error', () => {
    const sm = new AgentStateMachine(createAgentId(), 'suspended')
    sm.transition('error')
    expect(sm.state).toBe('error')
  })

  test('throws on illegal transition idle → completed', () => {
    const sm = new AgentStateMachine(createAgentId())
    expect(() => sm.transition('completed')).toThrow('Illegal state transition')
  })

  test('throws on illegal transition completed → running', () => {
    const sm = new AgentStateMachine(createAgentId(), 'completed')
    expect(() => sm.transition('running')).toThrow('Illegal state transition')
  })

  test('fires onTransition callback', () => {
    const sm = new AgentStateMachine(createAgentId())
    const transitions: string[] = []
    sm.onTransition((t) => transitions.push(`${t.from}→${t.to}`))
    sm.transition('running')
    sm.transition('completed')
    expect(transitions).toEqual(['idle→running', 'running→completed'])
  })

  test('unsubscribe stops callback', () => {
    const sm = new AgentStateMachine(createAgentId())
    const transitions: string[] = []
    const unsub = sm.onTransition((t) => transitions.push(`${t.from}→${t.to}`))
    sm.transition('running')
    unsub()
    sm.transition('completed')
    expect(transitions).toEqual(['idle→running'])
  })

  test('canTransitionTo returns correct values', () => {
    const sm = new AgentStateMachine(createAgentId())
    expect(sm.canTransitionTo('running')).toBe(true)
    expect(sm.canTransitionTo('completed')).toBe(false)
  })

  test('toSnapshot and fromSnapshot roundtrip', () => {
    const agentId = createAgentId()
    const sm = new AgentStateMachine(agentId)
    const suspension = { action: 'file-delete' as const, reason: 'test' }
    sm.transition('running')
    sm.transition('suspended', suspension)

    const snapshot = sm.toSnapshot()
    expect(snapshot.state).toBe('suspended')
    expect(snapshot.suspension?.action).toBe('file-delete')

    const restored = AgentStateMachine.fromSnapshot(snapshot)
    expect(restored.state).toBe('suspended')
    expect(restored.suspension?.action).toBe('file-delete')
  })
})

// ============================================================================
// Engine tests
// ============================================================================

describe('Engine', () => {
  test('instantiates with default config', () => {
    const engine = new Engine()
    expect(engine.config).toEqual(DEFAULT_ENGINE_CONFIG)
  })

  test('accepts partial config override', () => {
    const engine = new Engine({ maxRetries: 5, timeoutMs: 60_000 })
    expect(engine.config.maxRetries).toBe(5)
    expect(engine.config.timeoutMs).toBe(60_000)
    expect(engine.config.defaultModel).toBe(DEFAULT_ENGINE_CONFIG.defaultModel)
  })

  test('executeChain returns error when no LLM configured', async () => {
    const engine = new Engine()
    const task = makeTask()
    const context = makeContext({ agentId: task.agentId })
    const result = await engine.executeChain(task, context)
    expect(isErr(result)).toBe(true)
  })

  test('executeChain completes with no tool calls', async () => {
    const llm = new MockLlmProvider({ responseContent: 'Hello world!' })
    const engine = new Engine({}, llm)
    const task = makeTask()
    const context = makeContext({ agentId: task.agentId })
    const result = await engine.executeChain(task, context)
    expect(isOk(result)).toBe(true)
    if (result.ok) {
      expect(result.value).toBe('Hello world!')
    }
    // State machine should be in completed
    const sm = engine.getStateMachine(task.agentId)
    expect(sm.state).toBe('completed')
  })

  test('executeChain with allowed tool call completes (mad-max)', async () => {
    const llm = new MockLlmProvider({
      responseContent: 'I will read the file.\n```json\n{"tool": "read_file", "arguments": {"path": "test.ts"}}\n```',
    })
    const guard = new PermissionGuard('mad-max')
    const engine = new Engine({}, llm, guard)
    const task = makeTask()
    const context = makeContext({ agentId: task.agentId })
    const result = await engine.executeChain(task, context)
    expect(isOk(result)).toBe(true)
  })

  test('executeChain with denied tool call transitions to error (imperator)', async () => {
    const llm = new MockLlmProvider({
      responseContent: '```json\n{"tool": "system", "arguments": {"cmd": "rm -rf /"}}\n```',
    })
    const guard = new PermissionGuard('imperator')
    const engine = new Engine({}, llm, guard)
    const task = makeTask()
    const context = makeContext({ agentId: task.agentId })
    const result = await engine.executeChain(task, context)
    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error.message).toContain('denied')
    }
    const sm = engine.getStateMachine(task.agentId)
    expect(sm.state).toBe('error')
  })

  test('executeChain with prompt tool call suspends (praetorian)', async () => {
    const llm = new MockLlmProvider({
      responseContent: '```json\n{"tool": "delete_file", "arguments": {"path": "important.ts"}}\n```',
    })
    const guard = new PermissionGuard('praetorian')
    const engine = new Engine({}, llm, guard)
    const task = makeTask()
    const context = makeContext({ agentId: task.agentId })
    const result = await engine.executeChain(task, context)
    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(SuspensionError)
    }
    const sm = engine.getStateMachine(task.agentId)
    expect(sm.state).toBe('suspended')
    expect(sm.suspension?.pendingToolCall).toBe('delete_file')
  })

  test('resumeChain approved transitions to completed', async () => {
    const llm = new MockLlmProvider({
      responseContent: '```json\n{"tool": "delete_file", "arguments": {}}\n```',
    })
    const guard = new PermissionGuard('praetorian')
    const engine = new Engine({}, llm, guard)
    const task = makeTask()
    const context = makeContext({ agentId: task.agentId })

    // First run suspends
    await engine.executeChain(task, context)
    expect(engine.getStateMachine(task.agentId).state).toBe('suspended')

    // Resume with approval
    const resumeResult = await engine.resumeChain(task.agentId, true)
    expect(isOk(resumeResult)).toBe(true)
    expect(engine.getStateMachine(task.agentId).state).toBe('completed')
  })

  test('resumeChain rejected transitions to error', async () => {
    const llm = new MockLlmProvider({
      responseContent: '```json\n{"tool": "delete_file", "arguments": {}}\n```',
    })
    const guard = new PermissionGuard('praetorian')
    const engine = new Engine({}, llm, guard)
    const task = makeTask()
    const context = makeContext({ agentId: task.agentId })

    await engine.executeChain(task, context)
    const resumeResult = await engine.resumeChain(task.agentId, false)
    expect(isOk(resumeResult)).toBe(true)
    expect(engine.getStateMachine(task.agentId).state).toBe('error')
  })

  test('resumeChain returns error if not suspended', async () => {
    const engine = new Engine()
    const agentId = createAgentId()
    const result = await engine.resumeChain(agentId, true)
    expect(isErr(result)).toBe(true)
  })

  test('stopChain transitions running agent to error', async () => {
    const llm = new MockLlmProvider({ responseContent: 'ok' })
    const engine = new Engine({}, llm)
    const task = makeTask()
    const context = makeContext({ agentId: task.agentId })

    // Start a chain to get to running, but we need to stop mid-run
    // We'll use a direct state setup instead
    const sm = engine.getStateMachine(task.agentId)
    sm.transition('running')
    await engine.stopChain(task.agentId)
    expect(sm.state).toBe('error')
  })

  test('parseToolCalls extracts tool calls from response', () => {
    const engine = new Engine()
    const content = 'Let me read the file.\n```json\n{"tool": "read_file", "arguments": {"path": "src/index.ts"}}\n```\nDone.'
    const calls = engine.parseToolCalls(content)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.name).toBe('read_file')
    expect(calls[0]!.actionCategory).toBe('file-read')
  })

  test('parseToolCalls handles multiple tool calls', () => {
    const engine = new Engine()
    const content = '```json\n{"tool": "read_file", "arguments": {}}\n```\n```json\n{"tool": "write_file", "arguments": {}}\n```'
    const calls = engine.parseToolCalls(content)
    expect(calls).toHaveLength(2)
    expect(calls[0]!.actionCategory).toBe('file-read')
    expect(calls[1]!.actionCategory).toBe('file-write')
  })

  test('parseToolCalls skips invalid JSON', () => {
    const engine = new Engine()
    const content = '```json\n{invalid json}\n```'
    const calls = engine.parseToolCalls(content)
    expect(calls).toHaveLength(0)
  })

  test('parseToolCalls skips JSON without tool key', () => {
    const engine = new Engine()
    const content = '```json\n{"foo": "bar"}\n```'
    const calls = engine.parseToolCalls(content)
    expect(calls).toHaveLength(0)
  })

  test('executeToolCall returns stub result', () => {
    const engine = new Engine()
    const toolCall: ParsedToolCall = {
      name: 'read_file',
      arguments: { path: 'test.ts' },
      actionCategory: 'file-read',
    }
    const result = engine.executeToolCall(toolCall)
    expect(result.success).toBe(true)
    expect(result.toolName).toBe('read_file')
    expect(result.output).toContain('[stub]')
  })
})
