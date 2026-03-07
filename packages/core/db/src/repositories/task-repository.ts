import { eq, desc, and, like } from 'drizzle-orm'
import type { ImperiumDb } from '../client.js'
import { tasks, taskComments } from '../schema.js'
import type {
  KanbanTask,
  TaskComment,
  TaskId,
  TaskStatus,
  TaskPriority,
  TaskPatch,
  TaskFilter,
  ProjectId,
  UserId,
  Timestamp,
} from '@imperium/shared-types'

// ============================================================================
// Task Repository
// ============================================================================

export class TaskRepository {
  constructor(private readonly db: ImperiumDb) {}

  /** Insert a new task */
  async insert(task: KanbanTask): Promise<void> {
    await this.db.insert(tasks).values({
      id: task.id as unknown as string,
      projectId: task.projectId as unknown as string,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee ?? null,
      createdAt: task.createdAt as unknown as string,
      updatedAt: task.updatedAt as unknown as string,
    })

    // Insert comments if any
    for (const comment of task.comments) {
      await this.insertComment(comment)
    }
  }

  /** Update a task by ID with a partial patch */
  async update(taskId: TaskId, patch: TaskPatch): Promise<void> {
    const values: Record<string, unknown> = {}
    if (patch.title !== undefined) values['title'] = patch.title
    if (patch.description !== undefined) values['description'] = patch.description
    if (patch.status !== undefined) values['status'] = patch.status
    if (patch.priority !== undefined) values['priority'] = patch.priority
    if (patch.assignee !== undefined) values['assignee'] = patch.assignee

    if (Object.keys(values).length === 0) return

    values['updatedAt'] = new Date().toISOString()

    await this.db
      .update(tasks)
      .set(values)
      .where(eq(tasks.id, taskId as unknown as string))
  }

  /** Delete a task and its comments */
  async delete(taskId: TaskId): Promise<void> {
    await this.db
      .delete(taskComments)
      .where(eq(taskComments.taskId, taskId as unknown as string))
    await this.db
      .delete(tasks)
      .where(eq(tasks.id, taskId as unknown as string))
  }

  /** Get a single task by ID with its comments */
  async getById(taskId: TaskId): Promise<KanbanTask | undefined> {
    const rows = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId as unknown as string))
      .limit(1)

    const row = rows[0]
    if (!row) return undefined

    const comments = await this.getComments(taskId)
    return rowToKanbanTask(row, comments)
  }

  /** Get tasks for a project, optionally filtered */
  async getByProject(projectId: ProjectId, filter?: TaskFilter): Promise<readonly KanbanTask[]> {
    const conditions = [eq(tasks.projectId, projectId as unknown as string)]

    if (filter?.status) {
      conditions.push(eq(tasks.status, filter.status))
    }
    if (filter?.priority) {
      conditions.push(eq(tasks.priority, filter.priority))
    }
    if (filter?.assignee) {
      conditions.push(eq(tasks.assignee, filter.assignee as unknown as string))
    }
    if (filter?.search) {
      conditions.push(like(tasks.title, `%${filter.search}%`))
    }

    const rows = await this.db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.updatedAt))

    const result: KanbanTask[] = []
    for (const row of rows) {
      const comments = await this.getComments(row.id as TaskId)
      result.push(rowToKanbanTask(row, comments))
    }
    return result
  }

  /** Count tasks for a project */
  async countByProject(projectId: ProjectId): Promise<number> {
    const rows = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId as unknown as string))
    return rows.length
  }

  /** Insert a comment on a task */
  async insertComment(comment: TaskComment): Promise<void> {
    await this.db.insert(taskComments).values({
      id: comment.id,
      taskId: comment.taskId as unknown as string,
      author: comment.author as unknown as string,
      content: comment.content,
      emoji: comment.emoji ?? null,
      createdAt: comment.createdAt as unknown as string,
    })
  }

  /** Get all comments for a task */
  async getComments(taskId: TaskId): Promise<readonly TaskComment[]> {
    const rows = await this.db
      .select()
      .from(taskComments)
      .where(eq(taskComments.taskId, taskId as unknown as string))
      .orderBy(taskComments.createdAt)

    return rows.map(rowToComment)
  }
}

// ============================================================================
// Row Mapping
// ============================================================================

function rowToKanbanTask(
  row: typeof tasks.$inferSelect,
  comments: readonly TaskComment[],
): KanbanTask {
  return {
    id: row.id as TaskId,
    projectId: row.projectId as unknown as ProjectId,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    assignee: row.assignee ? (row.assignee as UserId | 'agent') : undefined,
    comments,
    createdAt: row.createdAt as Timestamp,
    updatedAt: row.updatedAt as Timestamp,
  }
}

function rowToComment(row: typeof taskComments.$inferSelect): TaskComment {
  return {
    id: row.id,
    taskId: row.taskId as TaskId,
    author: row.author as UserId | 'agent',
    content: row.content,
    emoji: row.emoji ?? undefined,
    createdAt: row.createdAt as Timestamp,
  }
}
