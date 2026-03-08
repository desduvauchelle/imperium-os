import React, { createContext, useContext } from 'react'
import type { IpcChannel, IpcHandlerMap, SatellitePushEvent } from '@imperium/shared-types'

// ============================================================================
// Types
// ============================================================================

export type InvokeFn = <C extends IpcChannel>(
	channel: C,
	payload: IpcHandlerMap[C]['request'],
) => Promise<IpcHandlerMap[C]['response']>

export type PushCallback = (event: SatellitePushEvent) => void

export interface SatelliteContextValue {
	readonly invoke: InvokeFn
	readonly isConnected: boolean
	readonly masterOffline: boolean
	readonly onPush: (cb: PushCallback) => () => void
}

// ============================================================================
// Context
// ============================================================================

const SatelliteContext = createContext<SatelliteContextValue | undefined>(undefined)

// ============================================================================
// Provider
// ============================================================================

export interface SatelliteProviderProps {
	readonly invoke: InvokeFn
	readonly isConnected?: boolean
	readonly masterOffline?: boolean
	readonly onPush?: (cb: PushCallback) => () => void
	readonly children: React.ReactNode
}

/**
 * Provides invoke, isConnected, masterOffline, and onPush to the component tree.
 * Platform-agnostic: works in Electron (pass window.electronApi.invoke),
 * web/mobile (pass SatelliteClient.invoke), and tests (pass a mock).
 */
export function SatelliteProvider({
	invoke,
	isConnected = false,
	masterOffline,
	onPush = () => () => {},
	children,
}: SatelliteProviderProps) {
	const offline = masterOffline ?? !isConnected
	const value: SatelliteContextValue = { invoke, isConnected, masterOffline: offline, onPush }

	return <SatelliteContext.Provider value={value}>{children}</SatelliteContext.Provider>
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Consume the SatelliteContext. Must be used inside a SatelliteProvider.
 */
export function useSatellite(): SatelliteContextValue {
	const ctx = useContext(SatelliteContext)
	if (ctx === undefined) {
		throw new Error('useSatellite must be used inside SatelliteProvider')
	}
	return ctx
}
