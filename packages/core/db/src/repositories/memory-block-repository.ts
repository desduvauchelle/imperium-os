import { eq, desc } from 'drizzle-orm'
import type { ImperiumDb } from '../client.js'
import { memoryBlocks } from '../schema.js'
import type {
  MemoryBlock,
  MemoryBlockId,
  MessageId,
  ProjectId,
  Timestamp,
} from '@imperium/shared-types'

// ============================================================================
// Memory Block Repository
// ============================================================================

export class MemoryBlockRepository {
  constructor(private readonly db: ImperiumDb) {}

  /** Insert a new memory block */
  async insert(block: MemoryBlock): Promise<void> {
    await this.db.insert(memoryBlocks).values({
      id: block.id as unknown as string,
      projectId: block.projectId as unknown as string,
      summary: block.summary,
      fromMessageId: block.messageRange.from as unknown as string,
      toMessageId: block.messageRange.to as unknown as string,
      createdAt: block.createdAt as unknown as string,
      tokenCount: block.tokenCount,
    })
  }

  /** Get all memory blocks for a project, ordered by creation time ascending */
  async getByProject(projectId: ProjectId): Promise<readonly MemoryBlock[]> {
    const rows = await this.db
      .select()
      .from(memoryBlocks)
      .where(eq(memoryBlocks.projectId, projectId as unknown as string))
      .orderBy(memoryBlocks.createdAt)

    return rows.map(rowToMemoryBlock)
  }

  /** Get the most recent N memory blocks for a project */
  async getRecent(projectId: ProjectId, limit: number): Promise<readonly MemoryBlock[]> {
    const rows = await this.db
      .select()
      .from(memoryBlocks)
      .where(eq(memoryBlocks.projectId, projectId as unknown as string))
      .orderBy(desc(memoryBlocks.createdAt))
      .limit(limit)

    return rows.reverse().map(rowToMemoryBlock)
  }

  /** Count memory blocks for a project */
  async countByProject(projectId: ProjectId): Promise<number> {
    const rows = await this.db
      .select()
      .from(memoryBlocks)
      .where(eq(memoryBlocks.projectId, projectId as unknown as string))

    return rows.length
  }
}

// ============================================================================
// Row Mapping
// ============================================================================

function rowToMemoryBlock(row: typeof memoryBlocks.$inferSelect): MemoryBlock {
  return {
    id: row.id as MemoryBlockId,
    projectId: row.projectId as unknown as ProjectId,
    summary: row.summary,
    messageRange: {
      from: row.fromMessageId as MessageId,
      to: row.toMessageId as MessageId,
    },
    createdAt: row.createdAt as Timestamp,
    tokenCount: row.tokenCount,
  }
}
