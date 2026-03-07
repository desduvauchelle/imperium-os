import { describe, expect, test } from 'bun:test'
import { Engine, DEFAULT_ENGINE_CONFIG } from '../src/index.js'

describe('Engine', () => {
  test('instantiates with default config', () => {
    const engine = new Engine()
    expect(engine.config).toEqual(DEFAULT_ENGINE_CONFIG)
  })

  test('accepts partial config override', () => {
    const engine = new Engine({ maxRetries: 5, timeoutMs: 60_000 })
    expect(engine.config.maxRetries).toBe(5)
    expect(engine.config.timeoutMs).toBe(60_000)
    expect(engine.config.defaultModel).toBe(DEFAULT_ENGINE_CONFIG.defaultModel)
  })

  test('executeChain throws not-implemented', async () => {
    const engine = new Engine()
    await expect(engine.executeChain({} as never, {} as never)).rejects.toThrow('Not implemented')
  })

  test('stopChain throws not-implemented', async () => {
    const engine = new Engine()
    await expect(engine.stopChain('agent-1')).rejects.toThrow('Not implemented')
  })
})
