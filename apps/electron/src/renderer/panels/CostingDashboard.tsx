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
		<div data-testid="costing-dashboard" className="w-full h-full overflow-auto p-8 space-y-6">
			<div>
				<p className="text-sm text-muted-foreground mb-4">
					{summary.totalInputTokens + summary.totalOutputTokens} total tokens
				</p>
				<SpendBar
					currentSpend={summary.totalCostUsd}
					budgetLimit={budgetLimit}
					label="Total Spend"
				/>
			</div>

			{modelEntries.length > 0 && (
				<div data-testid="costing-by-model">
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
				<div data-testid="costing-recent" className="flex-1 overflow-auto">
					<h4 className="mb-2 text-sm font-semibold sticky top-0 bg-background py-1">Recent Entries</h4>
					<table className="w-full text-xs">
						<thead>
							<tr>
								<th className="text-left font-medium text-muted-foreground pb-2">Model</th>
								<th className="text-right font-medium text-muted-foreground pb-2">Cost</th>
								<th className="text-right font-medium text-muted-foreground pb-2">Tokens</th>
							</tr>
						</thead>
						<tbody>
							{entries.entries.map((e, i) => (
								<tr key={i} data-testid={`cost-entry-${i}`} className="border-b border-muted/50 last:border-0 hover:bg-muted/20">
									<td className="py-2">{e.model}</td>
									<td className="text-right py-2">${e.costUsd.toFixed(4)}</td>
									<td className="text-right py-2 text-muted-foreground">{e.inputTokens + e.outputTokens}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	)
}
