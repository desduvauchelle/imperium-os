import type { ActionCategory, PermissionVerdict } from './comfort-level.js'
import type { Timestamp } from './brand.js'

// ============================================================================
// MCP Types (Model Context Protocol)
// ============================================================================

/** MCP server registration */
export interface McpServer {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly version: string
  readonly tools: readonly McpTool[]
  readonly enabled: boolean
}

/** MCP tool definition */
export interface McpTool {
  readonly name: string
  readonly description: string
  readonly inputSchema: Readonly<Record<string, unknown>>
  readonly requiresPermission: ActionCategory
}

/** MCP tool call request */
export interface McpToolCall {
  readonly serverId: string
  readonly toolName: string
  readonly arguments: Readonly<Record<string, unknown>>
  readonly requestId: string
}

/** Result of an MCP tool call */
export interface McpToolResult {
  readonly requestId: string
  readonly success: boolean
  readonly data?: unknown
  readonly error?: string | undefined
  readonly executionTimeMs: number
}

/** Permission check result for an MCP action */
export interface McpPermission {
  readonly action: ActionCategory
  readonly verdict: PermissionVerdict
  readonly reason: string
}

// ============================================================================
// File Locking Types
// ============================================================================

/** A file lock entry held by an owner */
export interface FileLockEntry {
	readonly path: string
	readonly ownerId: string
	readonly acquiredAt: Timestamp
	readonly expiresAt: Timestamp
}

/** Status of a file lock */
export interface FileLockStatus {
	readonly locked: boolean
	readonly lockedBy?: string | undefined
	readonly acquiredAt?: Timestamp | undefined
	readonly expiresAt?: Timestamp | undefined
}

// ============================================================================
// Communication Config Types
// ============================================================================

/** Discord webhook config */
export interface DiscordConfig {
	readonly webhookUrl: string
}

/** Telegram bot config */
export interface TelegramConfig {
	readonly botToken: string
	readonly defaultChatId?: string | undefined
}

/** WhatsApp / Twilio config */
export interface WhatsAppConfig {
	readonly accountSid: string
	readonly authToken: string
	readonly fromNumber: string
}

/** Email / SMTP config */
export interface EmailConfig {
	readonly smtpHost: string
	readonly smtpPort: number
	readonly username: string
	readonly password: string
	readonly fromAddress: string
}

/** Aggregate comm config */
export interface CommConfig {
	readonly discord?: DiscordConfig | undefined
	readonly telegram?: TelegramConfig | undefined
	readonly whatsapp?: WhatsAppConfig | undefined
	readonly email?: EmailConfig | undefined
}

// ============================================================================
// MCP Server Summary (for IPC)
// ============================================================================

/** Lightweight summary of an MCP server for IPC/UI */
export interface McpServerSummary {
	readonly id: string
	readonly name: string
	readonly description: string
	readonly version: string
	readonly toolCount: number
	readonly enabled: boolean
}

/** Type guard to check if a value implements McpServer interface shape */
export function isMcpServer(value: unknown): value is McpServer {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['name'] === 'string' &&
    typeof obj['description'] === 'string' &&
    typeof obj['version'] === 'string' &&
    Array.isArray(obj['tools']) &&
    typeof obj['enabled'] === 'boolean'
  )
}
