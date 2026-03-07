// ============================================================================
// @imperium/shared-types - Source of Truth for all TypeScript interfaces
// ============================================================================

// Branded types & constructors
export type {
  ProjectId,
  UserId,
  TaskId,
  AgentId,
  SessionId,
  MessageId,
  NotificationId,
  MemoryBlockId,
  Timestamp,
} from './brand.js'
export {
  createProjectId,
  createUserId,
  createTaskId,
  createAgentId,
  createSessionId,
  createMessageId,
  createNotificationId,
  createMemoryBlockId,
  createTimestamp,
} from './brand.js'

// Theme
export type { ThemeMode, ThemeConfig } from './theme.js'
export { THEME_MODES, isThemeMode } from './theme.js'

// Comfort Level
export type {
  ComfortLevel,
  ActionCategory,
  PermissionVerdict,
  ActionPermissionMap,
  ComfortLevelProfile,
} from './comfort-level.js'
export { COMFORT_LEVELS, isComfortLevel, DEFAULT_PROFILES } from './comfort-level.js'

// Project
export type { ProjectStatus, ProjectMetadata, ProjectConfig, Project } from './project.js'
export { PROJECT_STATUSES, isProjectStatus } from './project.js'

// Agent
export type { AgentState, AgentTask, AgentContext, AgentSnapshot } from './agent.js'
export { AGENT_STATES, isAgentState } from './agent.js'

// Memory
export type {
  ChatRole,
  ChatMessage,
  MemoryBlock,
  ContextSnapshot,
  SlidingWindowConfig,
} from './memory.js'
export { CHAT_ROLES, isChatRole, DEFAULT_SLIDING_WINDOW } from './memory.js'

// Costing
export type {
  ModelProvider,
  CostEntry,
  CostSummary,
  ModelUsage,
  RateLimit,
} from './costing.js'
export { MODEL_PROVIDERS, isModelProvider } from './costing.js'

// MCP
export type {
  McpServer,
  McpTool,
  McpToolCall,
  McpToolResult,
  McpPermission,
} from './mcp.js'
export { isMcpServer } from './mcp.js'

// Task / Kanban
export type {
  TaskStatus,
  TaskPriority,
  TaskComment,
  KanbanTask,
} from './task.js'
export { TASK_STATUSES, isTaskStatus } from './task.js'

// User & Auth
export type { AuthProvider, User, AuthSession } from './user.js'
export { AUTH_PROVIDERS, isAuthProvider } from './user.js'

// Notification
export type {
  NotificationType,
  NotificationPriority,
  Notification,
} from './notification.js'
export { NOTIFICATION_TYPES, isNotificationType } from './notification.js'

// IPC
export type {
  IpcChannel,
  IpcMessage,
  IpcResponse,
  IpcHandlerMap,
  OnboardingCheckResponse,
} from './ipc.js'

// LLM
export type {
  LlmProviderType,
  LlmRole,
  LlmMessage,
  LlmCompletionOptions,
  LlmCompletionResult,
  LlmProvider,
} from './llm.js'
export { LLM_PROVIDER_TYPES, isLlmProviderType } from './llm.js'

// Result
export type { Result } from './result.js'
export { ok, err, isOk, isErr } from './result.js'
