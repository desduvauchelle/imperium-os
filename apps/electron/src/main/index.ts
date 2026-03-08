/**
 * Imperium Desktop - Main Process Entry
 *
 * This is the Electron main process. It creates the BrowserWindow,
 * sets up IPC handlers, and loads the renderer.
 *
 * Phase 1: Stub — not wired to real Electron APIs yet.
 * Phase 6: SatelliteServer wired — REST + WebSocket gateway for web/mobile.
 *
 * The renderer is built with Vite and served during development.
 */

import type { ElectronApi } from './ipc.js'
import { SatelliteServer, defaultServeFn, type HandlerMap, type ServeFn } from '@imperium/core-notifications'
import type { IpcChannel, SatelliteConfigResponse, SatelliteRegenerateTokenResponse } from '@imperium/shared-types'

export interface MainProcessConfig {
  readonly devServerUrl: string
  readonly width: number
  readonly height: number
}

export const DEFAULT_MAIN_CONFIG: MainProcessConfig = {
  devServerUrl: 'http://localhost:5173',
  width: 1200,
  height: 800,
}

// ============================================================================
// Phase 6 — Satellite server (REST + WS gateway)
// ============================================================================

const SATELLITE_PORT = 9100

/** Generate a random 32-char hex token. Works without Node crypto module. */
function generateToken(): string {
  const bytes = new Uint8Array(16)
  // Use globalThis.crypto (available in Bun/Node 19+)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export interface SatelliteManager {
  readonly server: SatelliteServer
  /** Current token (shown once in renderer; regenerate to rotate). */
  readonly getToken: () => string
  /** Generate + store a new token, returns new value. */
  readonly rotateToken: () => string
  /** Convenience Phase 6 deps object for createPhase6Handlers. */
  readonly phase6Deps: {
    getSatelliteConfig: () => SatelliteConfigResponse
    regenerateToken: () => SatelliteRegenerateTokenResponse
  }
}

/**
 * Create and start the SatelliteServer with the given handler map.
 * Call on app-ready; call `server.stop()` on app quit.
 *
 * @param handlers - Map of channel → handler function
 * @param serveFn  - Injectable server factory (defaults to Bun.serve wrapper).
 *                   Override in tests to avoid binding real ports.
 */
export function createSatelliteManager(handlers: HandlerMap, serveFn: ServeFn = defaultServeFn): SatelliteManager {
  let currentToken = generateToken()
  let currentServer = new SatelliteServer(
    { port: SATELLITE_PORT, token: currentToken, allowedChannels: Array.from(handlers.keys()) as IpcChannel[] },
    serveFn,
  )

  const getToken = () => currentToken

  const rotateToken = (): string => {
    // Stop the old server and start a new one with a fresh token
    if (currentServer.isRunning) {
      currentServer.stop()
    }
    currentToken = generateToken()
    currentServer = new SatelliteServer(
      { port: SATELLITE_PORT, token: currentToken, allowedChannels: Array.from(handlers.keys()) as IpcChannel[] },
      serveFn,
    )
    currentServer.start(handlers)
    return currentToken
  }

  const phase6Deps = {
    getSatelliteConfig: (): SatelliteConfigResponse => ({
      port: SATELLITE_PORT,
      token: currentToken,
      isRunning: currentServer.isRunning,
      connectedClients: currentServer.clientCount,
    }),
    regenerateToken: (): SatelliteRegenerateTokenResponse => {
      const newToken = rotateToken()
      return { newToken }
    },
  }

  // Start immediately with the provided handler map
  currentServer.start(handlers)

  // Expose a stable `server` getter so callers can push events at any time
  const manager: SatelliteManager = {
    get server() { return currentServer },
    getToken,
    rotateToken,
    phase6Deps,
  }

  return manager
}

// ============================================================================
// Window creation
// ============================================================================

/**
 * Create and configure the main Electron window.
 * Phase 1 stub — does not actually call Electron APIs.
 */
export function createMainWindow(config: MainProcessConfig = DEFAULT_MAIN_CONFIG): MainProcessConfig {
  // In Phase 2+, this will:
  // 1. Create BrowserWindow with config dimensions
  // 2. Load devServerUrl in dev, or file:// in production
  // 3. Register IPC handlers
  // 4. Set up auto-updater
  return config
}
