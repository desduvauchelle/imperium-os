/**
 * Imperium Desktop - Main Process Entry
 *
 * This is the Electron main process. It creates the BrowserWindow,
 * sets up IPC handlers, and loads the renderer.
 *
 * Phase 1: Stub — not wired to real Electron APIs yet.
 * The renderer is built with Vite and served during development.
 */

import type { ElectronApi } from './ipc.js'

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
