import type { Result } from '@imperium/shared-types'
import { ok, err } from '@imperium/shared-types'

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

/** Injectable spawn function for testing */
export type SpawnFn = (
  cmd: string[],
) => Promise<{ exitCode: number; stdout: string; stderr: string }>

/** Default spawn using Bun.spawn */
async function defaultSpawn(cmd: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  const exitCode = await proc.exited
  return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() }
}

/** Injectable persistent spawn (returns a kill handle) */
export type PersistentSpawnFn = (
  cmd: string[],
) => { kill: () => void; pid: number }

/** Default persistent spawn using Bun.spawn */
function defaultPersistentSpawn(cmd: string[]): { kill: () => void; pid: number } {
  const proc = Bun.spawn(cmd, { stdout: 'ignore', stderr: 'ignore' })
  return {
    kill: () => proc.kill(),
    pid: proc.pid,
  }
}

export class PowerManager {
  readonly config: PowerManagerConfig
  private _mode: PowerMode = 'normal'
  private _processHandle: { kill: () => void; pid: number } | null = null
  private readonly spawn: SpawnFn
  private readonly persistentSpawn: PersistentSpawnFn

  constructor(
    config: Partial<PowerManagerConfig> = {},
    spawn?: SpawnFn,
    persistentSpawn?: PersistentSpawnFn,
  ) {
    this.config = { ...DEFAULT_POWER_CONFIG, ...config }
    this.spawn = spawn ?? defaultSpawn
    this.persistentSpawn = persistentSpawn ?? defaultPersistentSpawn
  }

  get mode(): PowerMode {
    return this._mode
  }

  get pid(): number | null {
    return this._processHandle?.pid ?? null
  }

  /**
   * Check if caffeinate is available on this system.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.spawn(['which', this.config.caffeinateCommand])
      return result.exitCode === 0
    } catch {
      return false
    }
  }

  /**
   * Prevent the Mac from sleeping.
   * Spawns `caffeinate -d -i -m -s` as a persistent background process.
   * -d: prevent display sleep
   * -i: prevent idle sleep
   * -m: prevent disk sleep
   * -s: prevent system sleep when on AC power
   */
  async preventSleep(): Promise<Result<void>> {
    if (this._mode === 'caffeinated') {
      return ok(undefined)
    }

    const available = await this.isAvailable()
    if (!available) {
      return err(new Error(`${this.config.caffeinateCommand} is not available on this system`))
    }

    try {
      this._processHandle = this.persistentSpawn([
        this.config.caffeinateCommand,
        '-d', '-i', '-m', '-s',
      ])
      this._mode = 'caffeinated'
      return ok(undefined)
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to start caffeinate: ${String(error)}`),
      )
    }
  }

  /**
   * Allow the Mac to sleep normally.
   * Kills the caffeinate process if one is running.
   */
  async allowSleep(): Promise<Result<void>> {
    if (this._mode === 'normal') {
      return ok(undefined)
    }

    try {
      if (this._processHandle) {
        this._processHandle.kill()
        this._processHandle = null
      }
      this._mode = 'normal'
      return ok(undefined)
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to stop caffeinate: ${String(error)}`),
      )
    }
  }
}
