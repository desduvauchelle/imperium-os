import type { McpServer, McpTool, McpToolCall, McpToolResult, Result } from '@imperium/shared-types'

// ============================================================================
// File System MCP - MCP-compliant File System operations (with Locking)
// ============================================================================

const FS_TOOLS: readonly McpTool[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    inputSchema: { path: { type: 'string' } },
    requiresPermission: 'file-read',
  },
  {
    name: 'write_file',
    description: 'Write content to a file',
    inputSchema: { path: { type: 'string' }, content: { type: 'string' } },
    requiresPermission: 'file-write',
  },
  {
    name: 'delete_file',
    description: 'Delete a file',
    inputSchema: { path: { type: 'string' } },
    requiresPermission: 'file-delete',
  },
  {
    name: 'list_directory',
    description: 'List contents of a directory',
    inputSchema: { path: { type: 'string' } },
    requiresPermission: 'file-read',
  },
] as const

export class FileSystemMcp implements Pick<McpServer, 'id' | 'name' | 'description' | 'version' | 'tools' | 'enabled'> {
  readonly id = 'mcp-fs'
  readonly name = 'File System'
  readonly description = 'MCP-compliant file system operations with locking'
  readonly version = '0.1.0'
  readonly tools = FS_TOOLS
  readonly enabled = true

  /**
   * Execute a tool call on this MCP server.
   * @throws {Error} Not implemented in Phase 1
   */
  async execute(call: McpToolCall): Promise<Result<McpToolResult>> {
    void call
    throw new Error('FileSystemMcp.execute: Not implemented (Phase 1 stub)')
  }

  /**
   * Acquire a lock on a file path.
   * @throws {Error} Not implemented in Phase 1
   */
  async acquireLock(path: string): Promise<Result<void>> {
    void path
    throw new Error('FileSystemMcp.acquireLock: Not implemented (Phase 1 stub)')
  }

  /**
   * Release a lock on a file path.
   * @throws {Error} Not implemented in Phase 1
   */
  async releaseLock(path: string): Promise<Result<void>> {
    void path
    throw new Error('FileSystemMcp.releaseLock: Not implemented (Phase 1 stub)')
  }
}
