import { describe, expect, test } from 'bun:test'
import { PowerManager, DEFAULT_POWER_CONFIG } from '../src/index.js'
import type { SpawnFn, PersistentSpawnFn } from '../src/index.js'
import { LaunchAgentManager, generatePlistXml } from '../src/launch-agent.js'
import type { FsOps } from '../src/launch-agent.js'
import { isOk, isErr } from '@imperium/shared-types'

// ============================================================================
// Mock helpers
// ============================================================================

function createMockSpawn(exitCode = 0, stdout = '', stderr = ''): SpawnFn {
  return async (_cmd: string[]) => ({ exitCode, stdout, stderr })
}

function createMockPersistentSpawn(): { spawn: PersistentSpawnFn; killed: boolean[] } {
  const killed: boolean[] = []
  const spawn: PersistentSpawnFn = (_cmd: string[]) => ({
    kill: () => killed.push(true),
    pid: 12345,
  })
  return { spawn, killed }
}

function createMockFs(files: Record<string, string> = {}): FsOps & { written: Record<string, string>; deleted: string[] } {
  const store = { ...files }
  const written: Record<string, string> = {}
  const deleted: string[] = []
  return {
    written,
    deleted,
    writeFile: async (path, content) => {
      store[path] = content
      written[path] = content
    },
    readFile: async (path) => {
      const content = store[path]
      if (content === undefined) throw new Error(`File not found: ${path}`)
      return content
    },
    unlink: async (path) => {
      delete store[path]
      deleted.push(path)
    },
    exists: async (path) => path in store,
    homedir: () => '/Users/test',
  }
}

// ============================================================================
// PowerManager tests
// ============================================================================

describe('PowerManager', () => {
  test('instantiates with default config', () => {
    const pm = new PowerManager()
    expect(pm.config).toEqual(DEFAULT_POWER_CONFIG)
  })

  test('default mode is normal', () => {
    const pm = new PowerManager()
    expect(pm.mode).toBe('normal')
  })

  test('accepts custom config', () => {
    const pm = new PowerManager({ autoRestart: true })
    expect(pm.config.autoRestart).toBe(true)
    expect(pm.config.caffeinateCommand).toBe('caffeinate')
  })

  test('isAvailable returns true when caffeinate exists', async () => {
    const spawn = createMockSpawn(0, '/usr/bin/caffeinate')
    const pm = new PowerManager({}, spawn)
    expect(await pm.isAvailable()).toBe(true)
  })

  test('isAvailable returns false when caffeinate not found', async () => {
    const spawn = createMockSpawn(1)
    const pm = new PowerManager({}, spawn)
    expect(await pm.isAvailable()).toBe(false)
  })

  test('preventSleep changes mode to caffeinated', async () => {
    const spawn = createMockSpawn(0, '/usr/bin/caffeinate')
    const { spawn: pSpawn } = createMockPersistentSpawn()
    const pm = new PowerManager({}, spawn, pSpawn)
    const result = await pm.preventSleep()
    expect(isOk(result)).toBe(true)
    expect(pm.mode).toBe('caffeinated')
    expect(pm.pid).toBe(12345)
  })

  test('preventSleep is idempotent', async () => {
    const spawn = createMockSpawn(0, '/usr/bin/caffeinate')
    const { spawn: pSpawn } = createMockPersistentSpawn()
    const pm = new PowerManager({}, spawn, pSpawn)
    await pm.preventSleep()
    const result = await pm.preventSleep()
    expect(isOk(result)).toBe(true)
    expect(pm.mode).toBe('caffeinated')
  })

  test('preventSleep returns error when caffeinate unavailable', async () => {
    const spawn = createMockSpawn(1)
    const pm = new PowerManager({}, spawn)
    const result = await pm.preventSleep()
    expect(isErr(result)).toBe(true)
    expect(pm.mode).toBe('normal')
  })

  test('allowSleep changes mode back to normal', async () => {
    const spawn = createMockSpawn(0, '/usr/bin/caffeinate')
    const { spawn: pSpawn, killed } = createMockPersistentSpawn()
    const pm = new PowerManager({}, spawn, pSpawn)
    await pm.preventSleep()
    const result = await pm.allowSleep()
    expect(isOk(result)).toBe(true)
    expect(pm.mode).toBe('normal')
    expect(pm.pid).toBeNull()
    expect(killed).toHaveLength(1)
  })

  test('allowSleep is idempotent', async () => {
    const spawn = createMockSpawn(0)
    const pm = new PowerManager({}, spawn)
    const result = await pm.allowSleep()
    expect(isOk(result)).toBe(true)
    expect(pm.mode).toBe('normal')
  })
})

// ============================================================================
// LaunchAgent tests
// ============================================================================

describe('LaunchAgentManager', () => {
  test('generatePlistXml produces valid plist', () => {
    const xml = generatePlistXml('/usr/local/bin/imperium')
    expect(xml).toContain('io.imperium.agent')
    expect(xml).toContain('/usr/local/bin/imperium')
    expect(xml).toContain('<true/>')
    expect(xml).toContain('RunAtLoad')
  })

  test('isInstalled returns false when no plist exists', async () => {
    const fs = createMockFs()
    const manager = new LaunchAgentManager(fs)
    expect(await manager.isInstalled()).toBe(false)
  })

  test('install writes plist and calls launchctl load', async () => {
    const fs = createMockFs()
    const spawn = createMockSpawn(0)
    const manager = new LaunchAgentManager(fs, spawn)
    const result = await manager.install('/usr/local/bin/imperium')
    expect(isOk(result)).toBe(true)

    const plistPath = '/Users/test/Library/LaunchAgents/io.imperium.agent.plist'
    expect(fs.written[plistPath]).toBeDefined()
    expect(fs.written[plistPath]).toContain('/usr/local/bin/imperium')
  })

  test('isInstalled returns true after install', async () => {
    const fs = createMockFs()
    const spawn = createMockSpawn(0)
    const manager = new LaunchAgentManager(fs, spawn)
    await manager.install('/usr/local/bin/imperium')
    expect(await manager.isInstalled()).toBe(true)
  })

  test('install returns error when launchctl fails', async () => {
    const fs = createMockFs()
    const spawn = createMockSpawn(1, '', 'load failed')
    const manager = new LaunchAgentManager(fs, spawn)
    const result = await manager.install('/usr/local/bin/imperium')
    expect(isErr(result)).toBe(true)
  })

  test('uninstall calls launchctl unload and deletes plist', async () => {
    const plistPath = '/Users/test/Library/LaunchAgents/io.imperium.agent.plist'
    const fs = createMockFs({ [plistPath]: '<plist/>' })
    const spawn = createMockSpawn(0)
    const manager = new LaunchAgentManager(fs, spawn)
    const result = await manager.uninstall()
    expect(isOk(result)).toBe(true)
    expect(fs.deleted).toContain(plistPath)
  })

  test('uninstall is idempotent when not installed', async () => {
    const fs = createMockFs()
    const spawn = createMockSpawn(0)
    const manager = new LaunchAgentManager(fs, spawn)
    const result = await manager.uninstall()
    expect(isOk(result)).toBe(true)
  })

  test('uninstall returns error when launchctl unload fails', async () => {
    const plistPath = '/Users/test/Library/LaunchAgents/io.imperium.agent.plist'
    const fs = createMockFs({ [plistPath]: '<plist/>' })
    const spawn = createMockSpawn(1, '', 'unload failed')
    const manager = new LaunchAgentManager(fs, spawn)
    const result = await manager.uninstall()
    expect(isErr(result)).toBe(true)
  })
})
