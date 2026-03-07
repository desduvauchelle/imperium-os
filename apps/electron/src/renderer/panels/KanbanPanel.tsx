import React, { useCallback, useEffect, useState } from 'react'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	KanbanBoard,
	KanbanColumn,
	KanbanCard,
	getColumnLabel,
} from '@imperium/ui-shared'
import type { IpcChannel, IpcHandlerMap, KanbanGetBoardResponse } from '@imperium/shared-types'

// ============================================================================
// Types
// ============================================================================

export type InvokeFn = <C extends IpcChannel>(
	channel: C,
	payload: IpcHandlerMap[C]['request'],
) => Promise<IpcHandlerMap[C]['response']>

export interface KanbanPanelProps {
	readonly projectId: string
	readonly invoke?: InvokeFn
}

const COLUMNS = ['todo', 'in-progress', 'review', 'done'] as const

// ============================================================================
// KanbanPanel — Interactive Kanban board with drag & drop
// ============================================================================

export function KanbanPanel({ projectId, invoke }: KanbanPanelProps) {
	const [board, setBoard] = useState<KanbanGetBoardResponse | null>(null)

	const load = useCallback(async () => {
		if (!invoke) return
		const result = await invoke('kanban:get-board', { projectId })
		setBoard(result)
	}, [invoke, projectId])

	useEffect(() => {
		void load()
	}, [load])

	const handleMove = useCallback(
		async (taskId: string, newStatus: string) => {
			if (!invoke) return
			await invoke('kanban:update-task', { taskId, status: newStatus })
			void load()
		},
		[invoke, load],
	)

	if (!board) {
		return <div data-testid="kanban-loading">Loading Kanban board…</div>
	}

	return (
		<Card data-testid="kanban-panel">
			<CardHeader>
				<CardTitle>Kanban Board</CardTitle>
				<CardDescription>{board.taskCount} task(s)</CardDescription>
			</CardHeader>
			<CardContent>
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
										priority={task.priority}
										assignee={task.assignee}
										commentCount={task.commentCount}
									/>
								))}
							</KanbanColumn>
						)
					})}
				</KanbanBoard>
			</CardContent>
		</Card>
	)
}
