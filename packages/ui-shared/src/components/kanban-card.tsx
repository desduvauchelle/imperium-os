import * as React from 'react'
import { Badge } from './badge.js'
import { cn } from '../lib/utils.js'

// ============================================================================
// KanbanCard — Single task card on the Kanban board
// ============================================================================

export interface KanbanCardProps {
  /** Unique task ID */
  readonly id: string
  /** Task title */
  readonly title: string
  /** Task priority */
  readonly priority: string
  /** Task assignee */
  readonly assignee?: string | undefined
  /** Number of comments */
  readonly commentCount: number
  /** Optional additional CSS classes */
  readonly className?: string | undefined
  /** Click handler for the card */
  readonly onClick?: () => void
  /** Drag handle attributes (from dnd-kit) */
  readonly dragAttributes?: Record<string, unknown> | undefined
  /** Drag handle listeners (from dnd-kit) */
  readonly dragListeners?: Record<string, unknown> | undefined
  /** Ref for drag (from dnd-kit) */
  readonly dragRef?: React.Ref<HTMLDivElement> | undefined
  /** Inline style for drag transforms */
  readonly style?: React.CSSProperties | undefined
}

const PRIORITY_COLORS: Readonly<Record<string, 'default' | 'secondary' | 'destructive' | 'outline'>> = {
  low: 'secondary',
  medium: 'outline',
  high: 'default',
  critical: 'destructive',
}

export function KanbanCard({
  id,
  title,
  priority,
  assignee,
  commentCount,
  className,
  onClick,
  dragAttributes,
  dragListeners,
  dragRef,
  style,
}: KanbanCardProps) {
  return (
    <div
      ref={dragRef}
      style={style}
      className={cn(
        'rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing',
        className,
      )}
      data-testid={`kanban-card-${id}`}
      onClick={onClick}
      {...dragAttributes}
      {...dragListeners}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-tight" data-testid="kanban-card-title">
          {title}
        </span>
        <Badge variant={PRIORITY_COLORS[priority] ?? 'outline'} data-testid="kanban-card-priority">
          {priority}
        </Badge>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        {assignee ? (
          <span data-testid="kanban-card-assignee">{assignee}</span>
        ) : (
          <span>Unassigned</span>
        )}
        {commentCount > 0 && (
          <span data-testid="kanban-card-comments">💬 {commentCount}</span>
        )}
      </div>
    </div>
  )
}
