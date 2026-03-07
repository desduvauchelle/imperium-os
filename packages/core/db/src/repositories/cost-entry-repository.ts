import { desc } from 'drizzle-orm'
import type { ImperiumDb } from '../client.js'
import { costEntries } from '../schema.js'
import type {
  CostEntry,
  ModelProvider,
  Timestamp,
} from '@imperium/shared-types'

// ============================================================================
// Cost Entry Repository
// ============================================================================

export class CostEntryRepository {
  constructor(private readonly db: ImperiumDb) {}

  /** Insert a new cost entry */
  async insert(id: string, entry: CostEntry): Promise<void> {
    await this.db.insert(costEntries).values({
      id,
      model: entry.model,
      provider: entry.provider,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      costUsd: entry.costUsd,
      timestamp: entry.timestamp as unknown as string,
    })
  }

  /** Get all cost entries, newest first */
  async getAll(limit?: number, offset?: number): Promise<readonly CostEntry[]> {
    let query = this.db
      .select()
      .from(costEntries)
      .orderBy(desc(costEntries.timestamp))

    if (limit !== undefined) {
      query = query.limit(limit) as typeof query
    }
    if (offset !== undefined) {
      query = query.offset(offset) as typeof query
    }

    const rows = await query
    return rows.map(rowToCostEntry)
  }

  /** Count total entries */
  async count(): Promise<number> {
    const rows = await this.db.select().from(costEntries)
    return rows.length
  }
}

// ============================================================================
// Row Mapping
// ============================================================================

function rowToCostEntry(row: typeof costEntries.$inferSelect): CostEntry {
  return {
    model: row.model,
    provider: row.provider as ModelProvider,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    costUsd: row.costUsd,
    timestamp: row.timestamp as Timestamp,
  }
}
