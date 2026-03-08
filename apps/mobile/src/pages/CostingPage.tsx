import React, { useCallback, useEffect, useState } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	SpendBar,
	formatUsd,
	CostTag,
	useSatellite,
} from '@imperium/ui-shared'
import type { CostingGetSummaryResponse, CostingGetEntriesResponse } from '@imperium/shared-types'

const DEFAULT_BUDGET = 10

export function CostingPage() {
	const { invoke } = useSatellite()
	const [summary, setSummary] = useState<CostingGetSummaryResponse | null>(null)
	const [entries, setEntries] = useState<CostingGetEntriesResponse | null>(null)

	const load = useCallback(async () => {
		const [s, e] = await Promise.all([
			invoke('costing:get-summary', {}),
			invoke('costing:get-entries', { limit: 10 }),
		])
		setSummary(s)
		setEntries(e)
	}, [invoke])

	useEffect(() => { void load() }, [load])

	if (!summary || !entries) {
		return <div data-testid="costing-loading">Loading cost data…</div>
	}

	const models = Object.values(summary.entriesByModel)

	return (
		<div data-testid="costing-page" className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold">Costing Dashboard</h1>
				<p className="text-sm text-muted-foreground">
					Total: {formatUsd(summary.totalCostUsd)}
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Spend vs Budget</CardTitle>
				</CardHeader>
				<CardContent>
					<SpendBar
						currentSpend={summary.totalCostUsd}
						budgetLimit={DEFAULT_BUDGET}
						label="Monthly spend"
					/>
				</CardContent>
			</Card>

			{models.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>By Model</CardTitle>
						<CardDescription>{models.length} model(s)</CardDescription>
					</CardHeader>
					<CardContent>
						<table data-testid="cost-by-model" className="w-full text-sm">
							<thead>
								<tr className="border-b">
									<th className="text-left pb-2">Model</th>
									<th className="text-right pb-2">Calls</th>
									<th className="text-right pb-2">Cost</th>
								</tr>
							</thead>
							<tbody>
								{models.map((m) => (
									<tr key={m.model} className="border-b last:border-0">
										<td className="py-1.5">
											<CostTag model={m.model} costUsd={m.totalCostUsd} />
										</td>
										<td className="text-right py-1.5">{m.callCount}</td>
										<td className="text-right py-1.5">{formatUsd(m.totalCostUsd)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</CardContent>
				</Card>
			)}

			{entries.entries.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Recent Entries</CardTitle>
					</CardHeader>
					<CardContent>
						<table data-testid="cost-entries" className="w-full text-sm">
							<thead>
								<tr className="border-b">
									<th className="text-left pb-2">Model</th>
									<th className="text-right pb-2">In</th>
									<th className="text-right pb-2">Out</th>
									<th className="text-right pb-2">Cost</th>
								</tr>
							</thead>
							<tbody>
								{entries.entries.map((e, i) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: entries have no unique id on response
									<tr key={i} className="border-b last:border-0">
										<td className="py-1.5">{e.model}</td>
										<td className="text-right py-1.5">{e.inputTokens}</td>
										<td className="text-right py-1.5">{e.outputTokens}</td>
										<td className="text-right py-1.5">{formatUsd(e.costUsd)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
