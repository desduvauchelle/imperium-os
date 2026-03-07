import React, { useCallback, useEffect, useState } from 'react'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	SpendBar,
	CostTag,
} from '@imperium/ui-shared'
import type {
	IpcChannel,
	IpcHandlerMap,
	CostingGetSummaryResponse,
	CostingGetEntriesResponse,
} from '@imperium/shared-types'

// ============================================================================
// Types
// ============================================================================

export type InvokeFn = <C extends IpcChannel>(
	channel: C,
	payload: IpcHandlerMap[C]['request'],
) => Promise<IpcHandlerMap[C]['response']>

export interface CostingDashboardProps {
	/** Budget limit in USD for the spend bar */
	readonly budgetLimit?: number | undefined
	readonly invoke?: InvokeFn
}

// ============================================================================
// CostingDashboard — Shows cost summary + recent entries
// ============================================================================

export function CostingDashboard({ budgetLimit = 10, invoke }: CostingDashboardProps) {
	const [summary, setSummary] = useState<CostingGetSummaryResponse | null>(null)
	const [entries, setEntries] = useState<CostingGetEntriesResponse | null>(null)

	const load = useCallback(async () => {
		if (!invoke) return
		const [summaryResult, entriesResult] = await Promise.all([
			invoke('costing:get-summary', {}),
			invoke('costing:get-entries', { limit: 10 }),
		])
		setSummary(summaryResult)
		setEntries(entriesResult)
	}, [invoke])

	useEffect(() => {
		void load()
	}, [load])

	if (!summary) {
		return <div data-testid="costing-loading">Loading cost data…</div>
	}

	const modelEntries = Object.values(summary.entriesByModel)

	return (
		<Card data-testid="costing-dashboard">
			<CardHeader>
				<CardTitle>Costing Dashboard</CardTitle>
				<CardDescription>
					{summary.totalInputTokens + summary.totalOutputTokens} total tokens
				</CardDescription>
			</CardHeader>
			<CardContent>
				<SpendBar
					currentSpend={summary.totalCostUsd}
					budgetLimit={budgetLimit}
					label="Total Spend"
				/>

				{modelEntries.length > 0 && (
					<div className="mt-4" data-testid="costing-by-model">
						<h4 className="mb-2 text-sm font-semibold">By Model</h4>
						<div className="space-y-1">
							{modelEntries.map((m) => (
								<div key={m.model} className="flex items-center justify-between text-sm" data-testid={`cost-model-${m.model}`}>
									<CostTag model={m.model} costUsd={m.totalCostUsd} />
									<span className="text-xs text-muted-foreground">
										{m.callCount} call(s)
									</span>
								</div>
							))}
						</div>
					</div>
				)}

				{entries && entries.entries.length > 0 && (
					<div className="mt-4" data-testid="costing-recent">
						<h4 className="mb-2 text-sm font-semibold">Recent Entries</h4>
						<table className="w-full text-xs">
							<thead>
								<tr>
									<th className="text-left">Model</th>
									<th className="text-right">Cost</th>
									<th className="text-right">Tokens</th>
								</tr>
							</thead>
							<tbody>
								{entries.entries.map((e, i) => (
									<tr key={i} data-testid={`cost-entry-${i}`}>
										<td>{e.model}</td>
										<td className="text-right">${e.costUsd.toFixed(4)}</td>
										<td className="text-right">{e.inputTokens + e.outputTokens}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
