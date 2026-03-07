import * as React from 'react'
import { cn } from '../lib/utils.js'

// ============================================================================
// KanbanBoard — Container for columns with horizontal scroll
// ============================================================================

export interface KanbanBoardProps {
  /** Child columns */
  readonly children?: React.ReactNode
  /** Optional additional CSS classes */
  readonly className?: string | undefined
}

export function KanbanBoard({ children, className }: KanbanBoardProps) {
  return (
    <div
      className={cn('flex gap-4 overflow-x-auto p-4', className)}
      data-testid="kanban-board"
    >
      {children}
    </div>
  )
}
