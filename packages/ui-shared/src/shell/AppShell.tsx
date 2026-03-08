import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppSidebar } from './AppSidebar.js'
import { ThemeToggle } from './ThemeToggle.js'
import type { NavItem } from './AppSidebar.js'
import { KanbanView } from '../views/KanbanView.js'
import { CostingView } from '../views/CostingView.js'
import { TailscaleView } from '../views/TailscaleView.js'
import { McpView } from '../views/McpView.js'
import { AgentView } from '../views/AgentView.js'
import { PermissionsView } from '../views/PermissionsView.js'
import { SettingsView } from '../views/SettingsView.js'
import type { SatelliteConfig } from '../satellite/SatelliteConfigModal.js'

export interface AppShellProps {
	/** Override nav items in the sidebar */
	readonly navItems?: NavItem[]
	/** Optional topbar left content */
	readonly topbarLeft?: React.ReactNode
	/** Called when settings are saved */
	readonly onSettingsSave?: (config: SatelliteConfig) => void
	/** Extra routes to append (e.g. custom project pages) */
	readonly extraRoutes?: React.ReactNode
	/** Default redirect path (defaults to /kanban) */
	readonly defaultRoute?: string
}

/**
 * Full desktop layout shell: sidebar + topbar + routed content.
 * Wrap in `<BrowserRouter>` or `<MemoryRouter>` before mounting.
 */
export function AppShell({
	navItems,
	topbarLeft,
	onSettingsSave,
	extraRoutes,
	defaultRoute = '/kanban',
}: AppShellProps) {
	return (
		<div className="flex h-screen bg-background text-foreground overflow-hidden" data-testid="satellite-shell">
			<AppSidebar {...(navItems !== undefined ? { navItems } : {})} />
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Topbar */}
				<header className="shrink-0 border-b border-border px-6 py-2 flex items-center justify-between">
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						{topbarLeft ?? <span>Imperium</span>}
					</div>
					<ThemeToggle />
				</header>
				{/* Content */}
				<main className="flex-1 overflow-y-auto p-6">
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
							element={<SettingsView onSave={onSettingsSave ?? (() => { })} />}
						/>
						{extraRoutes}
					</Routes>
				</main>
			</div>
		</div>
	)
}
