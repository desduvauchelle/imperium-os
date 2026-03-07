import { describe, expect, it } from 'vitest'
import { createMainWindow, DEFAULT_MAIN_CONFIG } from '../src/main/index.js'

describe('Main Process', () => {
  it('createMainWindow returns config', () => {
    const config = createMainWindow()
    expect(config).toEqual(DEFAULT_MAIN_CONFIG)
  })

  it('accepts custom config', () => {
    const config = createMainWindow({ ...DEFAULT_MAIN_CONFIG, width: 1600 })
    expect(config.width).toBe(1600)
  })

  it('DEFAULT_MAIN_CONFIG has reasonable defaults', () => {
    expect(DEFAULT_MAIN_CONFIG.width).toBeGreaterThan(0)
    expect(DEFAULT_MAIN_CONFIG.height).toBeGreaterThan(0)
    expect(DEFAULT_MAIN_CONFIG.devServerUrl).toContain('localhost')
  })
})
