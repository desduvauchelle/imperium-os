import React, { useEffect, useState } from 'react'
import {
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Button,
	useSatellite,
} from '@imperium/ui-shared'
import type { SatellitePushEvent } from '@imperium/shared-types'

interface SuspendedAgent {
	agentId: string
	reason: string
}

export function AgentPage() {
	const { onPush } = useSatellite()
	const [suspended, setSuspended] = useState<SuspendedAgent[]>([])

	// Listen for agent suspension push events
	useEffect(() => {
		const unsub = onPush((event: SatellitePushEvent) => {
			if (event.type === 'agent:suspended') {
				setSuspended((prev) => {
					const exists = prev.some((a) => a.agentId === event.payload.agentId)
					if (exists) return prev
					return [...prev, { agentId: event.payload.agentId, reason: event.payload.reason }]
				})
			}
		})
		return unsub
	}, [onPush])

	function dismissAgent(agentId: string) {
		setSuspended((prev) => prev.filter((a) => a.agentId !== agentId))
	}

	return (
		<div data-testid="agent-page" className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold">Agents</h1>
				<p className="text-sm text-muted-foreground">
					Real-time agent status and interrupts
				</p>
			</div>

			{suspended.length > 0 && (
				<Card className="border-destructive/50">
					<CardHeader>
						<div className="flex items-center gap-2">
							<CardTitle className="text-destructive">Suspended Agents</CardTitle>
							<Badge variant="destructive">{suspended.length}</Badge>
						</div>
						<CardDescription>
							These agents require your approval to continue.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{suspended.map((agent) => (
							<div
								key={agent.agentId}
								data-testid="suspended-agent"
								className="flex items-start justify-between gap-4 rounded-md border p-3"
							>
								<div className="space-y-0.5">
									<p className="text-sm font-medium font-mono">{agent.agentId}</p>
									<p className="text-xs text-muted-foreground">{agent.reason}</p>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => dismissAgent(agent.agentId)}
								>
									Dismiss
								</Button>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{suspended.length === 0 && (
				<Card>
					<CardContent className="pt-6">
						<p
							data-testid="no-suspended-agents"
							className="text-sm text-muted-foreground text-center py-4"
						>
							No suspended agents. All agents are running normally.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
