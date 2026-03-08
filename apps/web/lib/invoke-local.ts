/**
 * invoke-local.ts — Server-side IPC channel dispatcher for Master mode.
 *
 * Maps every IpcChannel to a direct call into the @imperium/core-* packages.
 * This module is Node.js-only (imported only by API routes, never by client code).
 *
 * Mirrors the role of apps/electron/src/main/handlers.ts but runs in Next.js
 * server context instead of the Electron main process.
 */

import os from 'node:os'
import path from 'node:path'
import { createDb, ProjectRepository, TaskRepository, CostEntryRepository } from '@imperium/core-db'
import { KanbanService } from '@imperium/core-kanban'
import { CostTracker } from '@imperium/core-costing'
import { PermissionGuard } from '@imperium/core-permissions'
import type { IpcChannel, IpcHandlerMap } from '@imperium/shared-types'

// ============================================================================
// Singleton service instances (lazily initialised on first request)
// ============================================================================

const DB_PATH = path.join(os.homedir(), '.imperium', 'master.db')

let _db: ReturnType<typeof createDb> | undefined
let _projectRepo: ProjectRepository | undefined
let _taskRepo: TaskRepository | undefined
let _costRepo: CostEntryRepository | undefined
let _kanban: KanbanService | undefined
let _costTracker: CostTracker | undefined
let _permissions: PermissionGuard | undefined

function getDb() {
  if (!_db) {
    // Ensure the directory exists before opening the database
    const { mkdirSync } = require('node:fs') as typeof import('node:fs')
    mkdirSync(path.dirname(DB_PATH), { recursive: true })
    _db = createDb(DB_PATH)
  }
  return _db
}

function getProjectRepo(): ProjectRepository {
  if (!_projectRepo) _projectRepo = new ProjectRepository(getDb())
  return _projectRepo
}

function getTaskRepo(): TaskRepository {
  if (!_taskRepo) _taskRepo = new TaskRepository(getDb())
  return _taskRepo
}

function getCostRepo(): CostEntryRepository {
  if (!_costRepo) _costRepo = new CostEntryRepository(getDb())
  return _costRepo
}

function getKanban(): KanbanService {
  if (!_kanban) _kanban = new KanbanService(getTaskRepo())
  return _kanban
}

function getCostTracker(): CostTracker {
  if (!_costTracker) _costTracker = new CostTracker({}, getCostRepo())
  return _costTracker
}

function getPermissions(): PermissionGuard {
  if (!_permissions) _permissions = new PermissionGuard()
  return _permissions
}

// ============================================================================
// Channel dispatcher
// ============================================================================

export async function invokeLocal<C extends IpcChannel>(
  channel: C,
  payload: IpcHandlerMap[C]['request'],
): Promise<IpcHandlerMap[C]['response']> {
  switch (channel) {
    // ── Theme ──────────────────────────────────────────────────────────────
    case 'theme:get':
      return 'dark' as IpcHandlerMap[C]['response']

    case 'theme:set':
      return undefined as IpcHandlerMap[C]['response']

    case 'theme:changed':
      return undefined as IpcHandlerMap[C]['response']

    // ── Projects ───────────────────────────────────────────────────────────
    case 'project:list': {
      const projects = await getProjectRepo().listAll()
      return projects as IpcHandlerMap[C]['response']
    }

    case 'project:create': {
      const req = payload as IpcHandlerMap['project:create']['request']
      const id = crypto.randomUUID()
      const baseDir = path.join(os.homedir(), '.imperium', 'projects', id)
      const project = await getProjectRepo().insert({
        id,
        name: req.name,
        rootPath: baseDir,
        memoryPath: path.join(baseDir, 'memory'),
        tasksPath: path.join(baseDir, 'tasks'),
      })
      return project as IpcHandlerMap[C]['response']
    }

    case 'project:open':
      return undefined as IpcHandlerMap[C]['response']

    case 'project:close':
      return undefined as IpcHandlerMap[C]['response']

    // ── Agents ─────────────────────────────────────────────────────────────
    case 'agent:start':
      return { agentId: crypto.randomUUID() } as IpcHandlerMap[C]['response']

    case 'agent:stop':
      return undefined as IpcHandlerMap[C]['response']

    case 'agent:status':
      return { state: 'idle' } as IpcHandlerMap[C]['response']

    case 'agent:suspended':
      return undefined as IpcHandlerMap[C]['response']

    case 'agent:resume':
      return undefined as IpcHandlerMap[C]['response']

    // ── Notifications ──────────────────────────────────────────────────────
    case 'notification:show':
      return undefined as IpcHandlerMap[C]['response']

    case 'notification:dismiss':
      return undefined as IpcHandlerMap[C]['response']

    // ── System ─────────────────────────────────────────────────────────────
    case 'system:power-mode':
      return undefined as IpcHandlerMap[C]['response']

    case 'system:quit':
      return undefined as IpcHandlerMap[C]['response']

    // ── Onboarding ─────────────────────────────────────────────────────────
    case 'onboarding:check':
      return {
        results: [],
        allRequiredInstalled: true,
      } as IpcHandlerMap[C]['response']

    case 'onboarding:install':
      return { success: true } as IpcHandlerMap[C]['response']

    // ── Permissions ────────────────────────────────────────────────────────
    case 'permissions:get-profile': {
      const profile = getPermissions().profile
      return {
        level: profile.level,
        label: profile.label,
        description: profile.description,
        permissions: profile.permissions as Readonly<Record<string, string>>,
      } as IpcHandlerMap[C]['response']
    }

    case 'permissions:set-level': {
      const req = payload as IpcHandlerMap['permissions:set-level']['request']
      getPermissions().setLevel(req.level as 'mad-max' | 'praetorian' | 'imperator')
      return undefined as IpcHandlerMap[C]['response']
    }

    case 'permissions:evaluate': {
      const req = payload as IpcHandlerMap['permissions:evaluate']['request']
      const result = getPermissions().evaluate(req.action as Parameters<PermissionGuard['evaluate']>[0])
      return {
        action: req.action,
        verdict: result.verdict,
        comfortLevel: result.comfortLevel,
        reason: result.reason,
      } as IpcHandlerMap[C]['response']
    }

    // ── MCP ────────────────────────────────────────────────────────────────
    case 'mcp:list-servers':
      return { servers: [] } as IpcHandlerMap[C]['response']

    case 'mcp:get-locks':
      return { locks: [] } as IpcHandlerMap[C]['response']

    case 'mcp:release-lock':
      return undefined as IpcHandlerMap[C]['response']

    // ── Kanban ─────────────────────────────────────────────────────────────
    case 'kanban:list-tasks': {
      const req = payload as IpcHandlerMap['kanban:list-tasks']['request']
      const tasks = await getKanban().listTasks(
        req.projectId as Parameters<KanbanService['listTasks']>[0],
        { status: req.status, priority: req.priority, assignee: req.assignee, search: req.search } as unknown as Parameters<KanbanService['listTasks']>[1],
      )
      return {
        tasks: tasks.map((t) => ({
          id: t.id as string,
          projectId: t.projectId as string,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          assignee: t.assignee,
          commentCount: t.comments.length,
          createdAt: t.createdAt as string,
          updatedAt: t.updatedAt as string,
        })),
      } as IpcHandlerMap[C]['response']
    }

    case 'kanban:create-task': {
      const req = payload as IpcHandlerMap['kanban:create-task']['request']
      const task = await getKanban().createTask({
        projectId: req.projectId as Parameters<KanbanService['createTask']>[0]['projectId'],
        title: req.title,
        description: req.description,
        priority: req.priority as Parameters<KanbanService['createTask']>[0]['priority'],
        assignee: req.assignee as Parameters<KanbanService['createTask']>[0]['assignee'],
      })
      return { taskId: task.id as string } as IpcHandlerMap[C]['response']
    }

    case 'kanban:update-task': {
      const req = payload as IpcHandlerMap['kanban:update-task']['request']
      await getKanban().updateTask(
        req.taskId as Parameters<KanbanService['updateTask']>[0],
        { title: req.title, description: req.description, status: req.status, priority: req.priority, assignee: req.assignee } as unknown as Parameters<KanbanService['updateTask']>[1],
      )
      return undefined as IpcHandlerMap[C]['response']
    }

    case 'kanban:delete-task': {
      const req = payload as IpcHandlerMap['kanban:delete-task']['request']
      await getKanban().deleteTask(req.taskId as Parameters<KanbanService['deleteTask']>[0])
      return undefined as IpcHandlerMap[C]['response']
    }

    case 'kanban:add-comment': {
      const req = payload as IpcHandlerMap['kanban:add-comment']['request']
      await getKanban().addComment({
        taskId: req.taskId as Parameters<KanbanService['addComment']>[0]['taskId'],
        author: req.author as Parameters<KanbanService['addComment']>[0]['author'],
        content: req.content,
        emoji: req.emoji,
      })
      return undefined as IpcHandlerMap[C]['response']
    }

    case 'kanban:get-board': {
      const req = payload as IpcHandlerMap['kanban:get-board']['request']
      const board = await getKanban().getBoardState(req.projectId as Parameters<KanbanService['getBoardState']>[0])
      return {
        columns: Object.fromEntries(
          Object.entries(board.columns).map(([status, tasks]) => [
            status,
            tasks.map((t) => ({
              id: t.id as string,
              title: t.title,
              status: t.status,
              priority: t.priority,
              assignee: t.assignee,
              commentCount: t.comments.length,
            })),
          ]),
        ),
        taskCount: board.taskCount,
      } as IpcHandlerMap[C]['response']
    }

    // ── Costing ────────────────────────────────────────────────────────────
    case 'costing:get-summary': {
      const req = payload as IpcHandlerMap['costing:get-summary']['request']
      const summary = getCostTracker().getSummary(
        req.periodStart as Parameters<CostTracker['getSummary']>[0],
        req.periodEnd as Parameters<CostTracker['getSummary']>[1],
      )
      return summary as IpcHandlerMap[C]['response']
    }

    case 'costing:get-entries': {
      const req = payload as IpcHandlerMap['costing:get-entries']['request']
      const entries = await getCostTracker().getPersistedEntries(req.limit, req.offset)
      const total = await getCostTracker().getPersistedCount()
      return {
        entries: entries.map((e) => ({
          model: e.model,
          provider: e.provider,
          inputTokens: e.inputTokens,
          outputTokens: e.outputTokens,
          costUsd: e.costUsd,
          timestamp: e.timestamp as string,
        })),
        total,
      } as IpcHandlerMap[C]['response']
    }

    // ── Tailscale ──────────────────────────────────────────────────────────
    case 'tailscale:status':
      return {
        backendState: 'NoState',
        selfHostname: '',
        selfIp: '',
        tailnet: '',
        peers: [],
        version: '',
      } as IpcHandlerMap[C]['response']

    case 'tailscale:up':
      return { success: false, error: 'Not available in web mode' } as IpcHandlerMap[C]['response']

    case 'tailscale:down':
      return { success: false, error: 'Not available in web mode' } as IpcHandlerMap[C]['response']

    // ── Satellite config ───────────────────────────────────────────────────
    case 'satellite:get-config':
      return {
        port: 9100,
        token: '',
        isRunning: false,
        connectedClients: 0,
      } as IpcHandlerMap[C]['response']

    case 'satellite:regenerate-token':
      return { newToken: crypto.randomUUID() } as IpcHandlerMap[C]['response']

    default:
      throw new Error(`Unknown IPC channel: ${String(channel)}`)
  }
}
