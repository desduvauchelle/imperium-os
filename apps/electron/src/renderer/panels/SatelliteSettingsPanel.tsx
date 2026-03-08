import React, { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@imperium/ui-shared'
import type { IpcChannel, IpcHandlerMap, SatelliteConfigResponse } from '@imperium/shared-types'

// ============================================================================
// Types
// ============================================================================

export type InvokeFn = <C extends IpcChannel>(
  channel: C,
  payload: IpcHandlerMap[C]['request'],
) => Promise<IpcHandlerMap[C]['response']>

export interface SatelliteSettingsPanelProps {
  readonly invoke?: InvokeFn
}

/** Mask a token string — show first 8 hex chars then ellipsis. */
function maskToken(token: string): string {
  if (token.length <= 8) return token
  return `${token.slice(0, 8)}…`
}

// ============================================================================
// SatelliteSettingsPanel
// ============================================================================

export function SatelliteSettingsPanel({ invoke }: SatelliteSettingsPanelProps) {
  const [config, setConfig] = useState<SatelliteConfigResponse | null>(null)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  const loadConfig = useCallback(async () => {
    if (!invoke) return
    const result = await invoke('satellite:get-config', undefined)
    setConfig(result)
  }, [invoke])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  const handleRegenerate = async () => {
    if (!invoke) return
    setRegenerating(true)
    try {
      const result = await invoke('satellite:regenerate-token', undefined)
      setNewToken(result.newToken)
      // Refresh config to show updated running state / client count
      await loadConfig()
    } finally {
      setRegenerating(false)
    }
  }

  if (!config) {
    return <div data-testid="satellite-settings-loading">Loading satellite config…</div>
  }

  return (
    <Card data-testid="satellite-settings-panel">
      <CardHeader>
        <CardTitle>Satellite Server</CardTitle>
        <CardDescription>
          REST + WebSocket gateway for web and mobile clients
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status row */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge
            variant={config.isRunning ? 'default' : 'destructive'}
            data-testid="satellite-status-badge"
          >
            {config.isRunning ? 'Running' : 'Stopped'}
          </Badge>
          <span className="text-sm text-muted-foreground" data-testid="client-count">
            {config.connectedClients} client{config.connectedClients !== 1 ? 's' : ''} connected
          </span>
        </div>

        {/* Port row */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-16">Port</span>
          <code className="text-sm font-mono" data-testid="satellite-port">
            {config.port}
          </code>
        </div>

        {/* Token row */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-16">Token</span>
          <code className="text-sm font-mono" data-testid="satellite-token-masked">
            {maskToken(config.token)}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
            data-testid="regenerate-token-btn"
          >
            {regenerating ? 'Rotating…' : 'Regenerate Token'}
          </Button>
        </div>

        {/* New token disclosure — shown once after regeneration */}
        {newToken && (
          <div
            className="rounded-md bg-muted p-3 flex items-start gap-2"
            data-testid="new-token-disclosure"
          >
            <div>
              <p className="text-xs font-medium text-foreground mb-1">
                New token (copy now — shown once):
              </p>
              <code className="text-xs font-mono break-all" data-testid="new-token-value">
                {newToken}
              </code>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
