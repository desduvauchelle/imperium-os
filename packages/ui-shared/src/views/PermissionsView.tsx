import React, { useCallback, useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/card.js'
import { Badge } from '../components/badge.js'
import { useSatellite } from '../satellite/SatelliteContext.js'
import type { PermissionsProfileResponse } from '@imperium/shared-types'

const VERDICT_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  allow: 'default',
  prompt: 'secondary',
  deny: 'destructive',
}

export function PermissionsView() {
  const { invoke } = useSatellite()
  const [profile, setProfile] = useState<PermissionsProfileResponse | null>(null)

  const load = useCallback(async () => {
    const result = await invoke('permissions:get-profile', undefined as unknown as void)
    setProfile(result)
  }, [invoke])

  useEffect(() => { void load() }, [load])

  if (!profile) {
    return <div data-testid="permissions-loading">Loading permissions…</div>
  }

  const permEntries = Object.entries(profile.permissions)

  return (
    <div data-testid="permissions-view" className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Permissions</h1>
        <p className="text-sm text-muted-foreground">Read-only view — manage on the Master</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{profile.label}</CardTitle>
            <Badge variant="secondary">{profile.level}</Badge>
          </div>
          <CardDescription>{profile.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {permEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No permissions defined</p>
          ) : (
            <table data-testid="permissions-table" className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2">Action</th>
                  <th className="text-right pb-2">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {permEntries.map(([action, verdict]) => (
                  <tr key={action} className="border-b last:border-0">
                    <td className="py-1.5 font-mono text-xs">{action}</td>
                    <td className="py-1.5 text-right">
                      <Badge variant={VERDICT_VARIANTS[verdict] ?? 'secondary'}>
                        {verdict}
                      </Badge>
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
