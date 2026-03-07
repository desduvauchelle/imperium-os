import { describe, expect, test } from 'bun:test'
import { isAgentState, AGENT_STATES } from '../src/agent.js'
import { isProjectStatus, PROJECT_STATUSES } from '../src/project.js'
import { isChatRole, CHAT_ROLES, DEFAULT_SLIDING_WINDOW } from '../src/memory.js'
import { isModelProvider, MODEL_PROVIDERS } from '../src/costing.js'
import { isTaskStatus, TASK_STATUSES } from '../src/task.js'
import { isAuthProvider, AUTH_PROVIDERS } from '../src/user.js'
import { isNotificationType, NOTIFICATION_TYPES } from '../src/notification.js'
import { isMcpServer } from '../src/mcp.js'
import { ok, err, isOk, isErr } from '../src/result.js'

describe('Agent Types', () => {
  test('AGENT_STATES has all states', () => {
    expect(AGENT_STATES).toEqual(['idle', 'running', 'suspended', 'completed', 'error'])
  })

  test('isAgentState validates correctly', () => {
    expect(isAgentState('idle')).toBe(true)
    expect(isAgentState('running')).toBe(true)
    expect(isAgentState('suspended')).toBe(true)
    expect(isAgentState('invalid')).toBe(false)
    expect(isAgentState(null)).toBe(false)
  })
})

describe('Project Types', () => {
  test('PROJECT_STATUSES has all statuses', () => {
    expect(PROJECT_STATUSES).toEqual(['active', 'archived', 'paused'])
  })

  test('isProjectStatus validates correctly', () => {
    expect(isProjectStatus('active')).toBe(true)
    expect(isProjectStatus('deleted')).toBe(false)
  })
})

describe('Memory Types', () => {
  test('CHAT_ROLES has all roles', () => {
    expect(CHAT_ROLES).toEqual(['user', 'assistant', 'system', 'tool'])
  })

  test('isChatRole validates correctly', () => {
    expect(isChatRole('user')).toBe(true)
    expect(isChatRole('admin')).toBe(false)
  })

  test('DEFAULT_SLIDING_WINDOW has reasonable defaults', () => {
    expect(DEFAULT_SLIDING_WINDOW.maxMessages).toBe(10)
    expect(DEFAULT_SLIDING_WINDOW.maxTokens).toBe(8000)
    expect(DEFAULT_SLIDING_WINDOW.summarizeThreshold).toBeLessThan(DEFAULT_SLIDING_WINDOW.maxTokens)
  })
})

describe('Costing Types', () => {
  test('MODEL_PROVIDERS has all providers', () => {
    expect(MODEL_PROVIDERS).toEqual(['anthropic', 'openai', 'google', 'local'])
  })

  test('isModelProvider validates correctly', () => {
    expect(isModelProvider('anthropic')).toBe(true)
    expect(isModelProvider('azure')).toBe(false)
  })
})

describe('Task Types', () => {
  test('TASK_STATUSES has all statuses', () => {
    expect(TASK_STATUSES).toEqual(['todo', 'in-progress', 'review', 'done'])
  })

  test('isTaskStatus validates correctly', () => {
    expect(isTaskStatus('todo')).toBe(true)
    expect(isTaskStatus('pending')).toBe(false)
  })
})

describe('User Types', () => {
  test('AUTH_PROVIDERS has all providers', () => {
    expect(AUTH_PROVIDERS).toEqual(['local', 'github', 'google'])
  })

  test('isAuthProvider validates correctly', () => {
    expect(isAuthProvider('github')).toBe(true)
    expect(isAuthProvider('facebook')).toBe(false)
  })
})

describe('Notification Types', () => {
  test('NOTIFICATION_TYPES has all types', () => {
    expect(NOTIFICATION_TYPES).toEqual(['info', 'warning', 'error', 'action-required'])
  })

  test('isNotificationType validates correctly', () => {
    expect(isNotificationType('info')).toBe(true)
    expect(isNotificationType('debug')).toBe(false)
  })
})

describe('MCP Types', () => {
  test('isMcpServer validates a valid server', () => {
    const server = {
      id: 'fs',
      name: 'File System',
      description: 'File system operations',
      version: '1.0.0',
      tools: [],
      enabled: true,
    }
    expect(isMcpServer(server)).toBe(true)
  })

  test('isMcpServer rejects invalid values', () => {
    expect(isMcpServer(null)).toBe(false)
    expect(isMcpServer({})).toBe(false)
    expect(isMcpServer({ id: 'x' })).toBe(false)
    expect(isMcpServer('string')).toBe(false)
  })
})

describe('Result Type', () => {
  test('ok creates a success result', () => {
    const result = ok(42)
    expect(result.ok).toBe(true)
    if (isOk(result)) {
      expect(result.value).toBe(42)
    }
  })

  test('err creates a failure result', () => {
    const result = err(new Error('boom'))
    expect(result.ok).toBe(false)
    if (isErr(result)) {
      expect(result.error.message).toBe('boom')
    }
  })

  test('isOk correctly identifies success', () => {
    expect(isOk(ok('yes'))).toBe(true)
    expect(isOk(err('no'))).toBe(false)
  })

  test('isErr correctly identifies failure', () => {
    expect(isErr(err('no'))).toBe(true)
    expect(isErr(ok('yes'))).toBe(false)
  })
})
