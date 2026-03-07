import { describe, expect, test, beforeEach } from 'bun:test'
import { createInMemoryDb, MemoryBlockRepository } from '../src/index.js'
import type { ImperiumDb } from '../src/index.js'
import type { MemoryBlock } from '@imperium/shared-types'
import {
  createMemoryBlockId,
  createMessageId,
  createProjectId,
  createTimestamp,
} from '@imperium/shared-types'

describe('MemoryBlockRepository', () => {
  let db: ImperiumDb
  let repo: MemoryBlockRepository

  const projectId = createProjectId('test-project')

  function makeBlock(overrides: Partial<MemoryBlock> & { id: MemoryBlock['id'] }): MemoryBlock {
    return {
      projectId,
      summary: 'Test summary',
      messageRange: {
        from: createMessageId('msg-1'),
        to: createMessageId('msg-10'),
      },
      createdAt: createTimestamp(new Date('2025-01-01T00:00:00Z')),
      tokenCount: 500,
      ...overrides,
    }
  }

  beforeEach(() => {
    db = createInMemoryDb()
    repo = new MemoryBlockRepository(db)
  })

  test('insert and getByProject', async () => {
    const block = makeBlock({ id: createMemoryBlockId('block-1') })
    await repo.insert(block)

    const results = await repo.getByProject(projectId)
    expect(results).toHaveLength(1)
    expect(results[0]!.id).toBe('block-1')
    expect(results[0]!.summary).toBe('Test summary')
    expect(results[0]!.tokenCount).toBe(500)
  })

  test('getByProject returns empty for unknown project', async () => {
    const results = await repo.getByProject(createProjectId('unknown'))
    expect(results).toHaveLength(0)
  })

  test('getRecent returns limited results in chronological order', async () => {
    for (let i = 0; i < 5; i++) {
      await repo.insert(
        makeBlock({
          id: createMemoryBlockId(`block-${i}`),
          createdAt: createTimestamp(new Date(`2025-01-0${i + 1}T00:00:00Z`)),
        }),
      )
    }

    const recent = await repo.getRecent(projectId, 3)
    expect(recent).toHaveLength(3)
    // Most recent 3 in chronological order
    expect(recent[0]!.id).toBe('block-2')
    expect(recent[1]!.id).toBe('block-3')
    expect(recent[2]!.id).toBe('block-4')
  })

  test('countByProject returns correct count', async () => {
    await repo.insert(makeBlock({ id: createMemoryBlockId('block-1') }))
    await repo.insert(makeBlock({ id: createMemoryBlockId('block-2') }))

    expect(await repo.countByProject(projectId)).toBe(2)
    expect(await repo.countByProject(createProjectId('other'))).toBe(0)
  })

  test('preserves messageRange from/to IDs', async () => {
    const block = makeBlock({
      id: createMemoryBlockId('block-range'),
      messageRange: {
        from: createMessageId('first'),
        to: createMessageId('last'),
      },
    })
    await repo.insert(block)

    const results = await repo.getByProject(projectId)
    expect(results[0]!.messageRange.from).toBe('first')
    expect(results[0]!.messageRange.to).toBe('last')
  })
})
