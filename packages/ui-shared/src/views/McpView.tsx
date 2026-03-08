import React, { useCallback, useEffect, useState } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../components/card.js'
import { Badge } from '../components/badge.js'
import { Button } from '../components/button.js'
import { useSatellite } from '../satellite/SatelliteContext.js'
import type { McpListServersResponse, McpGetLocksResponse } from '@imperium/shared-types'

export function McpView() {
	const { invoke } = useSatellite()
	const [servers, setServers] = useState<McpListServersResponse | null>(null)
	const [locks, setLocks] = useState<McpGetLocksResponse | null>(null)

	const load = useCallback(async () => {
		const [s, l] = await Promise.all([
			invoke('mcp:list-servers', undefined as unknown as void),
			invoke('mcp:get-locks', undefined as unknown as void),
		])
		setServers(s)
		setLocks(l)
	}, [invoke])

	useEffect(() => { void load() }, [load])

	if (!servers || !locks) {
		return <div data-testid="mcp-loading">Loading MCP status…</div>
	}

	return (
		<div data-testid="mcp-view" className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold">MCP Servers</h1>
				<p className="text-sm text-muted-foreground">{servers.servers.length} server(s) registered</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Registered Servers</CardTitle>
				</CardHeader>
				<CardContent>
					{servers.servers.length === 0 ? (
						<p className="text-sm text-muted-foreground">No servers registered</p>
					) : (
						<table data-testid="mcp-servers" className="w-full text-sm">
							<thead>
								<tr className="border-b">
									<th className="text-left pb-2">Server</th>
									<th className="text-right pb-2">Tools</th>
									<th className="text-right pb-2">Status</th>
								</tr>
							</thead>
							<tbody>
								{servers.servers.map((s) => (
									<tr key={s.id} className="border-b last:border-0">
										<td className="py-1.5">
											<div className="font-medium">{s.name}</div>
											<div className="text-xs text-muted-foreground">{s.description}</div>
										</td>
										<td className="text-right py-1.5">{s.toolCount}</td>
										<td className="text-right py-1.5">
											<Badge variant={s.enabled ? 'default' : 'secondary'}>
												{s.enabled ? 'Active' : 'Disabled'}
											</Badge>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>File Locks</CardTitle>
					<CardDescription>{locks.locks.length} active lock(s)</CardDescription>
				</CardHeader>
				<CardContent>
					{locks.locks.length === 0 ? (
						<p data-testid="no-locks" className="text-sm text-muted-foreground">No active locks</p>
					) : (
						<table data-testid="file-locks" className="w-full text-sm font-mono">
							<thead>
								<tr className="border-b">
									<th className="text-left pb-2">Path</th>
									<th className="text-left pb-2">Owner</th>
								</tr>
							</thead>
							<tbody>
								{locks.locks.map((lock) => (
									<tr key={lock.path} className="border-b last:border-0">
										<td className="py-1.5 text-xs">{lock.path}</td>
										<td className="py-1.5 text-xs text-muted-foreground">{lock.ownerId}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
