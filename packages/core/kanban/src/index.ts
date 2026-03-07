import type {
  KanbanTask,
  KanbanBoardState,
  TaskComment,
  TaskFilter,
  TaskPatch,
  TaskStatus,
  TaskId,
  ProjectId,
  UserId,
  Timestamp,
} from '@imperium/shared-types'
import {
  createTaskId,
  createTimestamp,
  TASK_STATUSES,
} from '@imperium/shared-types'

// ============================================================================
// Kanban Task Repository Interface (injected)
// ============================================================================

/**
 * Repository interface — decouples KanbanService from database implementation.
 * Use `TaskRepository` from `@imperium/core-db` as the concrete implementation.
 */
export interface KanbanTaskRepository {
  insert(task: KanbanTask): Promise<void>
  update(taskId: TaskId, patch: TaskPatch): Promise<void>
  delete(taskId: TaskId): Promise<void>
  getById(taskId: TaskId): Promise<KanbanTask | undefined>
  getByProject(projectId: ProjectId, filter?: TaskFilter): Promise<readonly KanbanTask[]>
  countByProject(projectId: ProjectId): Promise<number>
  insertComment(comment: TaskComment): Promise<void>
  getComments(taskId: TaskId): Promise<readonly TaskComment[]>
}

// ============================================================================
// ID Generator (injectable for testing)
// ============================================================================

export type IdGeneratorFn = () => string

function defaultIdGenerator(): string {
  return crypto.randomUUID()
}

// ============================================================================
// Kanban Service
// ============================================================================

export class KanbanService {
  private readonly repo: KanbanTaskRepository
  private readonly generateId: IdGeneratorFn

  constructor(repo: KanbanTaskRepository, generateId?: IdGeneratorFn) {
    this.repo = repo
    this.generateId = generateId ?? defaultIdGenerator
  }

  /** Create a new task on the board */
  async createTask(params: {
    readonly projectId: ProjectId
    readonly title: string
    readonly description?: string | undefined
    readonly priority?: KanbanTask['priority'] | undefined
    readonly assignee?: UserId | 'agent' | undefined
  }): Promise<KanbanTask> {
    const now = createTimestamp()
    const task: KanbanTask = {
      id: createTaskId(this.generateId()),
      projectId: params.projectId,
      title: params.title,
      description: params.description ?? '',
      status: 'todo',
      priority: params.priority ?? 'medium',
      ...(params.assignee !== undefined ? { assignee: params.assignee } : {}),
      comments: [],
      createdAt: now,
      updatedAt: now,
    }

    await this.repo.insert(task)
    return task
  }

  /** Update an existing task */
  async updateTask(taskId: TaskId, patch: TaskPatch): Promise<KanbanTask | undefined> {
    const existing = await this.repo.getById(taskId)
    if (!existing) return undefined

    await this.repo.update(taskId, patch)
    return this.repo.getById(taskId)
  }

  /** Move a task to a new status column */
  async moveTask(taskId: TaskId, status: TaskStatus): Promise<KanbanTask | undefined> {
    return this.updateTask(taskId, { status })
  }

  /** Delete a task */
  async deleteTask(taskId: TaskId): Promise<boolean> {
    const existing = await this.repo.getById(taskId)
    if (!existing) return false
    await this.repo.delete(taskId)
    return true
  }

  /** Get a single task by ID */
  async getTask(taskId: TaskId): Promise<KanbanTask | undefined> {
    return this.repo.getById(taskId)
  }

  /** List tasks for a project with optional filtering */
  async listTasks(projectId: ProjectId, filter?: TaskFilter): Promise<readonly KanbanTask[]> {
    return this.repo.getByProject(projectId, filter)
  }

  /** Get the full board state grouped by columns */
  async getBoardState(projectId: ProjectId): Promise<KanbanBoardState> {
    const allTasks = await this.repo.getByProject(projectId)

    const columns: Record<TaskStatus, KanbanTask[]> = {
      'todo': [],
      'in-progress': [],
      'review': [],
      'done': [],
    }

    for (const task of allTasks) {
      const col = columns[task.status]
      if (col) {
        col.push(task)
      }
    }

    return {
      columns,
      taskCount: allTasks.length,
    }
  }

  /** Add a comment to a task */
  async addComment(params: {
    readonly taskId: TaskId
    readonly author: UserId | 'agent'
    readonly content: string
    readonly emoji?: string | undefined
  }): Promise<TaskComment> {
    const comment: TaskComment = {
      id: this.generateId(),
      taskId: params.taskId,
      author: params.author,
      content: params.content,
      ...(params.emoji !== undefined ? { emoji: params.emoji } : {}),
      createdAt: createTimestamp(),
    }

    await this.repo.insertComment(comment)
    return comment
  }

  /** Get all comments for a task */
  async getComments(taskId: TaskId): Promise<readonly TaskComment[]> {
    return this.repo.getComments(taskId)
  }
}
