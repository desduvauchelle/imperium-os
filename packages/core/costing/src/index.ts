import type {
  CostEntry,
  CostSummary,
  ModelProvider,
  ModelUsage,
  RateLimit,
  Result,
  Timestamp,
} from '@imperium/shared-types'
import { createTimestamp } from '@imperium/shared-types'

// ============================================================================
// Cost Tracker - Usage tracking & pricing engine
// ============================================================================

export interface CostTrackerConfig {
  readonly currency: string
  readonly defaultRateLimits: readonly RateLimit[]
}

export const DEFAULT_COST_CONFIG: CostTrackerConfig = {
  currency: 'USD',
  defaultRateLimits: [],
}

export class CostTracker {
  readonly config: CostTrackerConfig
  private readonly _entries: CostEntry[] = []

  constructor(config: Partial<CostTrackerConfig> = {}) {
    this.config = { ...DEFAULT_COST_CONFIG, ...config }
  }

  /** Record a new cost entry */
  record(entry: CostEntry): void {
    this._entries.push(entry)
  }

  /** Get all recorded entries */
  getEntries(): readonly CostEntry[] {
    return this._entries
  }

  /** Get usage summary for the current period */
  getSummary(periodStart?: Timestamp, periodEnd?: Timestamp): CostSummary {
    const start = periodStart ?? createTimestamp(new Date(0))
    const end = periodEnd ?? createTimestamp()

    const filtered = this._entries.filter(
      (e) => e.timestamp >= start && e.timestamp <= end,
    )

    const entriesByModel: Record<string, ModelUsage> = {}

    let totalCostUsd = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0

    for (const entry of filtered) {
      totalCostUsd += entry.costUsd
      totalInputTokens += entry.inputTokens
      totalOutputTokens += entry.outputTokens

      const existing = entriesByModel[entry.model]
      if (existing) {
        entriesByModel[entry.model] = {
          ...existing,
          totalCostUsd: existing.totalCostUsd + entry.costUsd,
          totalInputTokens: existing.totalInputTokens + entry.inputTokens,
          totalOutputTokens: existing.totalOutputTokens + entry.outputTokens,
          callCount: existing.callCount + 1,
        }
      } else {
        entriesByModel[entry.model] = {
          model: entry.model,
          provider: entry.provider,
          totalCostUsd: entry.costUsd,
          totalInputTokens: entry.inputTokens,
          totalOutputTokens: entry.outputTokens,
          callCount: 1,
        }
      }
    }

    return {
      totalCostUsd,
      totalInputTokens,
      totalOutputTokens,
      entriesByModel,
      periodStart: start,
      periodEnd: end,
    }
  }

  /** Clear all recorded entries */
  clear(): void {
    this._entries.length = 0
  }
}
