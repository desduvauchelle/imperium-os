import * as React from 'react'
import { Badge } from './badge.js'
import { Button } from './button.js'
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
  /** Whether the assignee is 'ai' or 'human' */
  readonly assigneeType?: 'ai' | 'human' | undefined
  /** Called when the Launch button is clicked (only shown for ai-assigned cards) */
  readonly onLaunch?: (() => void) | undefined
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
  assigneeType,
  onLaunch,
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
        <div className="flex items-center gap-1.5">
          {assignee ? (
            <span data-testid="kanban-card-assignee">{assignee}</span>
          ) : (
            <span>Unassigned</span>
          )}
          {assigneeType === 'ai' && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal" data-testid="kanban-card-ai-badge">
              AI
            </Badge>
          )}
          {assigneeType === 'human' && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal" data-testid="kanban-card-human-badge">
              Human
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {commentCount > 0 && (
            <span data-testid="kanban-card-comments">💬 {commentCount}</span>
          )}
          {assigneeType === 'ai' && onLaunch && (
            <Button
              size="sm"
              variant="default"
              className="h-5 px-2 text-[10px]"
              data-testid="kanban-card-launch-btn"
              onClick={(e) => { e.stopPropagation(); onLaunch() }}
            >
              Launch
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
