import { describe, expect, test } from 'bun:test'
import { OnboardingChecker, DEFAULT_CLI_DEPENDENCIES } from '../src/index.js'

describe('OnboardingChecker', () => {
  test('instantiates with default dependencies', () => {
    const checker = new OnboardingChecker()
    expect(checker.dependencies).toEqual(DEFAULT_CLI_DEPENDENCIES)
  })

  test('accepts custom dependencies', () => {
    const custom = [{ name: 'Node', command: 'node', versionFlag: '--version', installUrl: 'https://nodejs.org', required: false }]
    const checker = new OnboardingChecker(custom)
    expect(checker.dependencies).toEqual(custom)
  })

  test('DEFAULT_CLI_DEPENDENCIES includes Bun and Git', () => {
    const names = DEFAULT_CLI_DEPENDENCIES.map((d) => d.name)
    expect(names).toContain('Bun')
    expect(names).toContain('Git')
  })

  test('checkDependencies throws not-implemented', async () => {
    const checker = new OnboardingChecker()
    await expect(checker.checkDependencies()).rejects.toThrow('Not implemented')
  })

  test('autoInstall throws not-implemented', async () => {
    const checker = new OnboardingChecker()
    await expect(checker.autoInstall(DEFAULT_CLI_DEPENDENCIES[0]!)).rejects.toThrow('Not implemented')
  })
})
