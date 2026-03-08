import React, { useCallback, useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/card.js'
import { Button } from '../components/button.js'
import { Badge } from '../components/badge.js'
import { useSatellite } from '../satellite/SatelliteContext.js'
import type { McpListServersResponse } from '@imperium/shared-types'

// ============================================================================
// ProjectMcpView — Project-scoped Skills & MCPs tab
// ============================================================================
// Two sections:
//   1. Inherited Tools — global MCPs with per-project enable/disable toggle
//   2. Project-Specific — MCPs/Skills that only exist for this project
// ============================================================================

const INPUT_CLASS =
  'flex h-8 rounded-md border border-input bg-background px-3 py-1 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

// ─── Local types ─────────────────────────────────────────────────────────────

interface InheritedTool {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly toolCount: number
  enabledForProject: boolean
}

interface ProjectSpecificTool {
  readonly id: string
  readonly name: string
  readonly url: string
}

// ============================================================================
// Props
// ============================================================================

export interface ProjectMcpViewProps {
  readonly projectId: string
}

// ============================================================================
// Component
// ============================================================================

export function ProjectMcpView({ projectId: _projectId }: ProjectMcpViewProps) {
  const { invoke } = useSatellite()

  // ── Inherited tools (from global MCP list) ────────────────────────────────
  const [globalServers, setGlobalServers] = useState<InheritedTool[]>([])
  const [loadError, setLoadError] = useState<string | undefined>(undefined)

  const loadGlobalServers = useCallback(async () => {
    try {
      const result: McpListServersResponse = await invoke('mcp:list-servers', undefined as unknown as void)
      setGlobalServers(
        result.servers.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          toolCount: s.toolCount,
          enabledForProject: s.enabled,
        })),
      )
      setLoadError(undefined)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load servers')
    }
  }, [invoke])

  useEffect(() => { void loadGlobalServers() }, [loadGlobalServers])

  const toggleInherited = (id: string) => {
    setGlobalServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabledForProject: !s.enabledForProject } : s)),
    )
  }

  // ── Project-specific tools ────────────────────────────────────────────────
  const [projectTools, setProjectTools] = useState<ProjectSpecificTool[]>([])
  const [newToolName, setNewToolName] = useState('')
  const [newToolUrl, setNewToolUrl] = useState('')

  const addProjectTool = () => {
    const name = newToolName.trim()
    const url = newToolUrl.trim()
    if (!name || !url) return
    setProjectTools((prev) => [...prev, { id: crypto.randomUUID(), name, url }])
    setNewToolName('')
    setNewToolUrl('')
  }

  const removeProjectTool = (id: string) => {
    setProjectTools((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div data-testid="project-mcp-view" className="space-y-6">

      {/* ── Inherited Tools ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inherited Tools</CardTitle>
          <CardDescription className="text-xs">
            Global Skills &amp; MCPs. Toggle to enable or disable for this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadError !== undefined ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{loadError}</p>
              <Button size="sm" variant="outline" onClick={() => void loadGlobalServers()}>
                Retry
              </Button>
            </div>
          ) : globalServers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No global MCPs registered. Add them via the Skills &amp; MCPs system view.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {globalServers.map((server) => (
                <div
                  key={server.id}
                  className="flex items-center justify-between py-2.5"
                  data-testid={`inherited-tool-${server.id}`}
                >
                  <div className="min-w-0 mr-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{server.name}</p>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
                        {server.toolCount} tools
                      </Badge>
                    </div>
                    {server.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {server.description}
                      </p>
                    )}
                  </div>
                  {/* CSS toggle switch */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={server.enabledForProject}
                      onChange={() => toggleInherited(server.id)}
                      className="sr-only peer"
                      data-testid={`inherited-toggle-${server.id}`}
                    />
                    <div className="w-8 h-4 bg-secondary rounded-full transition-colors peer-checked:bg-primary
                                    relative after:content-[''] after:absolute after:top-0.5 after:left-0.5
                                    after:w-3 after:h-3 after:bg-white after:rounded-full after:transition-transform
                                    peer-checked:after:translate-x-4" />
                  </label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Project-Specific Tools ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Project-Specific</CardTitle>
          <CardDescription className="text-xs">
            MCPs and Skills that only exist for this project. Data does not leak to other projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {projectTools.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No project-specific tools yet.
            </p>
          ) : (
            <div className="divide-y divide-border mb-3">
              {projectTools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between py-2"
                  data-testid={`project-tool-${tool.id}`}
                >
                  <div className="min-w-0 mr-2">
                    <p className="text-sm font-medium">{tool.name}</p>
                    <p className="text-xs font-mono text-muted-foreground truncate">{tool.url}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive shrink-0"
                    onClick={() => removeProjectTool(tool.id)}
                    data-testid={`project-tool-remove-${tool.id}`}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add form */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Tool name"
              value={newToolName}
              onChange={(e) => setNewToolName(e.target.value)}
              className={`${INPUT_CLASS} w-32`}
              data-testid="project-tool-name-input"
            />
            <input
              type="text"
              placeholder="MCP URL or command"
              value={newToolUrl}
              onChange={(e) => setNewToolUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addProjectTool() }}
              className={`${INPUT_CLASS} flex-1`}
              data-testid="project-tool-url-input"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs shrink-0"
              onClick={addProjectTool}
              disabled={!newToolName.trim() || !newToolUrl.trim()}
              data-testid="project-tool-add-btn"
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
