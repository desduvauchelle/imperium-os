import React from 'react'
import { Button, Badge, Card, CardContent } from '@imperium/ui-shared'
import type { IpcChannel, IpcHandlerMap, SuspensionContext } from '@imperium/shared-types'

// ============================================================================
// Types
// ============================================================================

export type InvokeFn = <C extends IpcChannel>(
	channel: C,
	payload: IpcHandlerMap[C]['request'],
) => Promise<IpcHandlerMap[C]['response']>

export interface SuspendedAgentBannerProps {
	readonly agentId: string
	readonly suspension: SuspensionContext
	readonly invoke?: InvokeFn
	readonly onResolved?: () => void
}

// ============================================================================
// SuspendedAgentBanner
// ============================================================================

export function SuspendedAgentBanner({
	agentId,
	suspension,
	invoke,
	onResolved,
}: SuspendedAgentBannerProps) {
	const ipcInvoke: InvokeFn | undefined = invoke ?? window.electronApi?.invoke

	const handleApprove = async () => {
		if (!ipcInvoke) return
		await ipcInvoke('agent:resume', { agentId, approved: true })
		onResolved?.()
	}

	const handleDeny = async () => {
		if (!ipcInvoke) return
		await ipcInvoke('agent:resume', { agentId, approved: false })
		onResolved?.()
	}

	return (
		<Card className="border-amber-500/50 bg-amber-500/5" data-testid="suspended-banner">
			<CardContent className="flex items-center justify-between py-3 px-4">
				<div className="flex items-center gap-3">
					<Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-300">
						SUSPENDED
					</Badge>
					<div>
						<p className="text-sm font-medium" data-testid="suspension-reason">
							{suspension.reason}
						</p>
						<p className="text-xs text-muted-foreground">
							Action: <span className="font-mono">{suspension.action}</span>
							{suspension.pendingToolCall && (
								<>
									{' · Tool: '}
									<span className="font-mono" data-testid="pending-tool">
										{suspension.pendingToolCall}
									</span>
								</>
							)}
						</p>
					</div>
				</div>

				<div className="flex gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() => void handleDeny()}
						data-testid="deny-btn"
					>
						Deny
					</Button>
					<Button
						size="sm"
						onClick={() => void handleApprove()}
						data-testid="approve-btn"
					>
						Approve
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
