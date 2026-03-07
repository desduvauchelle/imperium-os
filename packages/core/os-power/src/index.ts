import type { Result } from '@imperium/shared-types'

// ============================================================================
// Power Manager - macOS Sleep Prevention & System Persistence
// ============================================================================

export type PowerMode = 'normal' | 'caffeinated'

export interface PowerManagerConfig {
  readonly autoRestart: boolean
  readonly caffeinateCommand: string
}

export const DEFAULT_POWER_CONFIG: PowerManagerConfig = {
  autoRestart: false,
  caffeinateCommand: 'caffeinate',
}

export class PowerManager {
  readonly config: PowerManagerConfig
  private _mode: PowerMode = 'normal'

  constructor(config: Partial<PowerManagerConfig> = {}) {
    this.config = { ...DEFAULT_POWER_CONFIG, ...config }
  }

  get mode(): PowerMode {
    return this._mode
  }

  /**
   * Prevent the Mac from sleeping.
   * @throws {Error} Not implemented in Phase 1
   */
  async preventSleep(): Promise<Result<void>> {
    throw new Error('PowerManager.preventSleep: Not implemented (Phase 1 stub)')
  }

  /**
   * Allow the Mac to sleep normally.
   * @throws {Error} Not implemented in Phase 1
   */
  async allowSleep(): Promise<Result<void>> {
    throw new Error('PowerManager.allowSleep: Not implemented (Phase 1 stub)')
  }

  /**
   * Check if caffeinate is available on this system.
   * @throws {Error} Not implemented in Phase 1
   */
  async isAvailable(): Promise<boolean> {
    throw new Error('PowerManager.isAvailable: Not implemented (Phase 1 stub)')
  }
}
