import type { Result } from '@imperium/shared-types'
import { ok, err } from '@imperium/shared-types'
import type { SpawnFn } from './index.js'

// ============================================================================
// LaunchAgent Manager - macOS auto-restart on reboot
// ============================================================================

const PLIST_LABEL = 'io.imperium.agent'
const PLIST_FILENAME = `${PLIST_LABEL}.plist`

/** Injectable file-system functions for testing */
export interface FsOps {
  readonly writeFile: (path: string, content: string) => Promise<void>
  readonly readFile: (path: string) => Promise<string>
  readonly unlink: (path: string) => Promise<void>
  readonly exists: (path: string) => Promise<boolean>
  readonly homedir: () => string
}

/** Default FS ops using Bun/Node APIs */
function defaultFsOps(): FsOps {
  return {
    writeFile: async (path, content) => {
      await Bun.write(path, content)
    },
    readFile: async (path) => {
      const file = Bun.file(path)
      return file.text()
    },
    unlink: async (path) => {
      const { unlink } = await import('node:fs/promises')
      await unlink(path)
    },
    exists: async (path) => {
      const file = Bun.file(path)
      return file.exists()
    },
    homedir: () => {
      const { homedir } = require('node:os') as typeof import('node:os')
      return homedir()
    },
  }
}

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

/**
 * Generate the plist XML content for a macOS LaunchAgent.
 */
export function generatePlistXml(execPath: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${execPath}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>/tmp/imperium-agent.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/imperium-agent.stderr.log</string>
</dict>
</plist>`
}

export class LaunchAgentManager {
  private readonly fs: FsOps
  private readonly spawn: SpawnFn

  constructor(fs?: FsOps, spawn?: SpawnFn) {
    this.fs = fs ?? defaultFsOps()
    this.spawn = spawn ?? defaultSpawn
  }

  /** Get the path to the LaunchAgents directory */
  private get plistPath(): string {
    return `${this.fs.homedir()}/Library/LaunchAgents/${PLIST_FILENAME}`
  }

  /** Check if the LaunchAgent is currently installed */
  async isInstalled(): Promise<boolean> {
    return this.fs.exists(this.plistPath)
  }

  /**
   * Install the LaunchAgent plist and load it via launchctl.
   * @param execPath - Absolute path to the Imperium executable
   */
  async install(execPath: string): Promise<Result<void>> {
    try {
      const plistContent = generatePlistXml(execPath)
      await this.fs.writeFile(this.plistPath, plistContent)

      const loadResult = await this.spawn(['launchctl', 'load', this.plistPath])
      if (loadResult.exitCode !== 0) {
        return err(new Error(`launchctl load failed: ${loadResult.stderr}`))
      }

      return ok(undefined)
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to install LaunchAgent: ${String(error)}`),
      )
    }
  }

  /**
   * Uninstall the LaunchAgent — unload via launchctl and delete the plist.
   */
  async uninstall(): Promise<Result<void>> {
    try {
      const installed = await this.isInstalled()
      if (!installed) {
        return ok(undefined)
      }

      const unloadResult = await this.spawn(['launchctl', 'unload', this.plistPath])
      if (unloadResult.exitCode !== 0) {
        return err(new Error(`launchctl unload failed: ${unloadResult.stderr}`))
      }

      await this.fs.unlink(this.plistPath)
      return ok(undefined)
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to uninstall LaunchAgent: ${String(error)}`),
      )
    }
  }
}
