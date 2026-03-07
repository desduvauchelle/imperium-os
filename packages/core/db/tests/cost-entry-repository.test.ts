import { describe, expect, test, beforeEach } from 'bun:test'
import { createInMemoryDb, CostEntryRepository } from '../src/index.js'
import type { ImperiumDb } from '../src/index.js'
import type { CostEntry } from '@imperium/shared-types'
import { createTimestamp } from '@imperium/shared-types'

describe('CostEntryRepository', () => {
  let db: ImperiumDb
  let repo: CostEntryRepository

  function makeEntry(overrides: Partial<CostEntry> = {}): CostEntry {
    return {
      model: 'claude-3.5-sonnet',
      provider: 'anthropic',
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0.002,
      timestamp: createTimestamp(new Date('2025-01-01T00:00:00Z')),
      ...overrides,
    }
  }

  beforeEach(() => {
    db = createInMemoryDb()
    repo = new CostEntryRepository(db)
  })

  test('insert and getAll', async () => {
    await repo.insert('e1', makeEntry({ model: 'gpt-4', provider: 'openai' }))

    const entries = await repo.getAll()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.model).toBe('gpt-4')
    expect(entries[0]!.provider).toBe('openai')
    expect(entries[0]!.costUsd).toBe(0.002)
  })

  test('getAll returns newest first', async () => {
    await repo.insert(
      'e1',
      makeEntry({ timestamp: createTimestamp(new Date('2025-01-01T01:00:00Z')) }),
    )
    await repo.insert(
      'e2',
      makeEntry({ timestamp: createTimestamp(new Date('2025-01-01T03:00:00Z')) }),
    )
    await repo.insert(
      'e3',
      makeEntry({ timestamp: createTimestamp(new Date('2025-01-01T02:00:00Z')) }),
    )

    const entries = await repo.getAll()
    expect(entries).toHaveLength(3)
    // Newest first
    expect(entries[0]!.timestamp).toContain('03:00:00')
    expect(entries[1]!.timestamp).toContain('02:00:00')
    expect(entries[2]!.timestamp).toContain('01:00:00')
  })

  test('getAll with limit', async () => {
    await repo.insert('e1', makeEntry())
    await repo.insert('e2', makeEntry())
    await repo.insert('e3', makeEntry())

    const entries = await repo.getAll(2)
    expect(entries).toHaveLength(2)
  })

  test('count', async () => {
    expect(await repo.count()).toBe(0)

    await repo.insert('e1', makeEntry())
    await repo.insert('e2', makeEntry())

    expect(await repo.count()).toBe(2)
  })

  test('preserves all fields', async () => {
    const entry = makeEntry({
      model: 'gemini-pro',
      provider: 'google',
      inputTokens: 500,
      outputTokens: 200,
      costUsd: 0.015,
    })
    await repo.insert('e1', entry)

    const [result] = await repo.getAll()
    expect(result!.model).toBe('gemini-pro')
    expect(result!.provider).toBe('google')
    expect(result!.inputTokens).toBe(500)
    expect(result!.outputTokens).toBe(200)
    expect(result!.costUsd).toBe(0.015)
  })
})
