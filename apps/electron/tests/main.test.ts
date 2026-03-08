import { describe, expect, it, vi } from 'vitest'
import { createMainWindow, DEFAULT_MAIN_CONFIG, createSatelliteManager } from '../src/main/index.js'
import type { ServeFn, HandlerMap } from '@imperium/core-notifications'

// ============================================================================
// Mock ServeFn — avoids binding real ports in jsdom tests
// ============================================================================

function makeMockServe(): ServeFn {
  return vi.fn().mockReturnValue({ stop: vi.fn() })
}

function makeHandlers(): HandlerMap {
  return new Map([
    ['kanban:get-board', async () => ({ columns: [] })],
    ['tailscale:status', async () => ({ state: 'Running', self: null, peers: [] })],
  ]) as HandlerMap
}

// ============================================================================
// createMainWindow tests
// ============================================================================

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

// ============================================================================
// createSatelliteManager tests
// ============================================================================

describe('createSatelliteManager', () => {
  it('returns a running server after creation', () => {
    const serve = makeMockServe()
    const manager = createSatelliteManager(makeHandlers(), serve)
    expect(manager.server.isRunning).toBe(true)
    manager.server.stop()
  })

  it('getToken() returns a 32-char hex token', () => {
    const serve = makeMockServe()
    const manager = createSatelliteManager(makeHandlers(), serve)
    expect(manager.getToken()).toMatch(/^[0-9a-f]{32}$/)
    manager.server.stop()
  })

  it('phase6Deps.getSatelliteConfig() returns correct shape', () => {
    const serve = makeMockServe()
    const manager = createSatelliteManager(makeHandlers(), serve)
    const cfg = manager.phase6Deps.getSatelliteConfig()
    expect(cfg.port).toBe(9100)
    expect(cfg.token).toBe(manager.getToken())
    expect(cfg.isRunning).toBe(true)
    expect(typeof cfg.connectedClients).toBe('number')
    manager.server.stop()
  })

  it('phase6Deps.regenerateToken() returns a new token', () => {
    const serve = makeMockServe()
    const manager = createSatelliteManager(makeHandlers(), serve)
    const oldToken = manager.getToken()
    const { newToken } = manager.phase6Deps.regenerateToken()
    expect(newToken).toMatch(/^[0-9a-f]{32}$/)
    expect(newToken).not.toBe(oldToken)
    expect(manager.getToken()).toBe(newToken)
    manager.server.stop()
  })

  it('server is still running after token rotation', () => {
    const serve = makeMockServe()
    const manager = createSatelliteManager(makeHandlers(), serve)
    manager.phase6Deps.regenerateToken()
    expect(manager.server.isRunning).toBe(true)
    manager.server.stop()
  })
})
