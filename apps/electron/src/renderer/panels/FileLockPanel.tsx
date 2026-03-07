import React, { useCallback, useEffect, useState } from 'react'
import {
	Button,
	Badge,
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
} from '@imperium/ui-shared'
import type { IpcChannel, IpcHandlerMap, McpGetLocksResponse } from '@imperium/shared-types'

// ============================================================================
// Types
// ============================================================================

export type InvokeFn = <C extends IpcChannel>(
	channel: C,
	payload: IpcHandlerMap[C]['request'],
) => Promise<IpcHandlerMap[C]['response']>

export interface FileLockPanelProps {
	readonly invoke?: InvokeFn
}

// ============================================================================
// FileLockPanel — Shows active file locks with release action
// ============================================================================

export function FileLockPanel({ invoke }: FileLockPanelProps) {
	const [data, setData] = useState<McpGetLocksResponse | null>(null)

	const load = useCallback(async () => {
		if (!invoke) return
		const result = await invoke('mcp:get-locks', undefined)
		setData(result)
	}, [invoke])

	useEffect(() => {
		void load()
	}, [load])

	const handleRelease = useCallback(
		async (path: string, ownerId: string) => {
			if (!invoke) return
			await invoke('mcp:release-lock', { path, ownerId })
			void load()
		},
		[invoke, load],
	)

	if (!data) {
		return <div data-testid="file-locks-loading">Loading file locks…</div>
	}

	return (
		<Card data-testid="file-locks-panel">
			<CardHeader>
				<CardTitle>File Locks</CardTitle>
				<CardDescription>{data.locks.length} active lock(s)</CardDescription>
			</CardHeader>
			<CardContent>
				{data.locks.length === 0 ? (
					<div data-testid="no-locks">No active locks</div>
				) : (
					<table data-testid="file-locks-table">
						<thead>
							<tr>
								<th>Path</th>
								<th>Owner</th>
								<th>Expires</th>
								<th>Action</th>
							</tr>
						</thead>
						<tbody>
							{data.locks.map((lock) => (
								<tr key={lock.path} data-testid={`lock-${lock.path}`}>
									<td>{lock.path}</td>
									<td>{lock.ownerId}</td>
									<td>{new Date(lock.expiresAt as unknown as string).toLocaleTimeString()}</td>
									<td>
										<Button
											data-testid={`release-${lock.path}`}
											variant="destructive"
											onClick={() => void handleRelease(lock.path, lock.ownerId)}
										>
											Release
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</CardContent>
		</Card>
	)
}
