// ============================================================================
// @imperium/ui-shared - Shared UI Component Library
// ============================================================================

// Providers
export { ThemeProvider, useTheme } from './providers/theme-provider.js'
export type { ThemeProviderProps } from './providers/theme-provider.js'

// Components
export { Button, buttonVariants } from './components/button.js'
export type { ButtonProps } from './components/button.js'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './components/card.js'

export { Badge, badgeVariants } from './components/badge.js'
export type { BadgeProps } from './components/badge.js'

export { CostTag, costTagPropsFromEntry, formatCost } from './components/cost-tag.js'
export type { CostTagProps } from './components/cost-tag.js'

// Kanban Components
export { KanbanCard } from './components/kanban-card.js'
export type { KanbanCardProps } from './components/kanban-card.js'

export { KanbanColumn, getColumnLabel } from './components/kanban-column.js'
export type { KanbanColumnProps } from './components/kanban-column.js'

export { KanbanBoard } from './components/kanban-board.js'
export type { KanbanBoardProps } from './components/kanban-board.js'

// Costing Components
export { SpendBar, formatUsd } from './components/spend-bar.js'
export type { SpendBarProps } from './components/spend-bar.js'

// Satellite Shell (Phase 6)
export { SatelliteProvider, useSatellite } from './satellite/SatelliteContext.js'
export type {
	InvokeFn,
	PushCallback,
	SatelliteContextValue,
	SatelliteProviderProps,
} from './satellite/SatelliteContext.js'

export {
	SatelliteConfigModal,
	loadSatelliteConfig,
	saveSatelliteConfig,
	clearSatelliteConfig,
} from './satellite/SatelliteConfigModal.js'
export type { SatelliteConfig, SatelliteConfigModalProps } from './satellite/SatelliteConfigModal.js'

// Utilities
export { cn } from './lib/utils.js'

// ============================================================================
// Views — feature-level views shared across all platforms
// ============================================================================

export { KanbanView } from './views/KanbanView.js'
export type { KanbanViewProps } from './views/KanbanView.js'

export { CostingView } from './views/CostingView.js'
export type { CostingViewProps } from './views/CostingView.js'

export { TailscaleView } from './views/TailscaleView.js'

export { McpView } from './views/McpView.js'

export { AgentView } from './views/AgentView.js'

export { PermissionsView } from './views/PermissionsView.js'

export { SettingsView } from './views/SettingsView.js'
export type { SettingsViewProps } from './views/SettingsView.js'

// ============================================================================
// Shell — layout shells and navigation components
// ============================================================================

export { AppSidebar, DEFAULT_NAV_ITEMS } from './shell/AppSidebar.js'
export type { AppSidebarProps, NavItem } from './shell/AppSidebar.js'

export { BottomNav } from './shell/BottomNav.js'
export type { BottomNavProps } from './shell/BottomNav.js'

export { ThemeToggle } from './shell/ThemeToggle.js'

export { AppShell } from './shell/AppShell.js'
export type { AppShellProps } from './shell/AppShell.js'

export { MobileShell } from './shell/MobileShell.js'
export type { MobileShellProps } from './shell/MobileShell.js'
