import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/card.js'
import { Button } from '../components/button.js'
import { cn } from '../lib/utils.js'
import type { ComfortLevel } from '@imperium/shared-types'

// ============================================================================
// OverviewView — Project configuration tab
// ============================================================================
// Contains three sections:
//   1. Project Meta — name, local path, description
//   2. Social Integrations — per-channel toggle, type, ID, mode
//   3. Security Profile — Mad Max / Praetorian / Imperator tier selector
// ============================================================================

const INPUT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

// ─── Social integration row type ────────────────────────────────────────────

interface SocialIntegration {
  readonly id: string
  enabled: boolean
  channelType: 'discord' | 'telegram'
  channelId: string
  mode: 'reply-all' | 'reply-on-mention' | 'read-only'
}

// ─── Security profile tier definitions ──────────────────────────────────────

interface SecurityTier {
  readonly level: ComfortLevel
  readonly label: string
  readonly description: string
  readonly borderActive: string
  readonly borderHover: string
}

const SECURITY_TIERS: readonly SecurityTier[] = [
  {
    level: 'mad-max',
    label: 'Mad Max',
    description: 'No restrictions. Total AI autonomy.',
    borderActive: 'border-red-500/70 bg-red-500/5',
    borderHover: 'hover:border-red-500/40',
  },
  {
    level: 'praetorian',
    label: 'Praetorian',
    description: 'Balanced. Risky tools verified before use.',
    borderActive: 'border-blue-500/70 bg-blue-500/5',
    borderHover: 'hover:border-blue-500/40',
  },
  {
    level: 'imperator',
    label: 'Imperator',
    description: 'Strict lockdown. All actions require approval.',
    borderActive: 'border-amber-500/70 bg-amber-500/5',
    borderHover: 'hover:border-amber-500/40',
  },
]

// ============================================================================
// Props
// ============================================================================

export interface OverviewViewProps {
  readonly projectId: string
  readonly projectName: string
}

// ============================================================================
// Component
// ============================================================================

export function OverviewView({ projectName }: OverviewViewProps) {
  // ── Project meta state ────────────────────────────────────────────────────
  const [name, setName] = useState(projectName)
  const [localPath, setLocalPath] = useState('')
  const [description, setDescription] = useState('')

  // ── Social integrations state ─────────────────────────────────────────────
  const [integrations, setIntegrations] = useState<SocialIntegration[]>([])

  const addIntegration = () => {
    setIntegrations((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        enabled: true,
        channelType: 'discord',
        channelId: '',
        mode: 'reply-on-mention',
      },
    ])
  }

  const removeIntegration = (id: string) => {
    setIntegrations((prev) => prev.filter((r) => r.id !== id))
  }

  const updateIntegration = <K extends keyof SocialIntegration>(
    id: string,
    field: K,
    value: SocialIntegration[K],
  ) => {
    setIntegrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    )
  }

  // ── Security profile state ────────────────────────────────────────────────
  const [securityProfile, setSecurityProfile] = useState<ComfortLevel>('praetorian')

  return (
    <div data-testid="overview-view" className="space-y-6 max-w-2xl">

      {/* ── Project Meta ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Project Meta</CardTitle>
          <CardDescription>Basic project information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className={INPUT_CLASS}
              data-testid="overview-name-input"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Local Path
            </label>
            <input
              type="text"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              placeholder="/Users/you/projects/my-repo"
              className={INPUT_CLASS}
              data-testid="overview-path-input"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of this project…"
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none shadow-sm"
              data-testid="overview-description-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Social Integrations ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Social Integrations</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Connect Discord or Telegram channels to this project.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs shrink-0"
              onClick={addIntegration}
              data-testid="overview-add-integration-btn"
            >
              + Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">
              No integrations yet. Click &ldquo;+ Add&rdquo; to connect a channel.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="overview-integrations-table">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left pb-2 pr-2 w-8">On</th>
                    <th className="text-left pb-2 pr-2 w-24">Type</th>
                    <th className="text-left pb-2 pr-2">Channel ID</th>
                    <th className="text-left pb-2 pr-2 w-44">Mode</th>
                    <th className="pb-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {integrations.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 align-middle">
                      {/* Enabled toggle */}
                      <td className="py-1.5 pr-2">
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          onChange={(e) => updateIntegration(row.id, 'enabled', e.target.checked)}
                          className="h-4 w-4 rounded border border-input accent-primary"
                          data-testid={`integration-toggle-${row.id}`}
                        />
                      </td>
                      {/* Channel type */}
                      <td className="py-1.5 pr-2">
                        <select
                          value={row.channelType}
                          onChange={(e) =>
                            updateIntegration(row.id, 'channelType', e.target.value as 'discord' | 'telegram')
                          }
                          className="h-7 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-testid={`integration-type-${row.id}`}
                        >
                          <option value="discord">Discord</option>
                          <option value="telegram">Telegram</option>
                        </select>
                      </td>
                      {/* Channel ID */}
                      <td className="py-1.5 pr-2">
                        <input
                          type="text"
                          value={row.channelId}
                          onChange={(e) => updateIntegration(row.id, 'channelId', e.target.value)}
                          placeholder="channel-id or comma-sep IDs"
                          className="h-7 w-full rounded border border-input bg-background px-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-testid={`integration-channel-${row.id}`}
                        />
                      </td>
                      {/* Mode */}
                      <td className="py-1.5 pr-2">
                        <select
                          value={row.mode}
                          onChange={(e) =>
                            updateIntegration(row.id, 'mode', e.target.value as SocialIntegration['mode'])
                          }
                          className="h-7 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-testid={`integration-mode-${row.id}`}
                        >
                          <option value="reply-all">Reply All</option>
                          <option value="reply-on-mention">Reply on Mention</option>
                          <option value="read-only">Read Only</option>
                        </select>
                      </td>
                      {/* Remove */}
                      <td className="py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => removeIntegration(row.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors text-xs px-1"
                          data-testid={`integration-remove-${row.id}`}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Security Profile ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Security Profile</CardTitle>
          <CardDescription className="text-xs">
            Controls which AI actions require human approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3" data-testid="overview-security-tiers">
            {SECURITY_TIERS.map((tier) => (
              <button
                key={tier.level}
                type="button"
                onClick={() => setSecurityProfile(tier.level)}
                className={cn(
                  'rounded-lg border-2 p-3 text-left transition-colors cursor-pointer',
                  securityProfile === tier.level
                    ? tier.borderActive
                    : cn('border-border', tier.borderHover),
                )}
                data-testid={`security-tier-${tier.level}`}
              >
                <p className="text-sm font-semibold">{tier.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {tier.description}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
