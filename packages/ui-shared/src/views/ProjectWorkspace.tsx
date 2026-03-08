import React, { useState } from 'react'
import { Button } from '../components/button.js'
import { KanbanView } from './KanbanView.js'
import { CostingView } from './CostingView.js'
import { AgentView } from './AgentView.js'
import { OverviewView } from './OverviewView.js'
import { ChatView } from './ChatView.js'
import { ProjectMcpView } from './ProjectMcpView.js'

// ============================================================================
// ProjectWorkspace
// ============================================================================
// Shared per-project workspace used by all platforms (Electron, Web, Mobile).
// Contains:
//   - Top tab bar (project name + tabs)
//   - Tab content area (shared views via useSatellite())
//
// API interaction is handled by the parent's SatelliteProvider — no
// platform-specific code lives here.
// ============================================================================

type ProjectTab = 'overview' | 'chat' | 'kanban' | 'mcp' | 'agents' | 'costing'

const TABS: readonly [ProjectTab, string][] = [
  ['overview', 'Overview'],
  ['chat',     'Chat'],
  ['kanban',   'Kanban'],
  ['mcp',      'Skills & MCPs'],
  ['agents',   'Agents'],
  ['costing',  'Costing'],
]

export interface ProjectWorkspaceProps {
  /** The active project ID — passed to view components that are project-scoped. */
  readonly projectId: string
  /** Display name shown in the tab bar header. */
  readonly projectName: string
  /** Which tab to open by default. Defaults to 'overview'. */
  readonly defaultTab?: ProjectTab
}

export function ProjectWorkspace({
  projectId,
  projectName,
  defaultTab = 'overview',
}: ProjectWorkspaceProps) {
  const [tab, setTab] = useState<ProjectTab>(defaultTab)

  return (
    <div className="flex flex-col h-full min-h-0" data-testid="project-workspace">
      {/* ── Top tab bar ──────────────────────────────────────────────── */}
      <div className="shrink-0 h-11 border-b bg-background flex items-center px-4 gap-1">
        <span
          className="text-sm font-semibold text-foreground truncate max-w-[200px] mr-3"
          data-testid="project-workspace-name"
        >
          {projectName}
        </span>

        {TABS.map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={tab === id ? 'secondary' : 'ghost'}
            className="h-7 px-3 text-xs"
            onClick={() => setTab(id)}
            data-testid={`project-tab-${id}`}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {tab === 'overview' && (
          <div className="h-full overflow-auto p-6">
            <OverviewView projectId={projectId} projectName={projectName} />
          </div>
        )}

        {/* Chat fills full height — no overflow-auto wrapper so inner scroll works */}
        {tab === 'chat' && (
          <div className="h-full flex flex-col min-h-0">
            <ChatView projectId={projectId} />
          </div>
        )}

        {tab === 'kanban' && (
          <div className="h-full overflow-auto p-6">
            <KanbanView projectId={projectId} />
          </div>
        )}

        {tab === 'mcp' && (
          <div className="h-full overflow-auto p-6">
            <ProjectMcpView projectId={projectId} />
          </div>
        )}

        {tab === 'agents' && (
          <div className="h-full overflow-auto p-6">
            <AgentView />
          </div>
        )}

        {tab === 'costing' && (
          <div className="h-full overflow-auto p-6">
            <CostingView />
          </div>
        )}

      </div>
    </div>
  )
}
