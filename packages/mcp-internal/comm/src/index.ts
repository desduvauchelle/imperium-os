import type { McpServer, McpTool, McpToolCall, McpToolResult, Result } from '@imperium/shared-types'

// ============================================================================
// Communication MCP - Discord, Telegram, WhatsApp, Email
// ============================================================================

/** Supported communication channels */
export type CommChannel = 'discord' | 'telegram' | 'whatsapp' | 'email'

export const COMM_CHANNELS: readonly CommChannel[] = ['discord', 'telegram', 'whatsapp', 'email'] as const

const COMM_TOOLS: readonly McpTool[] = [
  {
    name: 'send_message',
    description: 'Send a message via a communication channel',
    inputSchema: { channel: { type: 'string' }, recipient: { type: 'string' }, message: { type: 'string' } },
    requiresPermission: 'network-request',
  },
  {
    name: 'read_messages',
    description: 'Read recent messages from a communication channel',
    inputSchema: { channel: { type: 'string' }, limit: { type: 'number' } },
    requiresPermission: 'network-request',
  },
] as const

export class CommunicationMcp implements Pick<McpServer, 'id' | 'name' | 'description' | 'version' | 'tools' | 'enabled'> {
  readonly id = 'mcp-comm'
  readonly name = 'Communication'
  readonly description = 'Discord, Telegram, WhatsApp, and Email integration'
  readonly version = '0.1.0'
  readonly tools = COMM_TOOLS
  readonly enabled = true

  /**
   * Execute a tool call on this MCP server.
   * @throws {Error} Not implemented in Phase 1
   */
  async execute(call: McpToolCall): Promise<Result<McpToolResult>> {
    void call
    throw new Error('CommunicationMcp.execute: Not implemented (Phase 1 stub)')
  }
}
