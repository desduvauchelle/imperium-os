import type {
  AgentContext,
  AgentId,
  AgentTask,
  ActionCategory,
  LlmMessage,
  LlmProvider,
  Result,
  SuspensionContext,
} from '@imperium/shared-types'
import { ok, err, isOk, createAgentId, createTimestamp } from '@imperium/shared-types'
import { AgentStateMachine } from './state-machine.js'
import type { PermissionGuard, PermissionResult } from '@imperium/core-permissions'

// ============================================================================
// Engine Configuration
// ============================================================================

export interface EngineConfig {
  readonly defaultModel: string
  readonly maxRetries: number
  readonly timeoutMs: number
  readonly enableToolCalling: boolean
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  defaultModel: 'claude-3.5-sonnet',
  maxRetries: 3,
  timeoutMs: 30_000,
  enableToolCalling: true,
}

// ============================================================================
// Parsed tool call from LLM response
// ============================================================================

export interface ParsedToolCall {
  readonly name: string
  readonly arguments: Readonly<Record<string, unknown>>
  readonly actionCategory: ActionCategory
}

/** Error thrown when an agent enters SUSPENDED state */
export class SuspensionError extends Error {
  readonly agentId: AgentId
  readonly suspension: SuspensionContext

  constructor(agentId: AgentId, suspension: SuspensionContext) {
    super(`Agent ${String(agentId)} suspended: ${suspension.reason}`)
    this.name = 'SuspensionError'
    this.agentId = agentId
    this.suspension = suspension
  }
}

/** Map tool names to ActionCategory for permission gating */
const TOOL_ACTION_MAP: Readonly<Record<string, ActionCategory>> = {
  read_file: 'file-read',
  write_file: 'file-write',
  delete_file: 'file-delete',
  fetch: 'network-request',
  execute: 'shell-execute',
  mcp_call: 'mcp-call',
  system: 'system-modify',
}

/** Result of executing a tool (stubbed for Phase 3) */
export interface ToolExecutionResult {
  readonly toolName: string
  readonly output: string
  readonly success: boolean
}

// ============================================================================
// Engine - Reasoning, Tool-Calling, Chaining logic
// ============================================================================

export class Engine {
  readonly config: EngineConfig
  private readonly llm: LlmProvider | null
  private readonly guard: PermissionGuard | null
  private readonly stateMachines = new Map<string, AgentStateMachine>()

  constructor(
    config: Partial<EngineConfig> = {},
    llm?: LlmProvider,
    guard?: PermissionGuard,
  ) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config }
    this.llm = llm ?? null
    this.guard = guard ?? null
  }

  /** Get or create a state machine for an agent */
  getStateMachine(agentId: AgentId): AgentStateMachine {
    const key = String(agentId)
    let sm = this.stateMachines.get(key)
    if (!sm) {
      sm = new AgentStateMachine(agentId)
      this.stateMachines.set(key, sm)
    }
    return sm
  }

  /**
   * Execute a reasoning chain for a given agent task.
   * 1. Transitions state → running
   * 2. Builds prompt from context
   * 3. Calls LLM
   * 4. Parses tool calls from response
   * 5. For each tool call, runs through PermissionGuard gate:
   *    - allow: records execution (stubbed)
   *    - deny: transitions → error
   *    - prompt: transitions → suspended, throws SuspensionError
   * 6. Returns the LLM response content
   */
  async executeChain(task: AgentTask, context: AgentContext): Promise<Result<string>> {
    if (!this.llm) {
      return err(new Error('No LLM provider configured'))
    }

    const sm = this.getStateMachine(task.agentId)

    // Transition to running
    try {
      if (sm.state === 'idle' || sm.state === 'completed' || sm.state === 'error') {
        // Reset through idle first if needed
        if (sm.state === 'completed' || sm.state === 'error') {
          sm.transition('idle')
        }
        sm.transition('running')
      } else if (sm.state === 'suspended') {
        sm.transition('running')
      } else if (sm.state !== 'running') {
        return err(new Error(`Cannot start chain: agent is in '${sm.state}' state`))
      }
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)))
    }

    // Build messages
    const messages: LlmMessage[] = [
      { role: 'system', content: context.systemPrompt },
      { role: 'user', content: task.description },
    ]

    // Call LLM
    const llmResult = await this.llm.complete(messages, {
      model: context.model ?? this.config.defaultModel,
      maxTokens: 4096,
      temperature: 0.7,
    })

    if (!llmResult.ok) {
      sm.transition('error')
      return err(llmResult.error)
    }

    const responseContent = llmResult.value.content

    // Parse tool calls if tool calling is enabled
    if (this.config.enableToolCalling) {
      const toolCalls = this.parseToolCalls(responseContent)

      for (const toolCall of toolCalls) {
        const gateResult = this.gateToolCall(sm, task.agentId, toolCall)
        if (gateResult) {
          return gateResult
        }
      }
    }

    // Success — transition to completed
    sm.transition('completed')
    return ok(responseContent)
  }

  /**
   * Parse tool calls from an LLM response.
   * Looks for JSON blocks with a "tool" and "arguments" structure.
   */
  parseToolCalls(content: string): readonly ParsedToolCall[] {
    const toolCalls: ParsedToolCall[] = []
    // Match JSON blocks: ```json { "tool": "...", "arguments": {...} } ```
    const jsonBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g
    let match: RegExpExecArray | null

    while ((match = jsonBlockRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]!) as Record<string, unknown>
        if (typeof parsed['tool'] === 'string') {
          const toolName = parsed['tool']
          const args = (parsed['arguments'] ?? {}) as Readonly<Record<string, unknown>>
          const actionCategory = TOOL_ACTION_MAP[toolName] ?? ('mcp-call' as ActionCategory)
          toolCalls.push({ name: toolName, arguments: args, actionCategory })
        }
      } catch {
        // Skip malformed JSON blocks
      }
    }

    return toolCalls
  }

  /**
   * Gate a tool call through the permission guard.
   * Returns an error Result if the tool is denied or suspended, null if allowed.
   */
  private gateToolCall(
    sm: AgentStateMachine,
    agentId: AgentId,
    toolCall: ParsedToolCall,
  ): Result<string> | null {
    if (!this.guard) {
      // No guard configured — allow everything
      return null
    }

    const result = this.guard.evaluate(toolCall.actionCategory)

    switch (result.verdict) {
      case 'allow':
        // Tool execution is stubbed — just record that it was allowed
        return null

      case 'deny': {
        sm.transition('error')
        return err(
          new Error(`Tool '${toolCall.name}' denied: ${result.reason}`),
        )
      }

      case 'prompt': {
        const suspension: SuspensionContext = {
          action: toolCall.actionCategory,
          reason: `Tool '${toolCall.name}' requires approval under ${result.comfortLevel} profile`,
          pendingToolCall: toolCall.name,
        }
        sm.transition('suspended', suspension)
        return err(new SuspensionError(agentId, suspension))
      }
    }
  }

  /**
   * Execute a tool call (stub for Phase 3 — real MCP dispatch in Phase 4).
   */
  executeToolCall(toolCall: ParsedToolCall): ToolExecutionResult {
    return {
      toolName: toolCall.name,
      output: `[stub] Tool '${toolCall.name}' executed with args: ${JSON.stringify(toolCall.arguments)}`,
      success: true,
    }
  }

  /**
   * Resume a suspended agent chain.
   * If approved, transitions back to running.
   * If not approved, transitions to error.
   */
  async resumeChain(agentId: AgentId, approved: boolean): Promise<Result<void>> {
    const sm = this.getStateMachine(agentId)

    if (sm.state !== 'suspended') {
      return err(new Error(`Cannot resume: agent is in '${sm.state}' state, expected 'suspended'`))
    }

    if (approved) {
      sm.transition('running')
      // In a full implementation, we'd re-execute the pending tool call here
      // For Phase 3, we just transition back to running
      sm.transition('completed')
      return ok(undefined)
    } else {
      sm.transition('error')
      return ok(undefined)
    }
  }

  /**
   * Stop an active chain execution.
   */
  async stopChain(agentId: AgentId): Promise<void> {
    const sm = this.getStateMachine(agentId)
    if (sm.state === 'running' || sm.state === 'suspended') {
      sm.transition('error')
    }
  }
}

export { AgentStateMachine, SuspensionError as SuspensionErrorClass }
export type { TransitionCallback } from './state-machine.js'
