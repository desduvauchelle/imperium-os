import { describe, expect, test } from 'bun:test'
import { CostTracker, DEFAULT_COST_CONFIG } from '../src/index.js'
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

  test('record adds an entry', () => {
    const tracker = new CostTracker()
    tracker.record(mockEntry)
    expect(tracker.getEntries()).toHaveLength(1)
    expect(tracker.getEntries()[0]).toEqual(mockEntry)
  })

  test('getSummary calculates totals', () => {
    const tracker = new CostTracker()
    tracker.record(mockEntry)
    tracker.record({
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

  test('getSummary groups by model', () => {
    const tracker = new CostTracker()
    tracker.record(mockEntry)
    tracker.record({
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

  test('clear removes all entries', () => {
    const tracker = new CostTracker()
    tracker.record(mockEntry)
    tracker.record(mockEntry)
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
})
