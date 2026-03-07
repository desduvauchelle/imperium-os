import type { ProjectId, TaskId, Timestamp, UserId } from './brand.js'

// ============================================================================
// Task / Kanban Types
// ============================================================================

/** Task status on the Kanban board */
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done'

/** All valid task statuses */
export const TASK_STATUSES = [
  'todo',
  'in-progress',
  'review',
  'done',
] as const satisfies readonly TaskStatus[]

/** Type guard for TaskStatus */
export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && TASK_STATUSES.includes(value as TaskStatus)
}

/** Task priority */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

/** Comment on a task card */
export interface TaskComment {
  readonly id: string
  readonly taskId: TaskId
  readonly author: UserId | 'agent'
  readonly content: string
  readonly emoji?: string | undefined
  readonly createdAt: Timestamp
}

/** Kanban task card */
export interface KanbanTask {
  readonly id: TaskId
  readonly projectId: ProjectId
  readonly title: string
  readonly description: string
  readonly status: TaskStatus
  readonly priority: TaskPriority
  readonly assignee?: UserId | 'agent' | undefined
  readonly comments: readonly TaskComment[]
  readonly createdAt: Timestamp
  readonly updatedAt: Timestamp
}

// ============================================================================
// Kanban Board State & Filtering
// ============================================================================

/** Kanban board state — tasks grouped by status column */
export interface KanbanBoardState {
  readonly columns: Readonly<Record<TaskStatus, readonly KanbanTask[]>>
  readonly taskCount: number
}

/** Filter criteria for the Kanban board */
export interface TaskFilter {
  readonly status?: TaskStatus | undefined
  readonly priority?: TaskPriority | undefined
  readonly assignee?: UserId | 'agent' | undefined
  readonly projectId?: ProjectId | undefined
  readonly search?: string | undefined
}

/** Partial update to a task — any mutable fields */
export interface TaskPatch {
  readonly title?: string | undefined
  readonly description?: string | undefined
  readonly status?: TaskStatus | undefined
  readonly priority?: TaskPriority | undefined
  readonly assignee?: UserId | 'agent' | undefined
}
