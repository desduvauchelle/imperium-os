import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import {
  ThemeProvider,
  Button,
  SatelliteProvider,
  SatelliteConfigModal,
  loadSatelliteConfig,
  type SatelliteConfig,
  useTheme,
} from '@imperium/ui-shared'
import type { ThemeMode } from '@imperium/shared-types'

import { useSatelliteConnection } from './hooks/useSatelliteConnection.js'
import { Sidebar } from './components/Sidebar.js'
import { KanbanPage } from './pages/KanbanPage.js'
import { CostingPage } from './pages/CostingPage.js'
import { TailscalePage } from './pages/TailscalePage.js'
import { McpPage } from './pages/McpPage.js'
import { AgentPage } from './pages/AgentPage.js'
import { PermissionsPage } from './pages/PermissionsPage.js'
import { SettingsPage } from './pages/SettingsPage.js'

// ============================================================================
// Theme Toggle
// ============================================================================

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const modes: ThemeMode[] = ['light', 'dark', 'auto']
  return (
    <div className="flex gap-2">
      {modes.map((mode) => (
        <Button
          key={mode}
          variant={theme === mode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTheme(mode)}
          data-testid={`theme-${mode}`}
        >
          {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </Button>
      ))}
    </div>
  )
}

// ============================================================================
// Connected shell — rendered once config is available
// ============================================================================

function ConnectedShell({ config, onReconfigure }: {
  config: SatelliteConfig
  onReconfigure: (cfg: SatelliteConfig) => void
}) {
  const { invoke, isConnected, masterOffline, onPush } = useSatelliteConnection(config)

  return (
    <SatelliteProvider invoke={invoke} isConnected={isConnected} masterOffline={masterOffline} onPush={onPush}>
      <div className="flex h-screen bg-background text-foreground" data-testid="satellite-shell">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="shrink-0 border-b border-border px-6 py-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Imperium Satellite</span>
            <ThemeToggle />
          </header>
          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/kanban" replace />} />
              <Route path="/kanban" element={<KanbanPage />} />
              <Route path="/costing" element={<CostingPage />} />
              <Route path="/tailscale" element={<TailscalePage />} />
              <Route path="/mcp" element={<McpPage />} />
              <Route path="/agent" element={<AgentPage />} />
              <Route path="/permissions" element={<PermissionsPage />} />
              <Route path="/settings" element={<SettingsPage onSave={onReconfigure} />} />
            </Routes>
          </main>
        </div>
      </div>
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

