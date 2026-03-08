import React, { useCallback, useEffect, useState } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	KanbanBoard,
	KanbanColumn,
	KanbanCard,
	getColumnLabel,
	useSatellite,
} from '@imperium/ui-shared'
import type { KanbanGetBoardResponse } from '@imperium/shared-types'

const DEFAULT_PROJECT = 'default'
const COLUMNS = ['todo', 'in-progress', 'review', 'done'] as const

export function KanbanPage() {
	const { invoke } = useSatellite()
	const [board, setBoard] = useState<KanbanGetBoardResponse | null>(null)
	const [error, setError] = useState<string | undefined>(undefined)

	const load = useCallback(async () => {
		try {
			const result = await invoke('kanban:get-board', { projectId: DEFAULT_PROJECT })
			setBoard(result)
			setError(undefined)
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Failed to load board')
		}
	}, [invoke])

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
		<div data-testid="kanban-page" className="space-y-4">
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
