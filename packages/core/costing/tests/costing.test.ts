import { describe, expect, test } from 'bun:test'
import { CostTracker, DEFAULT_COST_CONFIG } from '../src/index.js'
import type { CostPersistence } from '../src/index.js'
import { createTimestamp } from '@imperium/shared-types'
import type { CostEntry } from '@imperium/shared-types'

describe('CostTracker', () => {
	const mockEntry: CostEntry = {
		model: 'claude-3.5-sonnet',
		provider: 'anthropic',
		inputTokens: 1000,
		outputTokens: 500,
		costUsd: 0.002,
		timestamp: createTimestamp(new Date('2026-01-15T12:00:00Z')),
	}

	test('instantiates with default config', () => {
		const tracker = new CostTracker()
		expect(tracker.config).toEqual(DEFAULT_COST_CONFIG)
	})

	test('starts with no entries', () => {
		const tracker = new CostTracker()
		expect(tracker.getEntries()).toEqual([])
	})

	test('record adds an entry', async () => {
		const tracker = new CostTracker()
		await tracker.record(mockEntry)
		expect(tracker.getEntries()).toHaveLength(1)
		expect(tracker.getEntries()[0]).toEqual(mockEntry)
	})

	test('getSummary calculates totals', async () => {
		const tracker = new CostTracker()
		await tracker.record(mockEntry)
		await tracker.record({
			...mockEntry,
			inputTokens: 2000,
			outputTokens: 1000,
			costUsd: 0.004,
		})

		const summary = tracker.getSummary()
		expect(summary.totalCostUsd).toBeCloseTo(0.006)
		expect(summary.totalInputTokens).toBe(3000)
		expect(summary.totalOutputTokens).toBe(1500)
	})

	test('getSummary groups by model', async () => {
		const tracker = new CostTracker()
		await tracker.record(mockEntry)
		await tracker.record({
			...mockEntry,
			model: 'gpt-4',
			provider: 'openai',
			costUsd: 0.01,
		})

		const summary = tracker.getSummary()
		const models = Object.keys(summary.entriesByModel)
		expect(models).toHaveLength(2)
		expect(models).toContain('claude-3.5-sonnet')
		expect(models).toContain('gpt-4')
		expect(summary.entriesByModel['claude-3.5-sonnet']!.callCount).toBe(1)
	})

	test('clear removes all entries', async () => {
		const tracker = new CostTracker()
		await tracker.record(mockEntry)
		await tracker.record(mockEntry)
		expect(tracker.getEntries()).toHaveLength(2)
		tracker.clear()
		expect(tracker.getEntries()).toHaveLength(0)
	})

	test('getSummary with empty tracker returns zeros', () => {
		const tracker = new CostTracker()
		const summary = tracker.getSummary()
		expect(summary.totalCostUsd).toBe(0)
		expect(summary.totalInputTokens).toBe(0)
		expect(summary.totalOutputTokens).toBe(0)
		expect(Object.keys(summary.entriesByModel)).toHaveLength(0)
	})

	// Phase 5 — persistence tests

	test('record persists to database when persistence provided', async () => {
		const inserted: Array<{ id: string; entry: CostEntry }> = []
		const mockPersistence: CostPersistence = {
			insert: async (id, entry) => { inserted.push({ id, entry }) },
			getAll: async () => [],
			count: async () => 0,
		}

		const tracker = new CostTracker({}, mockPersistence)
		await tracker.record(mockEntry)

		expect(inserted).toHaveLength(1)
		expect(inserted[0]!.entry.model).toBe('claude-3.5-sonnet')
		expect(inserted[0]!.id).toBeDefined()
	})

	test('getPersistedEntries delegates to persistence', async () => {
		const mockPersistence: CostPersistence = {
			insert: async () => { },
			getAll: async () => [mockEntry],
			count: async () => 1,
		}

		const tracker = new CostTracker({}, mockPersistence)
		const entries = await tracker.getPersistedEntries()
		expect(entries).toHaveLength(1)
		expect(entries[0]!.model).toBe('claude-3.5-sonnet')
	})

	test('getPersistedEntries falls back to in-memory without persistence', async () => {
		const tracker = new CostTracker()
		await tracker.record(mockEntry)

		const entries = await tracker.getPersistedEntries()
		expect(entries).toHaveLength(1)
	})

	test('getPersistedCount delegates to persistence', async () => {
		const mockPersistence: CostPersistence = {
			insert: async () => { },
			getAll: async () => [],
			count: async () => 42,
		}

		const tracker = new CostTracker({}, mockPersistence)
		expect(await tracker.getPersistedCount()).toBe(42)
	})

	test('getPersistedCount falls back to in-memory length', async () => {
		const tracker = new CostTracker()
		await tracker.record(mockEntry)
		expect(await tracker.getPersistedCount()).toBe(1)
	})
})
