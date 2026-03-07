import type {
	PermissionsProfileResponse,
	PermissionsEvaluateResponse,
	McpListServersResponse,
	McpGetLocksResponse,
	KanbanListTasksRequest,
	KanbanListTasksResponse,
	KanbanCreateTaskRequest,
	KanbanCreateTaskResponse,
	KanbanUpdateTaskRequest,
	KanbanAddCommentRequest,
	KanbanGetBoardResponse,
	CostingGetSummaryRequest,
	CostingGetSummaryResponse,
	CostingGetEntriesRequest,
	CostingGetEntriesResponse,
	TailscaleStatusResponse,
	TailscaleUpDownResponse,
} from '@imperium/shared-types'
import { createIpcHandler } from './ipc.js'

// ============================================================================
// Phase 3 + Phase 4 IPC Handlers
// ============================================================================

/**
 * Dependencies injected into the handler registry.
 * Keeps handlers testable and decoupled from concrete implementations.
 */
export interface HandlerDeps {
	readonly getProfile: () => PermissionsProfileResponse
	readonly setLevel: (level: string) => void
	readonly evaluate: (action: string) => PermissionsEvaluateResponse
	readonly resumeAgent: (agentId: string, approved: boolean) => Promise<void>
	readonly setPowerMode: (enabled: boolean) => Promise<void>
	readonly listMcpServers: () => McpListServersResponse
	readonly getMcpLocks: () => McpGetLocksResponse
	readonly releaseMcpLock: (path: string, ownerId: string) => void
}

/**
 * Create all Phase 3 + Phase 4 IPC handlers with injected dependencies.
 */
export function createPhase3Handlers(deps: HandlerDeps) {
	return [
		createIpcHandler('permissions:get-profile', async () => {
			return deps.getProfile()
		}),

		createIpcHandler('permissions:set-level', async (payload) => {
			deps.setLevel(payload.level)
		}),

		createIpcHandler('permissions:evaluate', async (payload) => {
			return deps.evaluate(payload.action)
		}),

		createIpcHandler('agent:resume', async (payload) => {
			await deps.resumeAgent(payload.agentId, payload.approved)
		}),

		createIpcHandler('system:power-mode', async (payload) => {
			await deps.setPowerMode(payload.enabled)
		}),

		// Phase 4 MCP handlers
		createIpcHandler('mcp:list-servers', async () => {
			return deps.listMcpServers()
		}),

		createIpcHandler('mcp:get-locks', async () => {
			return deps.getMcpLocks()
		}),

		createIpcHandler('mcp:release-lock', async (payload) => {
			deps.releaseMcpLock(payload.path, payload.ownerId)
		}),
	] as const
}

// ============================================================================
// Phase 5 IPC Handlers
// ============================================================================

/**
 * Dependencies for Phase 5 handlers — Kanban, Costing, Tailscale.
 */
export interface Phase5HandlerDeps {
	readonly listTasks: (req: KanbanListTasksRequest) => Promise<KanbanListTasksResponse>
	readonly createTask: (req: KanbanCreateTaskRequest) => Promise<KanbanCreateTaskResponse>
	readonly updateTask: (req: KanbanUpdateTaskRequest) => Promise<void>
	readonly deleteTask: (taskId: string) => Promise<void>
	readonly addComment: (req: KanbanAddCommentRequest) => Promise<void>
	readonly getBoard: (projectId: string) => Promise<KanbanGetBoardResponse>
	readonly getCostSummary: (req: CostingGetSummaryRequest) => Promise<CostingGetSummaryResponse>
	readonly getCostEntries: (req: CostingGetEntriesRequest) => Promise<CostingGetEntriesResponse>
	readonly getTailscaleStatus: () => Promise<TailscaleStatusResponse>
	readonly tailscaleUp: () => Promise<TailscaleUpDownResponse>
	readonly tailscaleDown: () => Promise<TailscaleUpDownResponse>
}

/**
 * Create Phase 5 IPC handlers — composable alongside Phase 3/4 handlers.
 */
export function createPhase5Handlers(deps: Phase5HandlerDeps) {
	return [
		// Kanban handlers
		createIpcHandler('kanban:list-tasks', async (payload) => {
			return deps.listTasks(payload)
		}),

		createIpcHandler('kanban:create-task', async (payload) => {
			return deps.createTask(payload)
		}),

		createIpcHandler('kanban:update-task', async (payload) => {
			await deps.updateTask(payload)
		}),

		createIpcHandler('kanban:delete-task', async (payload) => {
			await deps.deleteTask(payload.taskId)
		}),

		createIpcHandler('kanban:add-comment', async (payload) => {
			await deps.addComment(payload)
		}),

		createIpcHandler('kanban:get-board', async (payload) => {
			return deps.getBoard(payload.projectId)
		}),

		// Costing handlers
		createIpcHandler('costing:get-summary', async (payload) => {
			return deps.getCostSummary(payload)
		}),

		createIpcHandler('costing:get-entries', async (payload) => {
			return deps.getCostEntries(payload)
		}),

		// Tailscale handlers
		createIpcHandler('tailscale:status', async () => {
			return deps.getTailscaleStatus()
		}),

		createIpcHandler('tailscale:up', async () => {
			return deps.tailscaleUp()
		}),

		createIpcHandler('tailscale:down', async () => {
			return deps.tailscaleDown()
		}),
	] as const
}
