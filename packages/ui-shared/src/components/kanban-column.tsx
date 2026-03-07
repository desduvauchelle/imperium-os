import * as React from 'react'
import { cn } from '../lib/utils.js'

// ============================================================================
// KanbanColumn — A single status column on the Kanban board
// ============================================================================

export interface KanbanColumnProps {
  /** Column status (e.g. 'todo', 'in-progress') */
  readonly status: string
  /** Display label for the column header */
  readonly label: string
  /** Number of tasks in this column */
  readonly count: number
  /** Child cards */
  readonly children?: React.ReactNode
  /** Optional additional CSS classes */
  readonly className?: string | undefined
  /** Ref for drop target (from dnd-kit) */
  readonly dropRef?: React.Ref<HTMLDivElement> | undefined
  /** Whether the column is being dragged over */
  readonly isOver?: boolean | undefined
}

const STATUS_LABELS: Readonly<Record<string, string>> = {
  'todo': '📋 Todo',
  'in-progress': '🏗️ In Progress',
  'review': '👀 Review',
  'done': '✅ Done',
}

export function getColumnLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export function KanbanColumn({
  status,
  label,
  count,
  children,
  className,
  dropRef,
  isOver,
}: KanbanColumnProps) {
  return (
    <div
      ref={dropRef}
      className={cn(
        'flex w-72 flex-shrink-0 flex-col rounded-lg bg-muted/50 p-2',
        isOver && 'ring-2 ring-primary/50',
        className,
      )}
      data-testid={`kanban-column-${status}`}
    >
      <div className="mb-2 flex items-center justify-between px-2">
        <h3 className="text-sm font-semibold" data-testid="kanban-column-label">
          {label}
        </h3>
        <span className="text-xs text-muted-foreground" data-testid="kanban-column-count">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2" data-testid="kanban-column-cards">
        {children}
      </div>
    </div>
  )
}
