import React, { useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import {
  ThemeProvider,
  SatelliteProvider,
  SatelliteConfigModal,
  AppShell,
  loadSatelliteConfig,
  type SatelliteConfig,
} from '@imperium/ui-shared'

import { useSatelliteConnection } from './hooks/useSatelliteConnection.js'

// ============================================================================
// Connected shell — rendered once config is available
// ============================================================================

function ConnectedShell({
  config,
  onReconfigure,
}: {
  config: SatelliteConfig
  onReconfigure: (cfg: SatelliteConfig) => void
}) {
  const { invoke, isConnected, masterOffline, onPush } = useSatelliteConnection(config)

  return (
    <SatelliteProvider
      invoke={invoke}
      isConnected={isConnected}
      masterOffline={masterOffline}
      onPush={onPush}
    >
      <AppShell
        topbarLeft={<span className="text-xs text-muted-foreground">Imperium Satellite</span>}
        onSettingsSave={onReconfigure}
      />
    </SatelliteProvider>
  )
}

// ============================================================================
// Root App
// ============================================================================

export function App() {
  const [config, setConfig] = useState<SatelliteConfig | undefined>(loadSatelliteConfig)

  return (
    <ThemeProvider>
      {config === undefined || config.masterUrl === '' ? (
        <div className="min-h-screen bg-background text-foreground" data-testid="setup-screen">
          <SatelliteConfigModal onSave={setConfig} />
        </div>
      ) : (
        <BrowserRouter>
          <ConnectedShell config={config} onReconfigure={setConfig} />
        </BrowserRouter>
      )}
    </ThemeProvider>
  )
}

