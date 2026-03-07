import type { Result } from '@imperium/shared-types'
import { ok, err } from '@imperium/shared-types'

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
  /** Homebrew formula for auto-install on macOS (optional) */
  readonly brewFormula?: string | undefined
}

/** Result of checking a single dependency */
export interface DependencyCheckResult {
  readonly dependency: CliDependency
  readonly installed: boolean
  readonly version?: string | undefined
  readonly error?: string | undefined
}

/** Aggregate report of all dependency checks */
export interface OnboardingReport {
  readonly results: readonly DependencyCheckResult[]
  readonly allRequiredInstalled: boolean
  readonly missingRequired: readonly CliDependency[]
  readonly missingOptional: readonly CliDependency[]
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
  {
    name: 'Claude CLI',
    command: 'claude',
    versionFlag: '--version',
    installUrl: 'https://docs.anthropic.com/en/docs/claude-cli',
    required: false,
    brewFormula: 'anthropics/tap/claude-code',
  },
  {
    name: 'Gemini CLI',
    command: 'gemini',
    versionFlag: '--version',
    installUrl: 'https://ai.google.dev/gemini-api/docs/cli',
    required: false,
  },
  {
    name: 'OpenAI CLI',
    command: 'openai',
    versionFlag: '--version',
    installUrl: 'https://platform.openai.com/docs/quickstart',
    required: false,
  },
  {
    name: 'Ollama',
    command: 'ollama',
    versionFlag: '--version',
    installUrl: 'https://ollama.ai',
    required: false,
    brewFormula: 'ollama',
  },
] as const

/** Function type for spawning shell commands (injectable for testing) */
export type SpawnFn = (
  cmd: string[],
) => Promise<{ exitCode: number; stdout: string; stderr: string }>

/** Default spawn implementation using Bun.spawn */
export async function defaultSpawn(
  cmd: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const proc = Bun.spawn(cmd, {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    const exitCode = await proc.exited

    return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() }
  } catch {
    return { exitCode: 1, stdout: '', stderr: 'Command not found' }
  }
}

export class OnboardingChecker {
  readonly dependencies: readonly CliDependency[]
  private readonly spawn: SpawnFn

  constructor(
    dependencies: readonly CliDependency[] = DEFAULT_CLI_DEPENDENCIES,
    spawn: SpawnFn = defaultSpawn,
  ) {
    this.dependencies = dependencies
    this.spawn = spawn
  }

  /**
   * Check all CLI dependencies and return their status.
   */
  async checkDependencies(): Promise<Result<readonly DependencyCheckResult[]>> {
    try {
      const results = await Promise.all(
        this.dependencies.map((dep) => this.checkOne(dep)),
      )
      return ok(results)
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Dependency check failed: ${String(error)}`),
      )
    }
  }

  /**
   * Generate a full onboarding report with aggregated status.
   */
  async generateReport(): Promise<Result<OnboardingReport>> {
    const checksResult = await this.checkDependencies()
    if (!checksResult.ok) return checksResult

    const results = checksResult.value
    const missingRequired = results
      .filter((r) => !r.installed && r.dependency.required)
      .map((r) => r.dependency)
    const missingOptional = results
      .filter((r) => !r.installed && !r.dependency.required)
      .map((r) => r.dependency)

    return ok({
      results,
      allRequiredInstalled: missingRequired.length === 0,
      missingRequired,
      missingOptional,
    })
  }

  /**
   * Attempt to auto-install a missing dependency via Homebrew.
   * Falls back to opening the install URL if no brew formula is available.
   */
  async autoInstall(dependency: CliDependency): Promise<Result<void>> {
    try {
      if (dependency.brewFormula) {
        const result = await this.spawn(['brew', 'install', dependency.brewFormula])
        if (result.exitCode === 0) {
          return ok(undefined)
        }
        return err(new Error(`brew install failed: ${result.stderr || result.stdout}`))
      }

      // No brew formula — try opening the install URL
      await this.spawn(['open', dependency.installUrl])
      return ok(undefined)
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Auto-install failed: ${String(error)}`),
      )
    }
  }

  /**
   * Check a single CLI dependency.
   */
  private async checkOne(dep: CliDependency): Promise<DependencyCheckResult> {
    try {
      const result = await this.spawn([dep.command, dep.versionFlag])

      if (result.exitCode === 0) {
        // Extract version from stdout — take first line, strip common prefixes
        const rawVersion = result.stdout.split('\n')[0] ?? ''
        const version = rawVersion.replace(/^(git version |v)/i, '').trim()

        return {
          dependency: dep,
          installed: true,
          version: version || undefined,
        }
      }

      return {
        dependency: dep,
        installed: false,
        error: result.stderr || 'Non-zero exit code',
      }
    } catch {
      return {
        dependency: dep,
        installed: false,
        error: 'Command not found',
      }
    }
  }
}
