import type { Result } from '@imperium/shared-types'

// ============================================================================
// Onboarding - CLI Dependency & Auth Checkers
// ============================================================================

/** CLI dependency that should be checked on startup */
export interface CliDependency {
  readonly name: string
  readonly command: string
  readonly versionFlag: string
  readonly installUrl: string
  readonly required: boolean
}

/** Result of checking a single dependency */
export interface DependencyCheckResult {
  readonly dependency: CliDependency
  readonly installed: boolean
  readonly version?: string | undefined
  readonly error?: string | undefined
}

/** Default CLI dependencies to check */
export const DEFAULT_CLI_DEPENDENCIES: readonly CliDependency[] = [
  {
    name: 'Bun',
    command: 'bun',
    versionFlag: '--version',
    installUrl: 'https://bun.sh',
    required: true,
  },
  {
    name: 'Git',
    command: 'git',
    versionFlag: '--version',
    installUrl: 'https://git-scm.com',
    required: true,
  },
] as const

export class OnboardingChecker {
  readonly dependencies: readonly CliDependency[]

  constructor(dependencies: readonly CliDependency[] = DEFAULT_CLI_DEPENDENCIES) {
    this.dependencies = dependencies
  }

  /**
   * Check all CLI dependencies and return their status.
   * @throws {Error} Not implemented in Phase 1
   */
  async checkDependencies(): Promise<Result<readonly DependencyCheckResult[]>> {
    throw new Error('OnboardingChecker.checkDependencies: Not implemented (Phase 1 stub)')
  }

  /**
   * Attempt to auto-install a missing dependency.
   * @throws {Error} Not implemented in Phase 1
   */
  async autoInstall(dependency: CliDependency): Promise<Result<void>> {
    void dependency
    throw new Error('OnboardingChecker.autoInstall: Not implemented (Phase 1 stub)')
  }
}
