import type { ActionCategory, PermissionVerdict } from './comfort-level.js'

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
