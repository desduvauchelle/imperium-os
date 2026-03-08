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
		<div data-testid="file-locks-panel" className="bg-background mt-8">
			<div className="mb-4">
				<h3 className="text-lg font-semibold">File Locks</h3>
				<p className="text-sm text-muted-foreground">{data.locks.length} active lock(s)</p>
			</div>
			{data.locks.length === 0 ? (
				<div data-testid="no-locks" className="text-sm text-muted-foreground py-4 border rounded-md px-4">
					No active locks
				</div>
			) : (
				<div className="overflow-auto border rounded-md">
					<table data-testid="file-locks-table" className="w-full text-sm text-left">
						<thead className="bg-muted bg-opacity-50">
							<tr>
								<th className="px-4 py-2 font-medium">Path</th>
								<th className="px-4 py-2 font-medium">Owner</th>
								<th className="px-4 py-2 font-medium">Expires</th>
								<th className="px-4 py-2 font-medium">Action</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{data.locks.map((lock) => (
								<tr key={lock.path} data-testid={`lock-${lock.path}`} className="hover:bg-muted/10">
									<td className="px-4 py-3">{lock.path}</td>
									<td className="px-4 py-3">{lock.ownerId}</td>
									<td className="px-4 py-3 whitespace-nowrap">{new Date(lock.expiresAt as unknown as string).toLocaleTimeString()}</td>
									<td className="px-4 py-3">
										<Button
											data-testid={`release-${lock.path}`}
											variant="destructive"
											size="sm"
											onClick={() => void handleRelease(lock.path, lock.ownerId)}
										>
											Release
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	)
}
