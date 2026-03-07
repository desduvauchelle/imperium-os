import React, { useCallback, useEffect, useState } from 'react'
import {
	Badge,
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
} from '@imperium/ui-shared'
import type { IpcChannel, IpcHandlerMap, McpListServersResponse } from '@imperium/shared-types'

// ============================================================================
// Types
// ============================================================================

export type InvokeFn = <C extends IpcChannel>(
	channel: C,
	payload: IpcHandlerMap[C]['request'],
) => Promise<IpcHandlerMap[C]['response']>

export interface McpStatusPanelProps {
	readonly invoke?: InvokeFn
}

// ============================================================================
// McpStatusPanel — Shows list of registered MCP servers & their tool counts
// ============================================================================

export function McpStatusPanel({ invoke }: McpStatusPanelProps) {
	const [data, setData] = useState<McpListServersResponse | null>(null)

	const load = useCallback(async () => {
		if (!invoke) return
		const result = await invoke('mcp:list-servers', undefined)
		setData(result)
	}, [invoke])

	useEffect(() => {
		void load()
	}, [load])

	if (!data) {
		return <div data-testid="mcp-status-loading">Loading MCP servers…</div>
	}

	return (
		<Card data-testid="mcp-status-panel">
			<CardHeader>
				<CardTitle>MCP Servers</CardTitle>
				<CardDescription>{data.servers.length} server(s) registered</CardDescription>
			</CardHeader>
			<CardContent>
				<table data-testid="mcp-servers-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Tools</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{data.servers.map((s) => (
							<tr key={s.id} data-testid={`mcp-server-${s.id}`}>
								<td>{s.name}</td>
								<td>{s.toolCount}</td>
								<td>
									<Badge variant={s.enabled ? 'default' : 'secondary'}>
										{s.enabled ? 'enabled' : 'disabled'}
									</Badge>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</CardContent>
		</Card>
	)
}
