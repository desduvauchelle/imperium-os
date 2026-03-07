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

// Utilities
export { cn } from './lib/utils.js'
