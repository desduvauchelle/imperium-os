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
import type { TailscaleStatusResponse } from '@imperium/shared-types'

const SATELLITE_PORT = 9100

// ─── helpers ────────────────────────────────────────────────────────────────

function remoteUrl(ip: string) {
	return `http://${ip}:${SATELLITE_PORT}`
}

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false)
	const copy = () => {
		void navigator.clipboard.writeText(text).then(() => {
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		})
	}
	return (
		<button
			type="button"
			onClick={copy}
			className="ml-2 rounded px-1.5 py-0.5 text-xs border border-input bg-background hover:bg-accent transition-colors"
			title="Copy to clipboard"
		>
			{copied ? '✓ copied' : 'copy'}
		</button>
	)
}

// ─── setup guide shown when tailscale is not running / not installed ─────────

function SetupGuide() {
	return (
		<Card className="border-dashed">
			<CardHeader>
				<CardTitle className="text-base">Tailscale is not running</CardTitle>
				<CardDescription>
					Tailscale must be installed and running on this machine before remote access
					or brain-sharing works.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 text-sm">
				<ol className="list-decimal list-inside space-y-2 text-muted-foreground leading-relaxed">
					<li>
						Download and install Tailscale from{' '}
						<a
							href="https://tailscale.com/download"
							target="_blank"
							rel="noreferrer"
							className="text-primary underline underline-offset-2"
						>
							tailscale.com/download
						</a>
					</li>
					<li>Sign in with a Google, GitHub, or Microsoft account to create your tailnet.</li>
					<li>
						Approve this machine in the{' '}
						<a
							href="https://login.tailscale.com/admin/machines"
							target="_blank"
							rel="noreferrer"
							className="text-primary underline underline-offset-2"
						>
							Tailscale admin console
						</a>
						.
					</li>
					<li>Return here — the status will update automatically once Tailscale is running.</li>
				</ol>

				<div className="rounded border border-input bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
					# macOS quick-install via Homebrew<br />
					brew install --cask tailscale
				</div>
			</CardContent>
		</Card>
	)
}

// ─── main view ──────────────────────────────────────────────────────────────

export function TailscaleView() {
	const { invoke } = useSatellite()
	const [status, setStatus] = useState<TailscaleStatusResponse | null>(null)
	const [error, setError] = useState<string | undefined>(undefined)
	const [actionBusy, setActionBusy] = useState(false)

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

	// Poll every 10 s so the UI stays current without manual refresh
	useEffect(() => {
		const id = setInterval(() => { void load() }, 10_000)
		return () => clearInterval(id)
	}, [load])

	const handleConnect = async () => {
		setActionBusy(true)
		try {
			await invoke('tailscale:up', undefined as unknown as void)
			await load()
		} catch { /* ignore */ }
		setActionBusy(false)
	}

	const handleDisconnect = async () => {
		setActionBusy(true)
		try {
			await invoke('tailscale:down', undefined as unknown as void)
			await load()
		} catch { /* ignore */ }
		setActionBusy(false)
	}

	// ── loading / error states ──────────────────────────────────────────────

	if (error !== undefined) {
		const notInstalled =
			error.toLowerCase().includes('not found') ||
			error.toLowerCase().includes('no such file') ||
			error.toLowerCase().includes('enoent')

		return (
			<div data-testid="tailscale-error" className="space-y-6">
				<PageHeader />
				{notInstalled ? (
					<SetupGuide />
				) : (
					<Card className="border-destructive/50">
						<CardHeader>
							<CardTitle className="text-base text-destructive">Could not reach Tailscale</CardTitle>
							<CardDescription className="font-mono text-xs">{error}</CardDescription>
						</CardHeader>
						<CardContent>
							<Button size="sm" variant="outline" onClick={() => void load()}>
								Retry
							</Button>
						</CardContent>
					</Card>
				)}
			</div>
		)
	}

	if (!status) {
		return (
			<div data-testid="tailscale-loading" className="space-y-4">
				<PageHeader />
				<p className="text-sm text-muted-foreground animate-pulse">Checking Tailscale status…</p>
			</div>
		)
	}

	// ── connected view ──────────────────────────────────────────────────────

	const isRunning = status.backendState === 'Running'
	const needsLogin = status.backendState === 'NeedsLogin'
	const url = remoteUrl(status.selfIp)

	const stateBadgeVariant =
		isRunning ? 'default'
			: status.backendState === 'Stopped' ? 'destructive'
				: 'secondary'

	return (
		<div data-testid="tailscale-view" className="space-y-5">
			{/* ── Header ─────────────────────────────────────────────────────── */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-xl font-semibold">Remote Access &amp; Brain Sharing</h1>
					<p className="mt-0.5 text-sm text-muted-foreground">
						Tailscale gives this Imperium node a private IP that works from anywhere in the
						world — no port-forwarding required. Share that IP with others so they can connect
						their own Imperium instance to yours and share context, projects, and agent memory.
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Badge variant={stateBadgeVariant} data-testid="tailscale-state" className="text-xs">
						{status.backendState}
					</Badge>
					<span className="text-xs text-muted-foreground font-mono">v{status.version}</span>
				</div>
			</div>

			{/* ── Not-running notice ─────────────────────────────────────────── */}
			{!isRunning && !needsLogin && (
				<Card className="border-amber-500/40 bg-amber-500/5">
					<CardHeader className="py-3">
						<CardTitle className="text-sm text-amber-600 dark:text-amber-400">
							Tailscale is {status.backendState}
						</CardTitle>
						<CardDescription className="text-xs">
							Connect to get a private IP and enable remote access.
						</CardDescription>
					</CardHeader>
					<CardContent className="pb-3">
						<Button
							size="sm"
							onClick={() => void handleConnect()}
							disabled={actionBusy}
							data-testid="tailscale-up-btn"
						>
							{actionBusy ? 'Connecting…' : 'Connect'}
						</Button>
					</CardContent>
				</Card>
			)}

			{needsLogin && (
				<Card className="border-destructive/40 bg-destructive/5">
					<CardHeader className="py-3">
						<CardTitle className="text-sm text-destructive">Login required</CardTitle>
						<CardDescription className="text-xs">
							Run <code className="font-mono">tailscale login</code> in a terminal, or open the
							Tailscale menu-bar app to authenticate.
						</CardDescription>
					</CardHeader>
				</Card>
			)}

			{/* ── This node card ─────────────────────────────────────────────── */}
			{isRunning && (
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-base">{status.selfHostname}</CardTitle>
							<Button
								size="sm"
								variant="outline"
								onClick={() => void handleDisconnect()}
								disabled={actionBusy}
								data-testid="tailscale-down-btn"
							>
								{actionBusy ? 'Disconnecting…' : 'Disconnect'}
							</Button>
						</div>
						<CardDescription className="font-mono text-xs">{status.tailnet}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 pt-0">

						{/* Tailscale IP */}
						<div className="rounded border border-input bg-muted/40 px-3 py-2">
							<p className="mb-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">
								Tailscale IP
							</p>
							<div className="flex items-center gap-1">
								<span className="font-mono text-sm">{status.selfIp}</span>
								<CopyButton text={status.selfIp} />
							</div>
						</div>

						{/* Remote access URL */}
						<div className="rounded border border-input bg-muted/40 px-3 py-2">
							<p className="mb-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">
								Remote Satellite URL
							</p>
							<div className="flex items-center gap-1">
								<span className="font-mono text-sm break-all">{url}</span>
								<CopyButton text={url} />
							</div>
							<p className="mt-1.5 text-xs text-muted-foreground">
								Anyone on your tailnet can open this URL to access Imperium remotely.
								Share it with a trusted person — they add it as a Satellite in their
								own Imperium instance to join this brain.
							</p>
						</div>

						{/* How to join instructions */}
						<details className="group text-xs text-muted-foreground">
							<summary className="cursor-pointer select-none list-none flex items-center gap-1 text-primary hover:underline underline-offset-2">
								<span className="transition-transform group-open:rotate-90">▶</span>
								How to invite someone to join this brain
							</summary>
							<ol className="mt-2 list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
								<li>They install Tailscale and sign in to the same tailnet (or you share via{' '}
									<a href="https://tailscale.com/kb/1081/macos-share" target="_blank" rel="noreferrer"
										className="text-primary underline underline-offset-2">Tailscale Share</a>).
								</li>
								<li>
									Send them the Remote Satellite URL above:{' '}
									<span className="font-mono bg-muted rounded px-1">{url}</span>
								</li>
								<li>In their Imperium, they open Settings → Connections → Add Satellite and paste that URL.</li>
								<li>Their agents can now read and share context with this node.</li>
							</ol>
						</details>
					</CardContent>
				</Card>
			)}

			{/* ── Peers ──────────────────────────────────────────────────────── */}
			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<CardTitle className="text-base">Nodes on Your Tailnet</CardTitle>
						<span className="text-xs text-muted-foreground">{status.peers.length} peer(s)</span>
					</div>
					<CardDescription className="text-xs">
						Other machines sharing the same Tailscale network. Imperium peers can be added as
						remote Satellites for cross-brain collaboration.
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-0">
					{status.peers.length === 0 ? (
						<p className="text-sm text-muted-foreground py-2">
							No peers yet — invite others to your tailnet or accept their share request.
						</p>
					) : (
						<table data-testid="tailscale-peers" className="w-full text-sm">
							<thead>
								<tr className="border-b text-xs text-muted-foreground">
									<th className="text-left py-1.5 font-medium">Host</th>
									<th className="text-left py-1.5 font-medium">IP</th>
									<th className="text-left py-1.5 font-medium">OS</th>
									<th className="text-left py-1.5 font-medium">Status</th>
									<th className="py-1.5" />
								</tr>
							</thead>
							<tbody>
								{status.peers.map((p) => (
									<tr key={p.id} className="border-b last:border-0 align-middle">
										<td className="py-1.5 font-medium">{p.hostname}</td>
										<td className="py-1.5 font-mono text-xs text-muted-foreground">{p.ipv4}</td>
										<td className="py-1.5 text-xs text-muted-foreground">{p.os}</td>
										<td className="py-1.5">
											<Badge
												variant={p.online ? 'default' : 'secondary'}
												data-testid="peer-status"
												className="text-xs"
											>
												{p.online ? 'Online' : 'Offline'}
											</Badge>
										</td>
										<td className="py-1 text-right">
											{p.online && (
												<CopyButton text={remoteUrl(p.ipv4)} />
											)}
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

// ─── shared page header used in loading/error states ────────────────────────

function PageHeader() {
	return (
		<div>
			<h1 className="text-xl font-semibold">Remote Access &amp; Brain Sharing</h1>
			<p className="mt-0.5 text-sm text-muted-foreground">
				Powered by Tailscale — connect to this node from anywhere, or invite others to join your Imperium network.
			</p>
		</div>
	)
}
