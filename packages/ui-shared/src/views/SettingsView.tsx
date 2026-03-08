import React, { useState } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../components/card.js'
import { Button } from '../components/button.js'
import { Badge } from '../components/badge.js'
import {
	loadSatelliteConfig,
	saveSatelliteConfig,
	clearSatelliteConfig,
} from '../satellite/SatelliteConfigModal.js'
import type { SatelliteConfig } from '../satellite/SatelliteConfigModal.js'

export interface SettingsViewProps {
	readonly onSave: (config: SatelliteConfig) => void
}

export function SettingsView({ onSave }: SettingsViewProps) {
	const existing = loadSatelliteConfig()
	const [masterUrl, setMasterUrl] = useState(existing?.masterUrl ?? '')
	const [token, setToken] = useState(existing?.token ?? '')
	const [error, setError] = useState<string | undefined>(undefined)
	const [saved, setSaved] = useState(false)

	function handleSave(e: React.FormEvent) {
		e.preventDefault()
		const trimmedUrl = masterUrl.trim()
		const trimmedToken = token.trim()

		if (!trimmedUrl) { setError('Master URL is required'); return }
		if (!trimmedToken) { setError('Token is required'); return }

		try {
			new URL(trimmedUrl)
		} catch {
			setError('Master URL must be a valid URL')
			return
		}

		setError(undefined)
		const config: SatelliteConfig = { masterUrl: trimmedUrl, token: trimmedToken }
		saveSatelliteConfig(config)
		onSave(config)
		setSaved(true)
	}

	function handleDisconnect() {
		clearSatelliteConfig()
		onSave({ masterUrl: '', token: '' })
	}

	return (
		<div data-testid="settings-view" className="space-y-6 max-w-lg">
			<div>
				<h1 className="text-xl font-semibold">Settings</h1>
				<p className="text-sm text-muted-foreground">Manage your Master connection</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Master Connection</CardTitle>
					<CardDescription>Update the Master node URL and access token.</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSave} className="space-y-4">
						<div className="space-y-1">
							<label htmlFor="settings-url" className="text-sm font-medium">
								Master URL
							</label>
							<input
								id="settings-url"
								data-testid="settings-url-input"
								type="url"
								placeholder="http://100.64.0.1:9100"
								value={masterUrl}
								onChange={(e) => { setMasterUrl(e.target.value); setSaved(false) }}
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							/>
						</div>
						<div className="space-y-1">
							<label htmlFor="settings-token" className="text-sm font-medium">
								Access Token
							</label>
							<input
								id="settings-token"
								data-testid="settings-token-input"
								type="password"
								placeholder="Paste your access token"
								value={token}
								onChange={(e) => { setToken(e.target.value); setSaved(false) }}
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							/>
						</div>
						{error !== undefined && (
							<p data-testid="settings-error" className="text-sm text-destructive">{error}</p>
						)}
						<div className="flex gap-2 items-center">
							<Button type="submit" data-testid="settings-save-btn">
								Save
							</Button>
							{saved && (
								<Badge variant="default" data-testid="settings-saved-badge">
									Saved
								</Badge>
							)}
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Disconnect</CardTitle>
					<CardDescription>Clear all stored connection settings.</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant="destructive"
						onClick={handleDisconnect}
						data-testid="settings-disconnect-btn"
					>
						Disconnect from Master
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
