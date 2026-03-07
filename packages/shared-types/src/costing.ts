import type { Timestamp } from './brand.js'

// ============================================================================
// Costing Types
// ============================================================================

/** Supported model providers */
export type ModelProvider = 'anthropic' | 'openai' | 'google' | 'local'

/** All valid model providers */
export const MODEL_PROVIDERS = [
  'anthropic',
  'openai',
  'google',
  'local',
] as const satisfies readonly ModelProvider[]

/** Type guard for ModelProvider */
export function isModelProvider(value: unknown): value is ModelProvider {
  return typeof value === 'string' && MODEL_PROVIDERS.includes(value as ModelProvider)
}

/** Individual usage record */
export interface CostEntry {
  readonly model: string
  readonly provider: ModelProvider
  readonly inputTokens: number
  readonly outputTokens: number
  readonly costUsd: number
  readonly timestamp: Timestamp
}

/** Aggregated usage summary */
export interface CostSummary {
  readonly totalCostUsd: number
  readonly totalInputTokens: number
  readonly totalOutputTokens: number
  readonly entriesByModel: Readonly<Record<string, ModelUsage>>
  readonly periodStart: Timestamp
  readonly periodEnd: Timestamp
}

/** Per-model usage aggregate */
export interface ModelUsage {
  readonly model: string
  readonly provider: ModelProvider
  readonly totalCostUsd: number
  readonly totalInputTokens: number
  readonly totalOutputTokens: number
  readonly callCount: number
}

/** Rate limit configuration */
export interface RateLimit {
  readonly provider: ModelProvider
  readonly model: string
  readonly maxRequestsPerMinute: number
  readonly maxTokensPerMinute: number
  readonly maxCostPerDay: number
}
