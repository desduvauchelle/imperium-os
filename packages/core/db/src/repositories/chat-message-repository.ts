import { eq, desc } from 'drizzle-orm'
import type { ImperiumDb } from '../client.js'
import { chatMessages } from '../schema.js'
import type {
  ChatMessage,
  ChatRole,
  MessageId,
  ProjectId,
  Timestamp,
} from '@imperium/shared-types'

// ============================================================================
// Chat Message Repository
// ============================================================================

export class ChatMessageRepository {
  constructor(private readonly db: ImperiumDb) {}

  /** Insert a new chat message */
  async insert(message: ChatMessage): Promise<void> {
    await this.db.insert(chatMessages).values({
      id: message.id,
      projectId: message.projectId as unknown as string,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp as unknown as string,
      model: message.model ?? null,
      tokenCount: message.tokenCount ?? null,
      costUsd: message.costUsd ?? null,
    })
  }

  /** Get all messages for a project, ordered by timestamp ascending */
  async getByProject(projectId: ProjectId): Promise<readonly ChatMessage[]> {
    const rows = await this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.projectId, projectId as unknown as string))
      .orderBy(chatMessages.timestamp)

    return rows.map(rowToChatMessage)
  }

  /** Get the most recent N messages for a project (sliding window) */
  async getWindow(projectId: ProjectId, limit: number): Promise<readonly ChatMessage[]> {
    const rows = await this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.projectId, projectId as unknown as string))
      .orderBy(desc(chatMessages.timestamp))
      .limit(limit)

    // Reverse to chronological order
    return rows.reverse().map(rowToChatMessage)
  }

  /** Count messages for a project */
  async countByProject(projectId: ProjectId): Promise<number> {
    const rows = await this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.projectId, projectId as unknown as string))

    return rows.length
  }
}

// ============================================================================
// Row Mapping
// ============================================================================

function rowToChatMessage(row: typeof chatMessages.$inferSelect): ChatMessage {
  return {
    id: row.id as MessageId,
    projectId: row.projectId as unknown as ProjectId,
    role: row.role as ChatRole,
    content: row.content,
    timestamp: row.timestamp as Timestamp,
    model: row.model ?? undefined,
    tokenCount: row.tokenCount ?? undefined,
    costUsd: row.costUsd ?? undefined,
  }
}
