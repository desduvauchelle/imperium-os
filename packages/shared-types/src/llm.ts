import type { Result } from './result.js'

// ============================================================================
// LLM Provider Types
// ============================================================================

/** Supported LLM provider identifiers */
export type LlmProviderType = 'anthropic' | 'google' | 'openai' | 'ollama'

/** All valid LLM provider types */
export const LLM_PROVIDER_TYPES = [
  'anthropic',
  'google',
  'openai',
  'ollama',
] as const satisfies readonly LlmProviderType[]

/** Type guard for LlmProviderType */
export function isLlmProviderType(value: unknown): value is LlmProviderType {
  return typeof value === 'string' && LLM_PROVIDER_TYPES.includes(value as LlmProviderType)
}

/** Role in an LLM conversation */
export type LlmRole = 'user' | 'assistant' | 'system'

/** A single message in an LLM conversation */
export interface LlmMessage {
  readonly role: LlmRole
  readonly content: string
}

/** Options for an LLM completion request */
export interface LlmCompletionOptions {
  readonly model: string
  readonly maxTokens?: number | undefined
  readonly temperature?: number | undefined
  readonly stopSequences?: readonly string[] | undefined
}

/** The result of an LLM completion */
export interface LlmCompletionResult {
  readonly content: string
  readonly model: string
  readonly inputTokens: number
  readonly outputTokens: number
  readonly costUsd: number
}

/** Unified interface for all LLM providers */
export interface LlmProvider {
  readonly type: LlmProviderType
  readonly name: string

  /**
   * Send a completion request to the LLM provider.
   * Returns a Result wrapping the completion output.
   */
  complete(
    messages: readonly LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<Result<LlmCompletionResult>>
}
