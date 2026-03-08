import React, { useCallback, useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/card.js'
import { KanbanBoard } from '../components/kanban-board.js'
import { KanbanColumn, getColumnLabel } from '../components/kanban-column.js'
import { KanbanCard } from '../components/kanban-card.js'
import { useSatellite } from '../satellite/SatelliteContext.js'
import type { KanbanGetBoardResponse } from '@imperium/shared-types'

const COLUMNS = ['todo', 'in-progress', 'review', 'done'] as const

export interface KanbanViewProps {
  /** Project ID to load board for. Defaults to 'default'. */
  readonly projectId?: string
}

export function KanbanView({ projectId = 'default' }: KanbanViewProps) {
  const { invoke } = useSatellite()
  const [board, setBoard] = useState<KanbanGetBoardResponse | null>(null)
  const [error, setError] = useState<string | undefined>(undefined)

  const load = useCallback(async () => {
    try {
      const result = await invoke('kanban:get-board', { projectId })
      setBoard(result)
      setError(undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load board')
    }
  }, [invoke, projectId])

  useEffect(() => { void load() }, [load])

  if (error !== undefined) {
    return (
      <div data-testid="kanban-error" className="text-destructive text-sm">
        {error}
      </div>
    )
  }

  if (!board) {
    return <div data-testid="kanban-loading">Loading Kanban board…</div>
  }

  return (
    <div data-testid="kanban-view" className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Kanban Board</h1>
        <p className="text-sm text-muted-foreground">{board.taskCount} task(s)</p>
      </div>
      <KanbanBoard>
        {COLUMNS.map((status) => {
          const tasks = board.columns[status] ?? []
          return (
            <KanbanColumn
              key={status}
              status={status}
              label={getColumnLabel(status)}
              count={tasks.length}
            >
              {tasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  priority={task.priority as 'low' | 'medium' | 'high' | 'critical'}
                  assignee={task.assignee}
                  commentCount={task.commentCount}
                />
              ))}
            </KanbanColumn>
          )
        })}
      </KanbanBoard>
    </div>
  )
}
