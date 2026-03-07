import { describe, expect, test, beforeEach } from 'bun:test'
import { createInMemoryDb, TaskRepository } from '../src/index.js'
import type { ImperiumDb } from '../src/index.js'
import type { KanbanTask, TaskComment, TaskPatch, TaskFilter } from '@imperium/shared-types'
import {
  createTaskId,
  createProjectId,
  createTimestamp,
} from '@imperium/shared-types'

describe('TaskRepository', () => {
  let db: ImperiumDb
  let repo: TaskRepository

  const projectId = createProjectId('test-project')

  function makeTask(overrides: Partial<KanbanTask> & { id: KanbanTask['id'] }): KanbanTask {
    return {
      projectId,
      title: 'Test task',
      description: 'A test task',
      status: 'todo',
      priority: 'medium',
      comments: [],
      createdAt: createTimestamp(new Date('2025-01-01T00:00:00Z')),
      updatedAt: createTimestamp(new Date('2025-01-01T00:00:00Z')),
      ...overrides,
    }
  }

  beforeEach(() => {
    db = createInMemoryDb()
    repo = new TaskRepository(db)
  })

  test('insert and getById', async () => {
    const task = makeTask({ id: createTaskId('task-1'), title: 'First task' })
    await repo.insert(task)

    const found = await repo.getById(createTaskId('task-1'))
    expect(found).toBeDefined()
    expect(found!.title).toBe('First task')
    expect(found!.status).toBe('todo')
    expect(found!.priority).toBe('medium')
    expect(found!.comments).toHaveLength(0)
  })

  test('getById returns undefined for unknown id', async () => {
    const found = await repo.getById(createTaskId('unknown'))
    expect(found).toBeUndefined()
  })

  test('getByProject returns all tasks in project', async () => {
    await repo.insert(makeTask({ id: createTaskId('t1'), title: 'Task 1' }))
    await repo.insert(makeTask({ id: createTaskId('t2'), title: 'Task 2' }))
    await repo.insert(
      makeTask({
        id: createTaskId('t3'),
        title: 'Other',
        projectId: createProjectId('other'),
      }),
    )

    const results = await repo.getByProject(projectId)
    expect(results).toHaveLength(2)
  })

  test('getByProject filters by status', async () => {
    await repo.insert(makeTask({ id: createTaskId('t1'), status: 'todo' }))
    await repo.insert(makeTask({ id: createTaskId('t2'), status: 'done' }))

    const filter: TaskFilter = { status: 'done' }
    const results = await repo.getByProject(projectId, filter)
    expect(results).toHaveLength(1)
    expect(results[0]!.status).toBe('done')
  })

  test('getByProject filters by priority', async () => {
    await repo.insert(makeTask({ id: createTaskId('t1'), priority: 'low' }))
    await repo.insert(makeTask({ id: createTaskId('t2'), priority: 'critical' }))

    const filter: TaskFilter = { priority: 'critical' }
    const results = await repo.getByProject(projectId, filter)
    expect(results).toHaveLength(1)
    expect(results[0]!.priority).toBe('critical')
  })

  test('getByProject filters by search', async () => {
    await repo.insert(makeTask({ id: createTaskId('t1'), title: 'Build feature' }))
    await repo.insert(makeTask({ id: createTaskId('t2'), title: 'Fix bug' }))

    const filter: TaskFilter = { search: 'feature' }
    const results = await repo.getByProject(projectId, filter)
    expect(results).toHaveLength(1)
    expect(results[0]!.title).toBe('Build feature')
  })

  test('update changes fields', async () => {
    await repo.insert(makeTask({ id: createTaskId('t1'), title: 'Original', status: 'todo' }))

    const patch: TaskPatch = { title: 'Updated', status: 'in-progress' }
    await repo.update(createTaskId('t1'), patch)

    const found = await repo.getById(createTaskId('t1'))
    expect(found!.title).toBe('Updated')
    expect(found!.status).toBe('in-progress')
  })

  test('update with empty patch does nothing', async () => {
    await repo.insert(makeTask({ id: createTaskId('t1'), title: 'Original' }))

    await repo.update(createTaskId('t1'), {})

    const found = await repo.getById(createTaskId('t1'))
    expect(found!.title).toBe('Original')
  })

  test('delete removes task and comments', async () => {
    const taskId = createTaskId('t1')
    await repo.insert(makeTask({ id: taskId }))
    await repo.insertComment({
      id: 'c1',
      taskId,
      author: 'agent',
      content: 'Started',
      createdAt: createTimestamp(),
    })

    await repo.delete(taskId)

    const found = await repo.getById(taskId)
    expect(found).toBeUndefined()

    const comments = await repo.getComments(taskId)
    expect(comments).toHaveLength(0)
  })

  test('insertComment and getComments', async () => {
    const taskId = createTaskId('t1')
    await repo.insert(makeTask({ id: taskId }))

    await repo.insertComment({
      id: 'c1',
      taskId,
      author: 'agent',
      content: 'Working on it',
      emoji: '🏗️',
      createdAt: createTimestamp(new Date('2025-01-01T01:00:00Z')),
    })
    await repo.insertComment({
      id: 'c2',
      taskId,
      author: 'agent',
      content: 'Done',
      emoji: '✅',
      createdAt: createTimestamp(new Date('2025-01-01T02:00:00Z')),
    })

    const comments = await repo.getComments(taskId)
    expect(comments).toHaveLength(2)
    expect(comments[0]!.content).toBe('Working on it')
    expect(comments[0]!.emoji).toBe('🏗️')
    expect(comments[1]!.content).toBe('Done')
  })

  test('countByProject', async () => {
    await repo.insert(makeTask({ id: createTaskId('t1') }))
    await repo.insert(makeTask({ id: createTaskId('t2') }))

    const count = await repo.countByProject(projectId)
    expect(count).toBe(2)
  })

  test('insert task with comments', async () => {
    const taskId = createTaskId('t1')
    const task = makeTask({
      id: taskId,
      comments: [
        {
          id: 'c1',
          taskId,
          author: 'agent',
          content: 'Initial comment',
          createdAt: createTimestamp(),
        },
      ],
    })
    await repo.insert(task)

    const found = await repo.getById(taskId)
    expect(found!.comments).toHaveLength(1)
    expect(found!.comments[0]!.content).toBe('Initial comment')
  })
})
