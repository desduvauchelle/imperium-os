import React, { useCallback, useEffect, useState } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../components/card.js'
import { Badge } from '../components/badge.js'
import { useSatellite } from '../satellite/SatelliteContext.js'
import type { TailscaleStatusResponse } from '@imperium/shared-types'

const STATE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
	Running: 'default',
	Starting: 'secondary',
	Stopped: 'destructive',
}

export function TailscaleView() {
	const { invoke } = useSatellite()
	const [status, setStatus] = useState<TailscaleStatusResponse | null>(null)
	const [error, setError] = useState<string | undefined>(undefined)

	const load = useCallback(async () => {
		try {
			const result = await invoke('tailscale:status', undefined as unknown as void)
			setStatus(result)
			setError(undefined)
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Failed to load Tailscale status')
		}
	}, [invoke])

	useEffect(() => { void load() }, [load])

	if (error !== undefined) {
		return (
			<div data-testid="tailscale-error" className="text-destructive text-sm">
				{error}
			</div>
		)
	}

	if (!status) {
		return <div data-testid="tailscale-loading">Loading Tailscale status…</div>
	}

	const variant = STATE_VARIANTS[status.backendState] ?? 'secondary'

	return (
		<div data-testid="tailscale-view" className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold">Network / Tailscale</h1>
				<p className="text-sm text-muted-foreground">v{status.version}</p>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>{status.selfHostname}</CardTitle>
						<Badge variant={variant} data-testid="tailscale-state">
							{status.backendState}
						</Badge>
					</div>
					<CardDescription>{status.selfIp} · {status.tailnet}</CardDescription>
				</CardHeader>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Peers</CardTitle>
					<CardDescription>{status.peers.length} device(s)</CardDescription>
				</CardHeader>
				<CardContent>
					{status.peers.length === 0 ? (
						<p className="text-sm text-muted-foreground">No peers connected</p>
					) : (
						<table data-testid="tailscale-peers" className="w-full text-sm">
							<thead>
								<tr className="border-b">
									<th className="text-left pb-2">Host</th>
									<th className="text-left pb-2">IP</th>
									<th className="text-left pb-2">OS</th>
									<th className="text-left pb-2">Status</th>
								</tr>
							</thead>
							<tbody>
								{status.peers.map((p) => (
									<tr key={p.id} className="border-b last:border-0">
										<td className="py-1.5 font-medium">{p.hostname}</td>
										<td className="py-1.5 font-mono text-xs">{p.ipv4}</td>
										<td className="py-1.5 text-muted-foreground">{p.os}</td>
										<td className="py-1.5">
											<Badge
												variant={p.online ? 'default' : 'secondary'}
												data-testid="peer-status"
											>
												{p.online ? 'Online' : 'Offline'}
											</Badge>
										</td>
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
