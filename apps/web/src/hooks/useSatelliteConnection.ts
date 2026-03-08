import { useState, useEffect, useCallback, useRef } from 'react'
import { createSatelliteClient, type SatelliteClient } from '@imperium/satellite-client'
import { loadSatelliteConfig, type SatelliteConfig } from '@imperium/ui-shared'
import type { SatellitePushEvent } from '@imperium/shared-types'

export type PushCallback = (event: SatellitePushEvent) => void

export interface SatelliteConnection {
	readonly invoke: InstanceType<typeof SatelliteClient>['invoke']
	readonly isConnected: boolean
	readonly masterOffline: boolean
	readonly onPush: (cb: PushCallback) => () => void
}

/**
 * Creates and manages a SatelliteClient lifecycle for React.
 * Polls `isConnected` every second to keep the UI in sync.
 */
export function useSatelliteConnection(config: SatelliteConfig): SatelliteConnection {
	const clientRef = useRef<SatelliteClient | null>(null)
	const [isConnected, setIsConnected] = useState(false)

	useEffect(() => {
		const client = createSatelliteClient({
			baseUrl: config.masterUrl,
			token: config.token,
		})
		clientRef.current = client
		client.connect()

		const interval = setInterval(() => {
			setIsConnected(client.isConnected)
		}, 1_000)

		return () => {
			clearInterval(interval)
			client.disconnect()
			clientRef.current = null
			setIsConnected(false)
		}
	}, [config.masterUrl, config.token])

	const invoke = useCallback(
		(...args: Parameters<SatelliteClient['invoke']>) => {
			const client = clientRef.current
			if (!client) return Promise.reject(new Error('Not connected'))
			return (client.invoke as (...a: typeof args) => ReturnType<SatelliteClient['invoke']>)(...args)
		},
		[],
	) as SatelliteClient['invoke']

	const onPush = useCallback((cb: PushCallback): (() => void) => {
		const client = clientRef.current
		if (!client) return () => {}
		return client.onPush(cb)
	}, [])

	return {
		invoke,
		isConnected,
		masterOffline: !isConnected,
		onPush,
	}
}
