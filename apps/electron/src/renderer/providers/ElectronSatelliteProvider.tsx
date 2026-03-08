import React from 'react'
import { SatelliteProvider } from '@imperium/ui-shared'
import type { InvokeFn, PushCallback } from '@imperium/ui-shared'

// ============================================================================
// ElectronSatelliteProvider
// ============================================================================
// Bridges window.electronApi.invoke → SatelliteProvider so every shared view
// (KanbanView, CostingView, etc.) works inside the Electron master node
// without any modification to the view components.
// ============================================================================

interface Props {
  readonly children: React.ReactNode
}

export function ElectronSatelliteProvider({ children }: Props) {
  // Wrap the typed IPC invoke so it matches InvokeFn exactly.
  const invoke: InvokeFn = (channel, payload) =>
    window.electronApi.invoke(channel, payload as never)

  // Electron is always "connected" — it IS the master.
  // onPush can be wired to Electron's ipcRenderer.on for real push events.
  const onPush = (_cb: PushCallback) => {
    // TODO: wire up ipcRenderer.on for push events (agent:suspended, etc.)
    return () => {}
  }

  return (
    <SatelliteProvider
      invoke={invoke}
      isConnected={true}
      masterOffline={false}
      onPush={onPush}
    >
      {children}
    </SatelliteProvider>
  )
}
