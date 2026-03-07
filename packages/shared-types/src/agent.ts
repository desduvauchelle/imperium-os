import type { AgentId, MemoryBlockId, MessageId, ProjectId, Timestamp } from './brand.js'
import type { ActionCategory } from './comfort-level.js'

// ============================================================================
// Agent Types
// ============================================================================

/** Agent execution state */
export type AgentState = 'idle' | 'running' | 'suspended' | 'completed' | 'error'

/** All valid agent states */
export const AGENT_STATES = [
	'idle',
	'running',
	'suspended',
	'completed',
	'error',
] as const satisfies readonly AgentState[]

/** Type guard for AgentState */
export function isAgentState(value: unknown): value is AgentState {
	return typeof value === 'string' && AGENT_STATES.includes(value as AgentState)
}

/** Agent task definition */
export interface AgentTask {
	readonly agentId: AgentId
	readonly projectId: ProjectId
	readonly description: string
	readonly state: AgentState
	readonly startedAt: Timestamp
	readonly completedAt?: Timestamp | undefined
	readonly error?: string | undefined
	readonly suspensionReason?: string | undefined
}

/** Context provided to an agent for execution */
export interface AgentContext {
	readonly agentId: AgentId
	readonly projectId: ProjectId
	readonly model: string
	readonly systemPrompt: string
	readonly messageHistory: readonly MessageId[]
	readonly fileTreeDepth: number
	readonly memoryBlockIds: readonly MemoryBlockId[]
}

/** Context describing why an agent was suspended */
export interface SuspensionContext {
	readonly action: ActionCategory
	readonly reason: string
	readonly pendingToolCall?: string | undefined
}

/** Agent state transition event */
export interface AgentStateTransition {
	readonly agentId: AgentId
	readonly from: AgentState
	readonly to: AgentState
	readonly timestamp: Timestamp
	readonly suspension?: SuspensionContext | undefined
}

/** Serializable agent state for persistence */
export interface AgentSnapshot {
	readonly task: AgentTask
	readonly context: AgentContext
	readonly serializedAt: Timestamp
}
