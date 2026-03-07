import { describe, expect, test } from 'bun:test'
import {
  OnboardingChecker,
  DEFAULT_CLI_DEPENDENCIES,
} from '../src/index.js'
import type { CliDependency, SpawnFn } from '../src/index.js'
import { isOk, isErr } from '@imperium/shared-types'

// ============================================================================
// Mock spawn factory
// ============================================================================

function createMockSpawn(
  installed: Record<string, string>,
): SpawnFn {
  return async (cmd: string[]) => {
    const command = cmd[0]!
    if (command in installed) {
      return { exitCode: 0, stdout: installed[command]!, stderr: '' }
    }
    return { exitCode: 1, stdout: '', stderr: 'Command not found' }
  }
}

describe('OnboardingChecker', () => {
  test('instantiates with default dependencies', () => {
    const checker = new OnboardingChecker()
    expect(checker.dependencies).toEqual(DEFAULT_CLI_DEPENDENCIES)
  })

  test('accepts custom dependencies', () => {
    const custom: CliDependency[] = [
      { name: 'Node', command: 'node', versionFlag: '--version', installUrl: 'https://nodejs.org', required: false },
    ]
    const checker = new OnboardingChecker(custom)
    expect(checker.dependencies).toEqual(custom)
  })

  test('DEFAULT_CLI_DEPENDENCIES includes Bun, Git, and AI CLIs', () => {
    const names = DEFAULT_CLI_DEPENDENCIES.map((d) => d.name)
    expect(names).toContain('Bun')
    expect(names).toContain('Git')
    expect(names).toContain('Claude CLI')
    expect(names).toContain('Gemini CLI')
    expect(names).toContain('OpenAI CLI')
    expect(names).toContain('Ollama')
  })

  // ========== checkDependencies ==========

  test('checkDependencies detects installed commands', async () => {
    const deps: CliDependency[] = [
      { name: 'Bun', command: 'bun', versionFlag: '--version', installUrl: '', required: true },
      { name: 'Git', command: 'git', versionFlag: '--version', installUrl: '', required: true },
    ]
    const spawn = createMockSpawn({ bun: '1.1.29', git: 'git version 2.43.0' })
    const checker = new OnboardingChecker(deps, spawn)

    const result = await checker.checkDependencies()
    expect(isOk(result)).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(2)
      expect(result.value[0]!.installed).toBe(true)
      expect(result.value[0]!.version).toBe('1.1.29')
      expect(result.value[1]!.installed).toBe(true)
      expect(result.value[1]!.version).toBe('2.43.0')
    }
  })

  test('checkDependencies detects missing commands', async () => {
    const deps: CliDependency[] = [
      { name: 'Claude', command: 'claude', versionFlag: '--version', installUrl: '', required: false },
    ]
    const spawn = createMockSpawn({}) // nothing installed
    const checker = new OnboardingChecker(deps, spawn)

    const result = await checker.checkDependencies()
    expect(isOk(result)).toBe(true)
    if (result.ok) {
      expect(result.value[0]!.installed).toBe(false)
      expect(result.value[0]!.error).toBeTruthy()
    }
  })

  test('checkDependencies handles mix of installed and missing', async () => {
    const deps: CliDependency[] = [
      { name: 'Bun', command: 'bun', versionFlag: '--version', installUrl: '', required: true },
      { name: 'Claude', command: 'claude', versionFlag: '--version', installUrl: '', required: false },
    ]
    const spawn = createMockSpawn({ bun: '1.1.29' })
    const checker = new OnboardingChecker(deps, spawn)

    const result = await checker.checkDependencies()
    expect(isOk(result)).toBe(true)
    if (result.ok) {
      expect(result.value[0]!.installed).toBe(true)
      expect(result.value[1]!.installed).toBe(false)
    }
  })

  // ========== generateReport ==========

  test('generateReport identifies missing required deps', async () => {
    const deps: CliDependency[] = [
      { name: 'Bun', command: 'bun', versionFlag: '--version', installUrl: '', required: true },
      { name: 'Git', command: 'git', versionFlag: '--version', installUrl: '', required: true },
      { name: 'Claude', command: 'claude', versionFlag: '--version', installUrl: '', required: false },
    ]
    const spawn = createMockSpawn({ bun: '1.1.29' }) // git and claude missing
    const checker = new OnboardingChecker(deps, spawn)

    const result = await checker.generateReport()
    expect(isOk(result)).toBe(true)
    if (result.ok) {
      expect(result.value.allRequiredInstalled).toBe(false)
      expect(result.value.missingRequired).toHaveLength(1)
      expect(result.value.missingRequired[0]!.name).toBe('Git')
      expect(result.value.missingOptional).toHaveLength(1)
      expect(result.value.missingOptional[0]!.name).toBe('Claude')
    }
  })

  test('generateReport returns allRequiredInstalled=true when all present', async () => {
    const deps: CliDependency[] = [
      { name: 'Bun', command: 'bun', versionFlag: '--version', installUrl: '', required: true },
    ]
    const spawn = createMockSpawn({ bun: '1.1.29' })
    const checker = new OnboardingChecker(deps, spawn)

    const result = await checker.generateReport()
    expect(isOk(result)).toBe(true)
    if (result.ok) {
      expect(result.value.allRequiredInstalled).toBe(true)
      expect(result.value.missingRequired).toHaveLength(0)
    }
  })

  // ========== autoInstall ==========

  test('autoInstall uses brew when formula is available', async () => {
    const calls: string[][] = []
    const spawn: SpawnFn = async (cmd) => {
      calls.push(cmd)
      return { exitCode: 0, stdout: 'Installed', stderr: '' }
    }

    const dep: CliDependency = {
      name: 'Ollama', command: 'ollama', versionFlag: '--version',
      installUrl: 'https://ollama.ai', required: false, brewFormula: 'ollama',
    }

    const checker = new OnboardingChecker([], spawn)
    const result = await checker.autoInstall(dep)

    expect(isOk(result)).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual(['brew', 'install', 'ollama'])
  })

  test('autoInstall opens URL when no brew formula', async () => {
    const calls: string[][] = []
    const spawn: SpawnFn = async (cmd) => {
      calls.push(cmd)
      return { exitCode: 0, stdout: '', stderr: '' }
    }

    const dep: CliDependency = {
      name: 'Test', command: 'test', versionFlag: '--version',
      installUrl: 'https://example.com', required: false,
    }

    const checker = new OnboardingChecker([], spawn)
    await checker.autoInstall(dep)

    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual(['open', 'https://example.com'])
  })

  test('autoInstall returns error when brew fails', async () => {
    const spawn: SpawnFn = async () => {
      return { exitCode: 1, stdout: '', stderr: 'No such formula' }
    }

    const dep: CliDependency = {
      name: 'Bad', command: 'bad', versionFlag: '--version',
      installUrl: '', required: false, brewFormula: 'nonexistent',
    }

    const checker = new OnboardingChecker([], spawn)
    const result = await checker.autoInstall(dep)

    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error.message).toContain('brew install failed')
    }
  })

  // ========== version parsing ==========

  test('strips "git version" prefix from version string', async () => {
    const deps: CliDependency[] = [
      { name: 'Git', command: 'git', versionFlag: '--version', installUrl: '', required: true },
    ]
    const spawn = createMockSpawn({ git: 'git version 2.43.0' })
    const checker = new OnboardingChecker(deps, spawn)

    const result = await checker.checkDependencies()
    expect(isOk(result)).toBe(true)
    if (result.ok) {
      expect(result.value[0]!.version).toBe('2.43.0')
    }
  })

  test('strips "v" prefix from version string', async () => {
    const deps: CliDependency[] = [
      { name: 'Node', command: 'node', versionFlag: '--version', installUrl: '', required: false },
    ]
    const spawn = createMockSpawn({ node: 'v20.10.0' })
    const checker = new OnboardingChecker(deps, spawn)

    const result = await checker.checkDependencies()
    expect(isOk(result)).toBe(true)
    if (result.ok) {
      expect(result.value[0]!.version).toBe('20.10.0')
    }
  })
})
