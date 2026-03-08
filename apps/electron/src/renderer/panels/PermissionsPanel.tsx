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
import type { IpcChannel, IpcHandlerMap, PermissionsProfileResponse } from '@imperium/shared-types'

// ============================================================================
// Types
// ============================================================================

export type InvokeFn = <C extends IpcChannel>(
	channel: C,
	payload: IpcHandlerMap[C]['request'],
) => Promise<IpcHandlerMap[C]['response']>

export interface PermissionsPanelProps {
	readonly invoke?: InvokeFn
}

const LEVEL_OPTIONS = [
	{ value: 'mad-max', label: 'Mad Max', description: 'Full autonomy — no restrictions' },
	{ value: 'praetorian', label: 'Praetorian', description: 'Balanced safeguarding' },
	{ value: 'imperator', label: 'Imperator', description: 'Total lockdown' },
] as const

const VERDICT_COLORS: Record<string, 'default' | 'secondary' | 'destructive'> = {
	allow: 'default',
	prompt: 'secondary',
	deny: 'destructive',
}

// ============================================================================
// PermissionsPanel
// ============================================================================

export function PermissionsPanel({ invoke }: PermissionsPanelProps) {
	const [profile, setProfile] = useState<PermissionsProfileResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const ipcInvoke: InvokeFn | undefined = invoke ?? window.electronApi?.invoke

	const loadProfile = useCallback(async () => {
		if (!ipcInvoke) {
			setError('IPC not available')
			setLoading(false)
			return
		}
		try {
			setLoading(true)
			const response = await ipcInvoke('permissions:get-profile', undefined as void)
			setProfile(response)
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Failed to load profile')
		} finally {
			setLoading(false)
		}
	}, [ipcInvoke])

	useEffect(() => {
		void loadProfile()
	}, [loadProfile])

	const handleLevelChange = useCallback(
		async (level: string) => {
			if (!ipcInvoke) return
			try {
				await ipcInvoke('permissions:set-level', { level })
				await loadProfile()
			} catch (e) {
				setError(e instanceof Error ? e.message : 'Failed to set level')
			}
		},
		[ipcInvoke, loadProfile],
	)

	if (loading && !profile) {
		return (
			<Card data-testid="permissions-panel">
				<CardContent className="py-4">
					<p className="text-muted-foreground" data-testid="permissions-loading">
						Loading permissions…
					</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card data-testid="permissions-panel">
			<CardHeader>
				<CardTitle>Permissions</CardTitle>
				<CardDescription>
					{profile ? profile.description : 'Configure agent comfort level'}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{error && (
					<div className="text-sm text-destructive bg-destructive/10 rounded p-2" data-testid="permissions-error">
						{error}
					</div>
				)}

				{/* Level Selector */}
				<div className="flex flex-col gap-4" data-testid="level-selector">
					{LEVEL_OPTIONS.map((opt) => (
						<Button
							key={opt.value}
							variant={profile?.level === opt.value ? 'default' : 'outline'}
							size="lg"
							className="h-auto flex-col items-start p-4 text-left"
							onClick={() => void handleLevelChange(opt.value)}
							data-testid={`level-${opt.value}`}
						>
							<div className="font-semibold">{opt.label}</div>
							<div className="text-xs text-muted-foreground font-normal mt-1">{opt.description}</div>
						</Button>
					))}
				</div>

				{/* Verdicts Table */}
				{profile?.permissions && (
					<div className="space-y-1" data-testid="verdicts-table">
						{Object.entries(profile.permissions).map(([action, verdict]) => (
							<div key={action} className="flex items-center justify-between py-1.5">
								<span className="text-sm font-mono">{action}</span>
								<Badge
									variant={VERDICT_COLORS[verdict] ?? 'secondary'}
									data-testid={`verdict-${action}`}
								>
									{verdict}
								</Badge>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
