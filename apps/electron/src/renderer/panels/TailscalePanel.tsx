import React, { useCallback, useEffect, useState } from 'react'
import {
	Badge,
	Button,
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
} from '@imperium/ui-shared'
import type { IpcChannel, IpcHandlerMap, TailscaleStatusResponse } from '@imperium/shared-types'

// ============================================================================
// Types
// ============================================================================

export type InvokeFn = <C extends IpcChannel>(
	channel: C,
	payload: IpcHandlerMap[C]['request'],
) => Promise<IpcHandlerMap[C]['response']>

export interface TailscalePanelProps {
	readonly invoke?: InvokeFn
}

// ============================================================================
// TailscalePanel — Tailscale P2P status and control
// ============================================================================

export function TailscalePanel({ invoke }: TailscalePanelProps) {
	const [status, setStatus] = useState<TailscaleStatusResponse | null>(null)
	const [loading, setLoading] = useState(false)

	const load = useCallback(async () => {
		if (!invoke) return
		const result = await invoke('tailscale:status', undefined)
		setStatus(result)
	}, [invoke])

	useEffect(() => {
		void load()
	}, [load])

	const handleUp = useCallback(async () => {
		if (!invoke) return
		setLoading(true)
		await invoke('tailscale:up', undefined)
		await load()
		setLoading(false)
	}, [invoke, load])

	const handleDown = useCallback(async () => {
		if (!invoke) return
		setLoading(true)
		await invoke('tailscale:down', undefined)
		await load()
		setLoading(false)
	}, [invoke, load])

	if (!status) {
		return <div data-testid="tailscale-loading">Loading Tailscale status…</div>
	}

	const isRunning = status.backendState === 'Running'

	return (
		<Card data-testid="tailscale-panel">
			<CardHeader>
				<CardTitle>Tailscale P2P</CardTitle>
				<CardDescription>
					{status.selfHostname} ({status.selfIp})
					{status.tailnet ? ` · ${status.tailnet}` : ''}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="mb-4 flex items-center gap-2">
					<Badge variant={isRunning ? 'default' : 'secondary'} data-testid="tailscale-state">
						{status.backendState}
					</Badge>
					<span className="text-xs text-muted-foreground">v{status.version}</span>
					<div className="ml-auto flex gap-2">
						{!isRunning && (
							<Button
								size="sm"
								onClick={handleUp}
								disabled={loading}
								data-testid="tailscale-up-btn"
							>
								Connect
							</Button>
						)}
						{isRunning && (
							<Button
								size="sm"
								variant="outline"
								onClick={handleDown}
								disabled={loading}
								data-testid="tailscale-down-btn"
							>
								Disconnect
							</Button>
						)}
					</div>
				</div>

				{status.peers.length === 0 ? (
					<div data-testid="no-peers">No peers connected</div>
				) : (
					<table data-testid="tailscale-peers-table">
						<thead>
							<tr>
								<th>Hostname</th>
								<th>IP</th>
								<th>OS</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{status.peers.map((peer) => (
								<tr key={peer.id} data-testid={`peer-${peer.id}`}>
									<td>{peer.hostname}</td>
									<td>{peer.ipv4}</td>
									<td>{peer.os}</td>
									<td>
										<Badge variant={peer.online ? 'default' : 'secondary'}>
											{peer.online ? 'online' : 'offline'}
										</Badge>
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
