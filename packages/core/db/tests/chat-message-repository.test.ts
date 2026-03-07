import { describe, expect, test, beforeEach } from 'bun:test'
import { createInMemoryDb, ChatMessageRepository } from '../src/index.js'
import type { ImperiumDb } from '../src/index.js'
import type { ChatMessage } from '@imperium/shared-types'
import {
  createMessageId,
  createProjectId,
  createTimestamp,
} from '@imperium/shared-types'

describe('ChatMessageRepository', () => {
  let db: ImperiumDb
  let repo: ChatMessageRepository

  const projectId = createProjectId('test-project')

  function makeMessage(overrides: Partial<ChatMessage> & { id: ChatMessage['id'] }): ChatMessage {
    return {
      role: 'user',
      content: 'Hello',
      timestamp: createTimestamp(new Date('2025-01-01T00:00:00Z')),
      projectId,
      ...overrides,
    }
  }

  beforeEach(() => {
    db = createInMemoryDb()
    repo = new ChatMessageRepository(db)
  })

  test('insert and getByProject', async () => {
    const msg = makeMessage({
      id: createMessageId('msg-1'),
      content: 'Hello world',
    })
    await repo.insert(msg)

    const results = await repo.getByProject(projectId)
    expect(results).toHaveLength(1)
    expect(results[0]!.id).toBe('msg-1')
    expect(results[0]!.content).toBe('Hello world')
    expect(results[0]!.role).toBe('user')
  })

  test('getByProject returns empty for unknown project', async () => {
    const results = await repo.getByProject(createProjectId('unknown'))
    expect(results).toHaveLength(0)
  })

  test('getWindow returns the most recent messages in chronological order', async () => {
    for (let i = 0; i < 5; i++) {
      await repo.insert(
        makeMessage({
          id: createMessageId(`msg-${i}`),
          content: `Message ${i}`,
          timestamp: createTimestamp(new Date(`2025-01-01T0${i}:00:00Z`)),
        }),
      )
    }

    const window = await repo.getWindow(projectId, 3)
    expect(window).toHaveLength(3)
    // Should be the last 3 in chronological order
    expect(window[0]!.id).toBe('msg-2')
    expect(window[1]!.id).toBe('msg-3')
    expect(window[2]!.id).toBe('msg-4')
  })

  test('countByProject returns correct count', async () => {
    await repo.insert(makeMessage({ id: createMessageId('msg-1') }))
    await repo.insert(makeMessage({ id: createMessageId('msg-2') }))

    expect(await repo.countByProject(projectId)).toBe(2)
    expect(await repo.countByProject(createProjectId('other'))).toBe(0)
  })

  test('insert preserves optional fields', async () => {
    const msg = makeMessage({
      id: createMessageId('msg-opt'),
      model: 'claude-3.5-sonnet',
      tokenCount: 150,
      costUsd: 0.002,
    })
    await repo.insert(msg)

    const results = await repo.getByProject(projectId)
    expect(results[0]!.model).toBe('claude-3.5-sonnet')
    expect(results[0]!.tokenCount).toBe(150)
    expect(results[0]!.costUsd).toBe(0.002)
  })

  test('insert handles undefined optional fields', async () => {
    const msg = makeMessage({ id: createMessageId('msg-noopt') })
    await repo.insert(msg)

    const results = await repo.getByProject(projectId)
    expect(results[0]!.model).toBeUndefined()
    expect(results[0]!.tokenCount).toBeUndefined()
    expect(results[0]!.costUsd).toBeUndefined()
  })
})
