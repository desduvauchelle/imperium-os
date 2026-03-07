import type { MemoryBlockId, MessageId, ProjectId, Timestamp } from './brand.js'

// ============================================================================
// Memory & Chat Types
// ============================================================================

/** Chat role */
export type ChatRole = 'user' | 'assistant' | 'system' | 'tool'

/** All valid chat roles */
export const CHAT_ROLES = ['user', 'assistant', 'system', 'tool'] as const satisfies readonly ChatRole[]

/** Type guard for ChatRole */
export function isChatRole(value: unknown): value is ChatRole {
  return typeof value === 'string' && CHAT_ROLES.includes(value as ChatRole)
}

/** Individual chat message */
export interface ChatMessage {
  readonly id: MessageId
  readonly projectId: ProjectId
  readonly role: ChatRole
  readonly content: string
  readonly timestamp: Timestamp
  readonly model?: string | undefined
  readonly tokenCount?: number | undefined
  readonly costUsd?: number | undefined
}

/** Summarized memory block */
export interface MemoryBlock {
  readonly id: MemoryBlockId
  readonly projectId: ProjectId
  readonly summary: string
  readonly messageRange: {
    readonly from: MessageId
    readonly to: MessageId
  }
  readonly createdAt: Timestamp
  readonly tokenCount: number
}

/** Context snapshot for session resumption */
export interface ContextSnapshot {
  readonly projectId: ProjectId
  readonly memoryBlocks: readonly MemoryBlock[]
  readonly recentMessages: readonly ChatMessage[]
  readonly fileTreeSkeleton: string
  readonly snapshotAt: Timestamp
}

/** Sliding window configuration */
export interface SlidingWindowConfig {
  readonly maxMessages: number
  readonly maxTokens: number
  readonly summarizeThreshold: number
}

/** Default sliding window settings */
export const DEFAULT_SLIDING_WINDOW: SlidingWindowConfig = {
  maxMessages: 10,
  maxTokens: 8000,
  summarizeThreshold: 6000,
} as const
