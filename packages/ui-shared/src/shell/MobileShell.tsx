import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { BottomNav } from './BottomNav.js'
import { ThemeToggle } from './ThemeToggle.js'
import type { NavItem } from './AppSidebar.js'
import { KanbanView } from '../views/KanbanView.js'
import { CostingView } from '../views/CostingView.js'
import { TailscaleView } from '../views/TailscaleView.js'
import { McpView } from '../views/McpView.js'
import { AgentView } from '../views/AgentView.js'
import { PermissionsView } from '../views/PermissionsView.js'
import { SettingsView } from '../views/SettingsView.js'
import { Badge } from '../components/badge.js'
import { useSatellite } from '../satellite/SatelliteContext.js'
import type { SatelliteConfig } from '../satellite/SatelliteConfigModal.js'

export interface MobileShellProps {
  readonly navItems?: NavItem[]
  readonly onSettingsSave?: (config: SatelliteConfig) => void
  readonly extraRoutes?: React.ReactNode
  readonly defaultRoute?: string
}

/**
 * Mobile layout shell: slim top status bar + content + bottom navigation.
 * Wrap in `<BrowserRouter>` before mounting.
 */
export function MobileShell({
  navItems,
  onSettingsSave,
  extraRoutes,
  defaultRoute = '/kanban',
}: MobileShellProps) {
  const { masterOffline } = useSatellite()

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden" data-testid="mobile-shell">
      {/* Slim status bar */}
      <div className="shrink-0 px-4 py-1 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold">Imperium</span>
        {masterOffline ? (
          <Badge variant="destructive" data-testid="master-offline-badge">Offline</Badge>
        ) : (
          <Badge variant="default" data-testid="master-online-badge">Connected</Badge>
        )}
      </div>
      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4">
        <Routes>
          <Route path="/" element={<Navigate to={defaultRoute} replace />} />
          <Route path="/kanban" element={<KanbanView />} />
          <Route path="/costing" element={<CostingView />} />
          <Route path="/tailscale" element={<TailscaleView />} />
          <Route path="/mcp" element={<McpView />} />
          <Route path="/agent" element={<AgentView />} />
          <Route path="/permissions" element={<PermissionsView />} />
          <Route
            path="/settings"
            element={<SettingsView onSave={onSettingsSave ?? (() => {})} />}
          />
          {extraRoutes}
        </Routes>
      </main>
      {/* Bottom navigation */}
      <BottomNav {...(navItems !== undefined ? { navItems } : {})} />
    </div>
  )
}
