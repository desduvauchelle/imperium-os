'use client'

import React, { useEffect, useRef, useState } from 'react'
import { SatelliteProvider } from '@imperium/ui-shared'
import type { InvokeFn, PushCallback } from '@imperium/ui-shared'
import { SatelliteClient } from '@imperium/satellite-client'
import type { SatellitePushEvent } from '@imperium/shared-types'
import type { IpcChannel, IpcHandlerMap } from '@imperium/shared-types'

// ============================================================================
// AppProvider — multi-mode SatelliteProvider for the web app
//
// Master mode:   invoke() → POST /api/invoke (local Next.js API route)
// Satellite mode: invoke() → SatelliteClient HTTP POST to remote Master
// Both mode:     local invoke() + SatelliteClient connected in background
// ============================================================================

type Mode = 'master' | 'satellite' | 'both'

interface AppProviderProps {
  readonly children: React.ReactNode
}

// ── Local (Master) invoke ─────────────────────────────────────────────────────

function createLocalInvoke(): InvokeFn {
  return async <C extends IpcChannel>(
    channel: C,
    payload: IpcHandlerMap[C]['request'],
  ): Promise<IpcHandlerMap[C]['response']> => {
    const res = await fetch('/api/invoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ channel, payload }),
    })

    const json = (await res.json()) as
      | { ok: true; data: IpcHandlerMap[C]['response'] }
      | { ok: false; error: string }

    if (!json.ok) {
      throw new Error((json as { ok: false; error: string }).error)
    }

    return json.data
  }
}

// ── AppProvider ───────────────────────────────────────────────────────────────

export function AppProvider({ children }: AppProviderProps) {
  const [ready, setReady] = useState(false)
  const [invoke, setInvoke] = useState<InvokeFn>(() => createLocalInvoke())
  const [isConnected, setIsConnected] = useState(true)
  const satelliteRef = useRef<SatelliteClient | null>(null)
  const pushListenersRef = useRef<PushCallback[]>([])

  useEffect(() => {
    const mode = (localStorage.getItem('imperium:mode') ?? 'master') as Mode
    const satelliteUrl = localStorage.getItem('imperium:satellite:url') ?? ''
    const satelliteToken = localStorage.getItem('imperium:satellite:token') ?? ''

    if (mode === 'master') {
      setInvoke(() => createLocalInvoke())
      setIsConnected(true)
      setReady(true)
      return
    }

    // Satellite or Both — create a SatelliteClient
    const client = new SatelliteClient({ baseUrl: satelliteUrl, token: satelliteToken })
    satelliteRef.current = client

    client.connect()

    // Poll connection status
    const timer = setInterval(() => {
      setIsConnected(client.isConnected)
    }, 1000)

    // Forward push events to subscribers
    const unsubscribe = client.onPush((event: SatellitePushEvent) => {
      for (const cb of pushListenersRef.current) {
        cb(event)
      }
    })

    if (mode === 'satellite') {
      setInvoke(() => (channel: IpcChannel, payload: IpcHandlerMap[typeof channel]['request']) =>
        client.invoke(channel, payload as never) as Promise<IpcHandlerMap[typeof channel]['response']>
      )
    } else {
      // Both: prefer local invoke, satellite is connected in background
      setInvoke(() => createLocalInvoke())
      setIsConnected(true)
    }

    setReady(true)

    return () => {
      clearInterval(timer)
      unsubscribe()
      client.disconnect()
    }
  }, [])

  const onPush = (cb: PushCallback) => {
    pushListenersRef.current.push(cb)
    return () => {
      const idx = pushListenersRef.current.indexOf(cb)
      if (idx >= 0) pushListenersRef.current.splice(idx, 1)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Initialising…</span>
      </div>
    )
  }

  return (
    <SatelliteProvider invoke={invoke} isConnected={isConnected} onPush={onPush}>
      {children}
    </SatelliteProvider>
  )
}
