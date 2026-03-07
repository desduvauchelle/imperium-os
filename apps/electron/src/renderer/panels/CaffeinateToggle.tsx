import React, { useCallback, useState } from 'react'
import { Button, Card, CardContent } from '@imperium/ui-shared'
import type { IpcChannel, IpcHandlerMap } from '@imperium/shared-types'

// ============================================================================
// Types
// ============================================================================

export type InvokeFn = <C extends IpcChannel>(
	channel: C,
	payload: IpcHandlerMap[C]['request'],
) => Promise<IpcHandlerMap[C]['response']>

export interface CaffeinateToggleProps {
	readonly invoke?: InvokeFn
}

// ============================================================================
// CaffeinateToggle
// ============================================================================

export function CaffeinateToggle({ invoke }: CaffeinateToggleProps) {
	const [enabled, setEnabled] = useState(false)
	const [loading, setLoading] = useState(false)

	const ipcInvoke: InvokeFn | undefined = invoke ?? window.electronApi?.invoke

	const handleToggle = useCallback(async () => {
		if (!ipcInvoke) return
		const newValue = !enabled
		try {
			setLoading(true)
			await ipcInvoke('system:power-mode', { enabled: newValue })
			setEnabled(newValue)
		} catch {
			// Revert on failure
		} finally {
			setLoading(false)
		}
	}, [ipcInvoke, enabled])

	return (
		<Card data-testid="caffeinate-toggle">
			<CardContent className="flex items-center justify-between py-3 px-4">
				<div>
					<p className="text-sm font-medium">Prevent Sleep</p>
					<p className="text-xs text-muted-foreground">
						{enabled ? 'System will stay awake during agent tasks' : 'System may sleep normally'}
					</p>
				</div>
				<Button
					size="sm"
					variant={enabled ? 'default' : 'outline'}
					disabled={loading}
					onClick={() => void handleToggle()}
					data-testid="caffeinate-btn"
				>
					{loading ? '…' : enabled ? 'On' : 'Off'}
				</Button>
			</CardContent>
		</Card>
	)
}
