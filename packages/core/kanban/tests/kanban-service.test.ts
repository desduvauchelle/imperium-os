import { describe, expect, test, beforeEach } from 'bun:test'
import { KanbanService } from '../src/index.js'
import type { KanbanTaskRepository } from '../src/index.js'
import type { KanbanTask, TaskComment, TaskFilter, TaskPatch, TaskId, ProjectId } from '@imperium/shared-types'
import { createProjectId, createTaskId } from '@imperium/shared-types'

// ============================================================================
// In-memory mock repository
// ============================================================================

class InMemoryTaskRepo implements KanbanTaskRepository {
  private tasks = new Map<string, KanbanTask>()
  private comments = new Map<string, TaskComment[]>()

  async insert(task: KanbanTask): Promise<void> {
    this.tasks.set(task.id, task)
    if (task.comments.length > 0) {
      this.comments.set(task.id, [...task.comments])
    }
  }

  async update(taskId: TaskId, patch: TaskPatch): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return
    this.tasks.set(taskId, {
      ...task,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.assignee !== undefined ? { assignee: patch.assignee } : {}),
      updatedAt: new Date().toISOString() as any,
    })
  }

  async delete(taskId: TaskId): Promise<void> {
    this.tasks.delete(taskId)
    this.comments.delete(taskId)
  }

  async getById(taskId: TaskId): Promise<KanbanTask | undefined> {
    const task = this.tasks.get(taskId)
    if (!task) return undefined
    return { ...task, comments: this.comments.get(taskId) ?? [] }
  }

  async getByProject(projectId: ProjectId, filter?: TaskFilter): Promise<readonly KanbanTask[]> {
    let results = [...this.tasks.values()].filter((t) => t.projectId === projectId)
    if (filter?.status) results = results.filter((t) => t.status === filter.status)
    if (filter?.priority) results = results.filter((t) => t.priority === filter.priority)
    if (filter?.assignee) results = results.filter((t) => t.assignee === filter.assignee)
    if (filter?.search) results = results.filter((t) => t.title.includes(filter.search!))
    return results.map((t) => ({ ...t, comments: this.comments.get(t.id) ?? [] }))
  }

  async countByProject(projectId: ProjectId): Promise<number> {
    return [...this.tasks.values()].filter((t) => t.projectId === projectId).length
  }

  async insertComment(comment: TaskComment): Promise<void> {
    const existing = this.comments.get(comment.taskId) ?? []
    existing.push(comment)
    this.comments.set(comment.taskId, existing)
  }

  async getComments(taskId: TaskId): Promise<readonly TaskComment[]> {
    return this.comments.get(taskId) ?? []
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('KanbanService', () => {
  let repo: InMemoryTaskRepo
  let service: KanbanService
  let idCounter: number
  const projectId = createProjectId('proj-1')

  beforeEach(() => {
    repo = new InMemoryTaskRepo()
    idCounter = 0
    service = new KanbanService(repo, () => `id-${++idCounter}`)
  })

  test('createTask returns a new task with defaults', async () => {
    const task = await service.createTask({ projectId, title: 'Build feature' })

    expect(task.id).toBe('id-1')
    expect(task.title).toBe('Build feature')
    expect(task.status).toBe('todo')
    expect(task.priority).toBe('medium')
    expect(task.description).toBe('')
    expect(task.comments).toHaveLength(0)
    expect(task.projectId).toBe(projectId)
  })

  test('createTask with custom priority and assignee', async () => {
    const task = await service.createTask({
      projectId,
      title: 'Fix bug',
      priority: 'critical',
      assignee: 'agent',
    })

    expect(task.priority).toBe('critical')
    expect(task.assignee).toBe('agent')
  })

  test('createTask persists to repository', async () => {
    await service.createTask({ projectId, title: 'Persisted' })

    const found = await service.getTask(createTaskId('id-1'))
    expect(found).toBeDefined()
    expect(found!.title).toBe('Persisted')
  })

  test('getTask returns undefined for unknown ID', async () => {
    const found = await service.getTask(createTaskId('nonexistent'))
    expect(found).toBeUndefined()
  })

  test('updateTask changes fields', async () => {
    await service.createTask({ projectId, title: 'Original' })

    const updated = await service.updateTask(createTaskId('id-1'), {
      title: 'Updated',
      status: 'in-progress',
    })

    expect(updated).toBeDefined()
    expect(updated!.title).toBe('Updated')
    expect(updated!.status).toBe('in-progress')
  })

  test('updateTask returns undefined for unknown ID', async () => {
    const result = await service.updateTask(createTaskId('nope'), { title: 'X' })
    expect(result).toBeUndefined()
  })

  test('moveTask changes status only', async () => {
    await service.createTask({ projectId, title: 'MovableTask' })

    const moved = await service.moveTask(createTaskId('id-1'), 'review')
    expect(moved).toBeDefined()
    expect(moved!.status).toBe('review')
    expect(moved!.title).toBe('MovableTask')
  })

  test('deleteTask removes the task', async () => {
    await service.createTask({ projectId, title: 'Deletable' })

    const deleted = await service.deleteTask(createTaskId('id-1'))
    expect(deleted).toBe(true)

    const found = await service.getTask(createTaskId('id-1'))
    expect(found).toBeUndefined()
  })

  test('deleteTask returns false for unknown ID', async () => {
    const deleted = await service.deleteTask(createTaskId('nope'))
    expect(deleted).toBe(false)
  })

  test('listTasks returns all tasks for project', async () => {
    await service.createTask({ projectId, title: 'Task 1' })
    await service.createTask({ projectId, title: 'Task 2' })
    await service.createTask({
      projectId: createProjectId('other'),
      title: 'Other project',
    })

    const tasks = await service.listTasks(projectId)
    expect(tasks).toHaveLength(2)
  })

  test('listTasks with status filter', async () => {
    await service.createTask({ projectId, title: 'A' })
    const t2 = await service.createTask({ projectId, title: 'B' })
    await service.moveTask(t2.id, 'done')

    const tasks = await service.listTasks(projectId, { status: 'done' })
    expect(tasks).toHaveLength(1)
    expect(tasks[0]!.title).toBe('B')
  })

  test('getBoardState groups tasks by column', async () => {
    await service.createTask({ projectId, title: 'Todo 1' })
    await service.createTask({ projectId, title: 'Todo 2' })
    const t3 = await service.createTask({ projectId, title: 'In progress' })
    await service.moveTask(t3.id, 'in-progress')
    const t4 = await service.createTask({ projectId, title: 'Done' })
    await service.moveTask(t4.id, 'done')

    const board = await service.getBoardState(projectId)

    expect(board.taskCount).toBe(4)
    expect(board.columns['todo']).toHaveLength(2)
    expect(board.columns['in-progress']).toHaveLength(1)
    expect(board.columns['review']).toHaveLength(0)
    expect(board.columns['done']).toHaveLength(1)
  })

  test('addComment creates a comment', async () => {
    const task = await service.createTask({ projectId, title: 'Commentable' })

    const comment = await service.addComment({
      taskId: task.id,
      author: 'agent',
      content: 'Started working',
      emoji: '🏗️',
    })

    expect(comment.id).toBe('id-2')
    expect(comment.content).toBe('Started working')
    expect(comment.emoji).toBe('🏗️')
    expect(comment.author).toBe('agent')
  })

  test('getComments returns all comments for task', async () => {
    const task = await service.createTask({ projectId, title: 'Task' })

    await service.addComment({ taskId: task.id, author: 'agent', content: 'First' })
    await service.addComment({ taskId: task.id, author: 'agent', content: 'Second' })

    const comments = await service.getComments(task.id)
    expect(comments).toHaveLength(2)
    expect(comments[0]!.content).toBe('First')
    expect(comments[1]!.content).toBe('Second')
  })

  test('getComments returns empty array for unknown task', async () => {
    const comments = await service.getComments(createTaskId('nope'))
    expect(comments).toHaveLength(0)
  })

  test('comment without emoji omits field', async () => {
    const task = await service.createTask({ projectId, title: 'Task' })

    const comment = await service.addComment({
      taskId: task.id,
      author: 'agent',
      content: 'No emoji',
    })

    expect(comment.emoji).toBeUndefined()
  })

  test('createTask with description', async () => {
    const task = await service.createTask({
      projectId,
      title: 'Described',
      description: 'A detailed description',
    })

    expect(task.description).toBe('A detailed description')
  })
})
