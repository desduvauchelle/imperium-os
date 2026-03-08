'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, useSatellite } from '@imperium/ui-shared'

// Web-specific Satellite settings: shows the current satellite config from the Master
// and allows copying the token for connecting from other nodes.
export function SatelliteSettingsPanel() {
  const { invoke } = useSatellite()
  const [config, setConfig] = useState<{ port: number; token: string; isRunning: boolean; connectedClients: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const c = await invoke('satellite:get-config', undefined as never)
      setConfig(c)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const regenerate = async () => {
    try {
      const res = await invoke('satellite:regenerate-token', undefined as never)
      setConfig((prev) => prev ? { ...prev, token: res.newToken } : null)
    } catch {
      // ignore
    }
  }

  const copyToken = () => {
    if (!config) return
    void navigator.clipboard.writeText(config.token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Satellite Configuration</CardTitle>
          <CardDescription>Manage the Master node API token and connection settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!config ? (
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? 'Loading…' : 'Load Config'}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-24">Status</span>
                <span className={`text-xs font-medium ${config.isRunning ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {config.isRunning ? `Running on port ${config.port}` : 'Not running'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-24">Clients</span>
                <span className="text-xs">{config.connectedClients}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-24">Token</span>
                <code className="flex-1 text-xs bg-muted rounded px-2 py-1 font-mono truncate">
                  {config.token || '—'}
                </code>
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={copyToken}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => void regenerate()}>
                  Regenerate Token
                </Button>
                <Button size="sm" variant="outline" onClick={() => void load()}>
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Mode</CardTitle>
          <CardDescription>Switch between Master, Satellite, or Both modes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              localStorage.removeItem('imperium:mode')
              document.cookie = 'imperium:mode=; path=/; max-age=0'
              window.location.href = '/onboarding'
            }}
          >
            Re-run Onboarding
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
