import type {
	McpServer,
	McpTool,
	McpToolCall,
	McpToolResult,
	Result,
	FileLockEntry,
	FileLockStatus,
	Timestamp,
} from '@imperium/shared-types'
import { ok, err, createTimestamp } from '@imperium/shared-types'

// ============================================================================
// Injectable file system operations
// ============================================================================

export interface FsOps {
	readFile(path: string): Promise<string>
	writeFile(path: string, content: string): Promise<void>
	unlink(path: string): Promise<void>
	readdir(path: string): Promise<readonly string[]>
	mkdir(path: string, opts?: { recursive?: boolean }): Promise<void>
	stat(path: string): Promise<{ size: number; isFile: boolean; isDirectory: boolean; modifiedAt: number }>
}

// ============================================================================
// File Lock Manager — In-memory lock store with expiry
// ============================================================================

export interface FileLockManagerConfig {
	readonly defaultTimeoutMs: number
}

export const DEFAULT_LOCK_CONFIG: FileLockManagerConfig = {
	defaultTimeoutMs: 30_000,
}

export class FileLockManager {
	readonly config: FileLockManagerConfig
	private readonly _locks = new Map<string, FileLockEntry>()

	constructor(config: Partial<FileLockManagerConfig> = {}) {
		this.config = { ...DEFAULT_LOCK_CONFIG, ...config }
	}

	acquireLock(path: string, ownerId: string, timeoutMs?: number): Result<FileLockEntry> {
		this.cleanExpired()
		const existing = this._locks.get(path)
		if (existing && existing.ownerId !== ownerId) {
			return err(new Error(`File '${path}' is locked by '${existing.ownerId}'`))
		}
		const now = Date.now()
		const expiresAt = new Date(now + (timeoutMs ?? this.config.defaultTimeoutMs))
		const entry: FileLockEntry = {
			path,
			ownerId,
			acquiredAt: createTimestamp(),
			expiresAt: createTimestamp(expiresAt),
		}
		this._locks.set(path, entry)
		return ok(entry)
	}

	releaseLock(path: string, ownerId: string): Result<void> {
		const existing = this._locks.get(path)
		if (!existing) {
			return ok(undefined)
		}
		if (existing.ownerId !== ownerId) {
			return err(new Error(`Cannot release lock on '${path}': owned by '${existing.ownerId}'`))
		}
		this._locks.delete(path)
		return ok(undefined)
	}

	getStatus(path: string): FileLockStatus {
		this.cleanExpired()
		const entry = this._locks.get(path)
		if (!entry) {
			return { locked: false }
		}
		return {
			locked: true,
			lockedBy: entry.ownerId,
			acquiredAt: entry.acquiredAt,
			expiresAt: entry.expiresAt,
		}
	}

	getAllLocks(): readonly FileLockEntry[] {
		this.cleanExpired()
		return [...this._locks.values()]
	}

	cleanExpired(): void {
		const now = new Date().toISOString()
		for (const [path, entry] of this._locks) {
			if ((entry.expiresAt as string) <= now) {
				this._locks.delete(path)
			}
		}
	}

	get size(): number {
		this.cleanExpired()
		return this._locks.size
	}
}

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
	{
		name: 'create_directory',
		description: 'Create a directory (recursive)',
		inputSchema: { path: { type: 'string' } },
		requiresPermission: 'file-write',
	},
	{
		name: 'stat_file',
		description: 'Get file or directory metadata',
		inputSchema: { path: { type: 'string' } },
		requiresPermission: 'file-read',
	},
] as const

const AGENT_OWNER_ID = 'imperium-agent'

export class FileSystemMcp implements Pick<McpServer, 'id' | 'name' | 'description' | 'version' | 'tools' | 'enabled'> {
	readonly id = 'mcp-fs'
	readonly name = 'File System'
	readonly description = 'MCP-compliant file system operations with locking'
	readonly version = '0.1.0'
	readonly tools = FS_TOOLS
	readonly enabled = true

	private readonly fs: FsOps
	readonly lockManager: FileLockManager

	constructor(fs: FsOps, lockManager?: FileLockManager) {
		this.fs = fs
		this.lockManager = lockManager ?? new FileLockManager()
	}

	async execute(call: McpToolCall): Promise<Result<McpToolResult>> {
		const start = Date.now()
		const args = call.arguments as Record<string, unknown>
		const path = args['path'] as string | undefined

		try {
			switch (call.toolName) {
				case 'read_file': {
					if (!path) return this.toolError(call.requestId, start, 'Missing required argument: path')
					const content = await this.fs.readFile(path)
					return ok(this.toolResult(call.requestId, start, content))
				}
				case 'write_file': {
					if (!path) return this.toolError(call.requestId, start, 'Missing required argument: path')
					const content = args['content'] as string | undefined
					if (content === undefined) return this.toolError(call.requestId, start, 'Missing required argument: content')
					const lockResult = this.lockManager.acquireLock(path, AGENT_OWNER_ID)
					if (!lockResult.ok) return this.toolError(call.requestId, start, lockResult.error.message)
					try {
						await this.fs.writeFile(path, content)
						return ok(this.toolResult(call.requestId, start, `Written ${content.length} bytes to ${path}`))
					} finally {
						this.lockManager.releaseLock(path, AGENT_OWNER_ID)
					}
				}
				case 'delete_file': {
					if (!path) return this.toolError(call.requestId, start, 'Missing required argument: path')
					const lockResult = this.lockManager.acquireLock(path, AGENT_OWNER_ID)
					if (!lockResult.ok) return this.toolError(call.requestId, start, lockResult.error.message)
					try {
						await this.fs.unlink(path)
						return ok(this.toolResult(call.requestId, start, `Deleted ${path}`))
					} finally {
						this.lockManager.releaseLock(path, AGENT_OWNER_ID)
					}
				}
				case 'list_directory': {
					if (!path) return this.toolError(call.requestId, start, 'Missing required argument: path')
					const entries = await this.fs.readdir(path)
					return ok(this.toolResult(call.requestId, start, entries))
				}
				case 'create_directory': {
					if (!path) return this.toolError(call.requestId, start, 'Missing required argument: path')
					await this.fs.mkdir(path, { recursive: true })
					return ok(this.toolResult(call.requestId, start, `Created directory ${path}`))
				}
				case 'stat_file': {
					if (!path) return this.toolError(call.requestId, start, 'Missing required argument: path')
					const info = await this.fs.stat(path)
					return ok(this.toolResult(call.requestId, start, info))
				}
				default:
					return this.toolError(call.requestId, start, `Unknown tool: ${call.toolName}`)
			}
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e)
			return this.toolError(call.requestId, start, message)
		}
	}

	private toolResult(requestId: string, startMs: number, data: unknown): McpToolResult {
		return { requestId, success: true, data, executionTimeMs: Date.now() - startMs }
	}

	private toolError(requestId: string, startMs: number, message: string): Result<McpToolResult> {
		return ok({ requestId, success: false, error: message, executionTimeMs: Date.now() - startMs })
	}
}
