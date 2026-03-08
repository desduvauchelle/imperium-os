'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

type Mode = 'master' | 'satellite' | 'both'

interface SatelliteConfig {
  url: string
  token: string
}

const TILE_STYLES = {
  base: 'flex flex-col gap-2 cursor-pointer rounded-xl border-2 p-6 transition-all hover:bg-accent/20',
  active: 'border-primary bg-accent/10',
  inactive: 'border-border',
}

function ModeCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`${TILE_STYLES.base} ${selected ? TILE_STYLES.active : TILE_STYLES.inactive}`}
      onClick={onClick}
    >
      <span className="text-base font-semibold text-foreground">{title}</span>
      <span className="text-sm text-muted-foreground text-left">{description}</span>
    </button>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('master')
  const [satellite, setSatellite] = useState<SatelliteConfig>({ url: '', token: '' })
  const [saving, setSaving] = useState(false)

  const needsSatelliteConfig = mode === 'satellite' || mode === 'both'

  const handleSave = () => {
    setSaving(true)

    // Persist to localStorage (client-side source of truth)
    localStorage.setItem('imperium:mode', mode)
    if (needsSatelliteConfig) {
      localStorage.setItem('imperium:satellite:url', satellite.url)
      localStorage.setItem('imperium:satellite:token', satellite.token)
    }

    // Set cookie so the server component in app/page.tsx can redirect correctly
    document.cookie = `imperium:mode=${mode}; path=/; max-age=${60 * 60 * 24 * 365}`

    router.push('/dashboard')
  }

  const canSave =
    !saving &&
    (!needsSatelliteConfig || (satellite.url.trim() !== '' && satellite.token.trim() !== ''))

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Welcome to Imperium OS</h1>
          <p className="text-muted-foreground">Choose how this node should operate.</p>
        </div>

        <div className="space-y-3">
          <ModeCard
            title="Master"
            description="This machine is the primary node. Projects, tasks and data are stored locally. Other Satellites can connect to it."
            selected={mode === 'master'}
            onClick={() => setMode('master')}
          />
          <ModeCard
            title="Satellite"
            description="This machine connects to a remote Master node. All data lives on the Master."
            selected={mode === 'satellite'}
            onClick={() => setMode('satellite')}
          />
          <ModeCard
            title="Both"
            description="Operate as a local Master and simultaneously connect to a remote Master. Useful for mesh setups."
            selected={mode === 'both'}
            onClick={() => setMode('both')}
          />
        </div>

        {needsSatelliteConfig && (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <p className="text-sm font-medium text-foreground">Remote Master connection</p>
            <div className="space-y-2">
              <input
                type="url"
                placeholder="Master URL (e.g. http://192.168.1.10:9100)"
                value={satellite.url}
                onChange={(e) => setSatellite((s) => ({ ...s, url: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <input
                type="password"
                placeholder="Access token"
                value={satellite.token}
                onChange={(e) => setSatellite((s) => ({ ...s, token: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Setting up…' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
