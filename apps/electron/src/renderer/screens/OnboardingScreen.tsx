import React, { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@imperium/ui-shared'
import type { IpcChannel, IpcHandlerMap, OnboardingCheckResponse } from '@imperium/shared-types'

// ============================================================================
// Types
// ============================================================================

type DependencyResult = OnboardingCheckResponse['results'][number]

/** Simplified invoke signature for testing */
export type InvokeFn = <C extends IpcChannel>(
  channel: C,
  payload: IpcHandlerMap[C]['request'],
) => Promise<IpcHandlerMap[C]['response']>

export interface OnboardingScreenProps {
  /** Override IPC invoke for testing */
  readonly invoke?: InvokeFn
  /** Called when onboarding is complete (all required deps installed) */
  readonly onComplete?: () => void
}

// ============================================================================
// Dependency Row
// ============================================================================

function DependencyRow({
  dep,
  onInstall,
  installing,
}: {
  readonly dep: DependencyResult
  readonly onInstall: (name: string) => void
  readonly installing: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0" data-testid={`dep-${dep.name}`}>
      <div className="flex items-center gap-3">
        <span className="text-lg" role="img" aria-label={dep.installed ? 'installed' : 'missing'}>
          {dep.installed ? '✅' : '❌'}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{dep.name}</span>
            {dep.required ? (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">required</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">optional</Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {dep.installed && dep.version ? `v${dep.version}` : dep.command}
          </span>
        </div>
      </div>

      {!dep.installed && (
        <Button
          size="sm"
          variant="outline"
          disabled={installing}
          onClick={() => onInstall(dep.name)}
          data-testid={`install-${dep.name}`}
        >
          {installing ? 'Installing…' : 'Install'}
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// OnboardingScreen
// ============================================================================

export function OnboardingScreen({ invoke, onComplete }: OnboardingScreenProps) {
  const [results, setResults] = useState<readonly DependencyResult[]>([])
  const [allRequiredInstalled, setAllRequiredInstalled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [installingName, setInstallingName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ipcInvoke: InvokeFn | undefined = invoke ?? window.electronApi?.invoke

  const checkDependencies = useCallback(async () => {
    if (!ipcInvoke) {
      setError('IPC not available')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const response = await ipcInvoke('onboarding:check', undefined as void)
      setResults(response.results)
      setAllRequiredInstalled(response.allRequiredInstalled)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to check dependencies')
    } finally {
      setLoading(false)
    }
  }, [ipcInvoke])

  useEffect(() => {
    void checkDependencies()
  }, [checkDependencies])

  const handleInstall = useCallback(async (name: string) => {
    if (!ipcInvoke) return
    setInstallingName(name)
    try {
      await ipcInvoke('onboarding:install', { name })
      // Re-check after install attempt
      await checkDependencies()
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to install ${name}`)
    } finally {
      setInstallingName(null)
    }
  }, [ipcInvoke, checkDependencies])

  if (loading && results.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground" data-testid="loading">Checking dependencies…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Welcome to Imperium OS</CardTitle>
          <CardDescription>
            Let&apos;s make sure your system has the required tools installed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded p-2" data-testid="error">
              {error}
            </div>
          )}

          <div>
            {results.map((dep) => (
              <DependencyRow
                key={dep.name}
                dep={dep}
                onInstall={handleInstall}
                installing={installingName === dep.name}
              />
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => void checkDependencies()} disabled={loading}>
              Re-check
            </Button>
            <Button
              disabled={!allRequiredInstalled}
              onClick={onComplete}
              data-testid="continue-btn"
            >
              {allRequiredInstalled ? 'Continue' : 'Install required tools to continue'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
