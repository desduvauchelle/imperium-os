import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card.js'
import { Button } from '../components/button.js'

// ============================================================================
// Config type + localStorage persistence
// ============================================================================

export interface SatelliteConfig {
	readonly masterUrl: string
	readonly token: string
}

const STORAGE_KEY = 'imperium:satellite-config'

/**
 * Load the satellite config from localStorage.
 * Returns undefined if not set or invalid.
 */
export function loadSatelliteConfig(): SatelliteConfig | undefined {
	try {
		const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
		if (!raw) return undefined
		const parsed = JSON.parse(raw) as unknown
		if (
			typeof parsed === 'object' &&
			parsed !== null &&
			'masterUrl' in parsed &&
			'token' in parsed &&
			typeof (parsed as Record<string, unknown>)['masterUrl'] === 'string' &&
			typeof (parsed as Record<string, unknown>)['token'] === 'string'
		) {
			return parsed as SatelliteConfig
		}
		return undefined
	} catch {
		return undefined
	}
}

/**
 * Persist the satellite config to localStorage.
 */
export function saveSatelliteConfig(config: SatelliteConfig): void {
	globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(config))
}

/**
 * Clear the satellite config from localStorage.
 */
export function clearSatelliteConfig(): void {
	globalThis.localStorage?.removeItem(STORAGE_KEY)
}

// ============================================================================
// SatelliteConfigModal
// ============================================================================

export interface SatelliteConfigModalProps {
	/** Called once the user saves a valid configuration */
	readonly onSave: (config: SatelliteConfig) => void
	/** Pre-fill the form with an existing config */
	readonly initialConfig?: SatelliteConfig | undefined
}

/**
 * Full-screen modal prompting the user to enter the Master URL and token.
 * Intended to be shown when no config exists yet or on the Settings page.
 */
export function SatelliteConfigModal({ onSave, initialConfig }: SatelliteConfigModalProps) {
	const [masterUrl, setMasterUrl] = useState(initialConfig?.masterUrl ?? 'http://100.64.0.1:9100')
	const [token, setToken] = useState(initialConfig?.token ?? '')
	const [error, setError] = useState<string | undefined>(undefined)

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		const trimmedUrl = masterUrl.trim()
		const trimmedToken = token.trim()

		if (!trimmedUrl) {
			setError('Master URL is required')
			return
		}
		if (!trimmedToken) {
			setError('Token is required')
			return
		}

		try {
			new URL(trimmedUrl)
		} catch {
			setError('Master URL must be a valid URL (e.g. http://100.64.0.1:9100)')
			return
		}

		setError(undefined)
		const config: SatelliteConfig = { masterUrl: trimmedUrl, token: trimmedToken }
		saveSatelliteConfig(config)
		onSave(config)
	}

	return (
		<div
			data-testid="satellite-config-modal"
			className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
		>
			<Card className="w-full max-w-md mx-4">
				<CardHeader>
					<CardTitle>Connect to Master</CardTitle>
					<CardDescription>
						Enter the Imperium Master node URL and your access token to connect.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-1">
							<label
								htmlFor="master-url"
								className="text-sm font-medium"
							>
								Master URL
							</label>
							<input
								id="master-url"
								data-testid="master-url-input"
								type="url"
								placeholder="http://100.64.0.1:9100"
								value={masterUrl}
								onChange={(e) => setMasterUrl(e.target.value)}
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							/>
						</div>
						<div className="space-y-1">
							<label
								htmlFor="token"
								className="text-sm font-medium"
							>
								Access Token
							</label>
							<input
								id="token"
								data-testid="token-input"
								type="password"
								placeholder="Paste your access token"
								value={token}
								onChange={(e) => setToken(e.target.value)}
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							/>
						</div>
						{error !== undefined && (
							<p data-testid="config-error" className="text-sm text-destructive">
								{error}
							</p>
						)}
						<Button type="submit" className="w-full" data-testid="config-save-btn">
							Connect
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
