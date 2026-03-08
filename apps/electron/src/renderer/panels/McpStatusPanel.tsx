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
		<div data-testid="mcp-status-panel" className="bg-background">
			<div className="mb-4">
				<h3 className="text-lg font-semibold">MCP Servers</h3>
				<p className="text-sm text-muted-foreground">{data.servers.length} server(s) registered</p>
			</div>
			<div className="overflow-auto border rounded-md">
				<table data-testid="mcp-servers-table" className="w-full text-sm text-left">
					<thead className="bg-muted bg-opacity-50">
						<tr>
							<th className="px-4 py-2 font-medium">Name</th>
							<th className="px-4 py-2 font-medium">Tools</th>
							<th className="px-4 py-2 font-medium">Status</th>
						</tr>
					</thead>
					<tbody className="divide-y">
						{data.servers.map((s) => (
							<tr key={s.id} data-testid={`mcp-server-${s.id}`} className="hover:bg-muted/10">
								<td className="px-4 py-3">{s.name}</td>
								<td className="px-4 py-3">{s.toolCount}</td>
								<td className="px-4 py-3">
									<Badge variant={s.enabled ? 'default' : 'secondary'}>
										{s.enabled ? 'enabled' : 'disabled'}
									</Badge>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
