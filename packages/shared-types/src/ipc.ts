// ============================================================================
// IPC Types (Electron Inter-Process Communication)
// ============================================================================

/** IPC channel names - typed to prevent string typos */
export type IpcChannel =
	| 'theme:get'
	| 'theme:set'
	| 'theme:changed'
	| 'project:list'
	| 'project:create'
	| 'project:open'
	| 'project:close'
	| 'agent:start'
	| 'agent:stop'
	| 'agent:status'
	| 'agent:suspended'
	| 'notification:show'
	| 'notification:dismiss'
	| 'system:power-mode'
	| 'system:quit'
	| 'onboarding:check'
	| 'onboarding:install'
	| 'permissions:get-profile'
	| 'permissions:set-level'
	| 'permissions:evaluate'
	| 'agent:resume'
	| 'mcp:list-servers'
	| 'mcp:get-locks'
	| 'mcp:release-lock'
	| 'kanban:list-tasks'
	| 'kanban:create-task'
	| 'kanban:update-task'
	| 'kanban:delete-task'
	| 'kanban:add-comment'
	| 'kanban:get-board'
	| 'costing:get-summary'
	| 'costing:get-entries'
	| 'tailscale:status'
	| 'tailscale:up'
	| 'tailscale:down'
	| 'satellite:get-config'
	| 'satellite:regenerate-token'

/** IPC message envelope */
export interface IpcMessage<T = unknown> {
	readonly channel: IpcChannel
	readonly payload: T
	readonly requestId: string
	readonly timestamp: number
}

/** IPC response envelope */
export interface IpcResponse<T = unknown> {
	readonly channel: IpcChannel
	readonly payload: T
	readonly requestId: string
	readonly success: boolean
	readonly error?: string | undefined
}

/** Type-safe IPC handler map - maps channels to their request/response types */
import type { ProjectMetadata } from './project.js'

export interface IpcHandlerMap {
	'theme:get': { request: void; response: string }
	'theme:set': { request: { mode: string }; response: void }
	'theme:changed': { request: { mode: string }; response: void }
	'project:list': { request: void; response: readonly ProjectMetadata[] }
	'project:create': { request: { name: string }; response: ProjectMetadata }
	'project:open': { request: { id: string }; response: void }
	'project:close': { request: { id: string }; response: void }
	'agent:start': { request: { projectId: string; task: string }; response: { agentId: string } }
	'agent:stop': { request: { agentId: string }; response: void }
	'agent:status': { request: { agentId: string }; response: { state: string } }
	'agent:suspended': { request: { agentId: string; reason: string }; response: void }
	'notification:show': { request: { title: string; message: string }; response: void }
	'notification:dismiss': { request: { id: string }; response: void }
	'system:power-mode': { request: { enabled: boolean }; response: void }
	'system:quit': { request: void; response: void }
	'onboarding:check': { request: void; response: OnboardingCheckResponse }
	'onboarding:install': { request: { name: string }; response: { success: boolean; error?: string } }
	'permissions:get-profile': { request: void; response: PermissionsProfileResponse }
	'permissions:set-level': { request: { level: string }; response: void }
	'permissions:evaluate': { request: { action: string }; response: PermissionsEvaluateResponse }
	'agent:resume': { request: { agentId: string; approved: boolean }; response: void }
	'mcp:list-servers': { request: void; response: McpListServersResponse }
	'mcp:get-locks': { request: void; response: McpGetLocksResponse }
	'mcp:release-lock': { request: { path: string; ownerId: string }; response: void }
	'kanban:list-tasks': { request: KanbanListTasksRequest; response: KanbanListTasksResponse }
	'kanban:create-task': { request: KanbanCreateTaskRequest; response: KanbanCreateTaskResponse }
	'kanban:update-task': { request: KanbanUpdateTaskRequest; response: void }
	'kanban:delete-task': { request: { taskId: string }; response: void }
	'kanban:add-comment': { request: KanbanAddCommentRequest; response: void }
	'kanban:get-board': { request: { projectId: string }; response: KanbanGetBoardResponse }
	'costing:get-summary': { request: CostingGetSummaryRequest; response: CostingGetSummaryResponse }
	'costing:get-entries': { request: CostingGetEntriesRequest; response: CostingGetEntriesResponse }
	'tailscale:status': { request: void; response: TailscaleStatusResponse }
	'tailscale:up': { request: void; response: TailscaleUpDownResponse }
	'tailscale:down': { request: void; response: TailscaleUpDownResponse }
	'satellite:get-config': { request: void; response: SatelliteConfigResponse }
	'satellite:regenerate-token': { request: void; response: SatelliteRegenerateTokenResponse }
}

/** Shape of permissions profile response */
export interface PermissionsProfileResponse {
	readonly level: string
	readonly label: string
	readonly description: string
	readonly permissions: Readonly<Record<string, string>>
}

/** Shape of permission evaluation response */
export interface PermissionsEvaluateResponse {
	readonly action: string
	readonly verdict: string
	readonly comfortLevel: string
	readonly reason: string
}

/** MCP list servers response */
export interface McpListServersResponse {
	readonly servers: readonly {
		readonly id: string
		readonly name: string
		readonly description: string
		readonly toolCount: number
		readonly enabled: boolean
	}[]
}

/** MCP get locks response */
export interface McpGetLocksResponse {
	readonly locks: readonly {
		readonly path: string
		readonly ownerId: string
		readonly acquiredAt: number
		readonly expiresAt: number
	}[]
}

// ============================================================================
// Kanban IPC Types
// ============================================================================

/** Request to list tasks — optional filter */
export interface KanbanListTasksRequest {
	readonly projectId: string
	readonly status?: string | undefined
	readonly priority?: string | undefined
	readonly assignee?: string | undefined
	readonly search?: string | undefined
}

/** Response with an array of tasks */
export interface KanbanListTasksResponse {
	readonly tasks: readonly {
		readonly id: string
		readonly projectId: string
		readonly title: string
		readonly description: string
		readonly status: string
		readonly priority: string
		readonly assignee?: string | undefined
		readonly commentCount: number
		readonly createdAt: string
		readonly updatedAt: string
	}[]
}

/** Request to create a task */
export interface KanbanCreateTaskRequest {
	readonly projectId: string
	readonly title: string
	readonly description: string
	readonly priority: string
	readonly assignee?: string | undefined
}

/** Response after creating a task */
export interface KanbanCreateTaskResponse {
	readonly taskId: string
}

/** Request to update a task */
export interface KanbanUpdateTaskRequest {
	readonly taskId: string
	readonly title?: string | undefined
	readonly description?: string | undefined
	readonly status?: string | undefined
	readonly priority?: string | undefined
	readonly assignee?: string | undefined
}

/** Request to add a comment to a task */
export interface KanbanAddCommentRequest {
	readonly taskId: string
	readonly content: string
	readonly author: string
	readonly emoji?: string | undefined
}

/** Response with grouped Kanban board state */
export interface KanbanGetBoardResponse {
	readonly columns: Readonly<Record<string, readonly {
		readonly id: string
		readonly title: string
		readonly status: string
		readonly priority: string
		readonly assignee?: string | undefined
		readonly commentCount: number
	}[]>>
	readonly taskCount: number
}

// ============================================================================
// Costing IPC Types
// ============================================================================

/** Request for cost summary */
export interface CostingGetSummaryRequest {
	readonly periodStart?: string | undefined
	readonly periodEnd?: string | undefined
}

/** Response with cost summary */
export interface CostingGetSummaryResponse {
	readonly totalCostUsd: number
	readonly totalInputTokens: number
	readonly totalOutputTokens: number
	readonly entriesByModel: Readonly<Record<string, {
		readonly model: string
		readonly provider: string
		readonly totalCostUsd: number
		readonly totalInputTokens: number
		readonly totalOutputTokens: number
		readonly callCount: number
	}>>
	readonly periodStart: string
	readonly periodEnd: string
}

/** Request for cost entries */
export interface CostingGetEntriesRequest {
	readonly limit?: number | undefined
	readonly offset?: number | undefined
}

/** Response with cost entries */
export interface CostingGetEntriesResponse {
	readonly entries: readonly {
		readonly model: string
		readonly provider: string
		readonly inputTokens: number
		readonly outputTokens: number
		readonly costUsd: number
		readonly timestamp: string
	}[]
	readonly total: number
}

// ============================================================================
// Tailscale IPC Types
// ============================================================================

/** Response with Tailscale status */
export interface TailscaleStatusResponse {
	readonly backendState: string
	readonly selfHostname: string
	readonly selfIp: string
	readonly tailnet: string
	readonly peers: readonly {
		readonly id: string
		readonly hostname: string
		readonly ipv4: string
		readonly online: boolean
		readonly os: string
	}[]
	readonly version: string
}

/** Response for tailscale up/down */
export interface TailscaleUpDownResponse {
	readonly success: boolean
	readonly error?: string | undefined
}

// ============================================================================
// Satellite API Types (Phase 6)
// ============================================================================

/** HTTP envelope wrapping every satellite REST response */
export type SatelliteHttpResponse<T> =
	| { readonly ok: true; readonly data: T }
	| { readonly ok: false; readonly error: string }

/** Push events delivered over the satellite WebSocket channel */
export type SatellitePushEvent =
	| { readonly type: 'notification:show'; readonly payload: { readonly title: string; readonly message: string } }
	| { readonly type: 'notification:dismiss'; readonly payload: { readonly id: string } }
	| { readonly type: 'agent:suspended'; readonly payload: { readonly agentId: string; readonly reason: string } }
	| { readonly type: 'ping'; readonly payload: Record<string, never> }

/** Configuration for the SatelliteServer (Master side) */
export interface SatelliteServerConfig {
	readonly port: number
	readonly token: string
	readonly allowedChannels: readonly IpcChannel[]
}

/** Configuration for the SatelliteClient (browser side) */
export interface SatelliteClientConfig {
	readonly baseUrl: string
	readonly token: string
}

/** Response for satellite:get-config */
export interface SatelliteConfigResponse {
	readonly port: number
	readonly token: string
	readonly tailscaleIp?: string | undefined
	readonly isRunning: boolean
	readonly connectedClients: number
}

/** Response for satellite:regenerate-token */
export interface SatelliteRegenerateTokenResponse {
	readonly newToken: string
}

/** Shape of the onboarding check response sent over IPC */
export interface OnboardingCheckResponse {
	readonly results: readonly {
		readonly name: string
		readonly command: string
		readonly installed: boolean
		readonly version?: string
		readonly required: boolean
		readonly installUrl: string
		readonly error?: string
	}[]
	readonly allRequiredInstalled: boolean
}
