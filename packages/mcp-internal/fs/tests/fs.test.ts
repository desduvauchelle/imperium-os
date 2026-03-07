import { describe, expect, test, beforeEach } from 'bun:test'
import { FileSystemMcp, FileLockManager, type FsOps } from '../src/index.js'
import { isMcpServer } from '@imperium/shared-types'
import type { McpToolCall, Timestamp } from '@imperium/shared-types'

// ============================================================================
// Mock FsOps
// ============================================================================

function createMockFs(store: Map<string, string> = new Map()): FsOps {
	return {
		async readFile(path) {
			const val = store.get(path)
			if (val === undefined) throw new Error(`ENOENT: ${path}`)
			return val
		},
		async writeFile(path, content) {
			store.set(path, content)
		},
		async unlink(path) {
			if (!store.has(path)) throw new Error(`ENOENT: ${path}`)
			store.delete(path)
		},
		async readdir(_path) {
			const prefix = _path.endsWith('/') ? _path : `${_path}/`
			const entries: string[] = []
			for (const key of store.keys()) {
				if (key.startsWith(prefix)) {
					const rest = key.slice(prefix.length)
					const name = rest.split('/')[0]!
					if (name && !entries.includes(name)) entries.push(name)
				}
			}
			return entries
		},
		async mkdir(_path) {
			// no-op in mock
		},
		async stat(path) {
			const val = store.get(path)
			if (val === undefined) throw new Error(`ENOENT: ${path}`)
			return { size: val.length, isFile: true, isDirectory: false, modifiedAt: Date.now() }
		},
	}
}

function makeCall(toolName: string, args: Record<string, unknown> = {}, requestId = 'req-1', serverId = 'mcp-fs'): McpToolCall {
	return { serverId, toolName, arguments: args, requestId }
}

// ============================================================================
// FileLockManager tests
// ============================================================================

describe('FileLockManager', () => {
	let mgr: FileLockManager

	beforeEach(() => {
		mgr = new FileLockManager({ defaultTimeoutMs: 5000 })
	})

	test('starts empty', () => {
		expect(mgr.size).toBe(0)
		expect(mgr.getAllLocks()).toEqual([])
	})

	test('acquireLock succeeds', () => {
		const result = mgr.acquireLock('/a.txt', 'owner-1')
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.path).toBe('/a.txt')
			expect(result.value.ownerId).toBe('owner-1')
		}
		expect(mgr.size).toBe(1)
	})

	test('acquireLock same owner re-acquires', () => {
		mgr.acquireLock('/a.txt', 'owner-1')
		const result = mgr.acquireLock('/a.txt', 'owner-1')
		expect(result.ok).toBe(true)
		expect(mgr.size).toBe(1)
	})

	test('acquireLock different owner fails', () => {
		mgr.acquireLock('/a.txt', 'owner-1')
		const result = mgr.acquireLock('/a.txt', 'owner-2')
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error.message).toContain('locked by')
		}
	})

	test('releaseLock succeeds for owner', () => {
		mgr.acquireLock('/a.txt', 'owner-1')
		const result = mgr.releaseLock('/a.txt', 'owner-1')
		expect(result.ok).toBe(true)
		expect(mgr.size).toBe(0)
	})

	test('releaseLock is idempotent for nonexistent', () => {
		const result = mgr.releaseLock('/no-such.txt', 'owner-1')
		expect(result.ok).toBe(true)
	})

	test('releaseLock fails for wrong owner', () => {
		mgr.acquireLock('/a.txt', 'owner-1')
		const result = mgr.releaseLock('/a.txt', 'owner-2')
		expect(result.ok).toBe(false)
	})

	test('getStatus returns unlocked for no lock', () => {
		const s = mgr.getStatus('/a.txt')
		expect(s.locked).toBe(false)
		expect(s.lockedBy).toBeUndefined()
	})

	test('getStatus returns locked info', () => {
		mgr.acquireLock('/a.txt', 'owner-1')
		const s = mgr.getStatus('/a.txt')
		expect(s.locked).toBe(true)
		expect(s.lockedBy).toBe('owner-1')
		expect(s.acquiredAt).toBeDefined()
		expect(s.expiresAt).toBeDefined()
	})

	test('cleanExpired removes expired locks', () => {
		// Acquire with a very short timeout that has already passed
		mgr.acquireLock('/a.txt', 'owner-1', 1)
		// Wait a tiny bit to ensure expiry
		const start = Date.now()
		while (Date.now() - start < 5) { /* spin */ }
		mgr.cleanExpired()
		expect(mgr.size).toBe(0)
	})

	test('getAllLocks returns all active', () => {
		mgr.acquireLock('/a.txt', 'owner-1')
		mgr.acquireLock('/b.txt', 'owner-2')
		const locks = mgr.getAllLocks()
		expect(locks.length).toBe(2)
	})

	test('custom timeout is used', () => {
		mgr.acquireLock('/a.txt', 'owner-1', 60000)
		const s = mgr.getStatus('/a.txt')
		expect(s.locked).toBe(true)
		if (s.expiresAt && s.acquiredAt) {
			const diffMs = new Date(s.expiresAt as string).getTime() - new Date(s.acquiredAt as string).getTime()
			expect(diffMs).toBeGreaterThanOrEqual(59000)
		}
	})
})

// ============================================================================
// FileSystemMcp tests
// ============================================================================

describe('FileSystemMcp', () => {
	let store: Map<string, string>
	let mcp: FileSystemMcp

	beforeEach(() => {
		store = new Map([
			['/tmp/hello.txt', 'Hello world'],
			['/tmp/dir/a.txt', 'A'],
			['/tmp/dir/b.txt', 'B'],
		])
		mcp = new FileSystemMcp(createMockFs(store))
	})

	test('instantiates correctly', () => {
		expect(mcp.id).toBe('mcp-fs')
		expect(mcp.name).toBe('File System')
		expect(mcp.enabled).toBe(true)
	})

	test('implements McpServer interface', () => {
		expect(isMcpServer(mcp)).toBe(true)
	})

	test('has 6 tools', () => {
		expect(mcp.tools.length).toBe(6)
		const names = mcp.tools.map((t) => t.name)
		expect(names).toContain('read_file')
		expect(names).toContain('write_file')
		expect(names).toContain('delete_file')
		expect(names).toContain('list_directory')
		expect(names).toContain('create_directory')
		expect(names).toContain('stat_file')
	})

	// -- read_file --
	test('read_file returns file content', async () => {
		const result = await mcp.execute(makeCall('read_file', { path: '/tmp/hello.txt' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(true)
			expect(result.value.data).toBe('Hello world')
		}
	})

	test('read_file missing path returns error', async () => {
		const result = await mcp.execute(makeCall('read_file', {}))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(false)
			expect(result.value.error).toContain('path')
		}
	})

	test('read_file nonexistent returns error', async () => {
		const result = await mcp.execute(makeCall('read_file', { path: '/nope' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(false)
			expect(result.value.error).toContain('ENOENT')
		}
	})

	// -- write_file --
	test('write_file writes content', async () => {
		const result = await mcp.execute(makeCall('write_file', { path: '/tmp/new.txt', content: 'new content' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(true)
			expect(result.value.data).toContain('11 bytes')
		}
		expect(store.get('/tmp/new.txt')).toBe('new content')
	})

	test('write_file missing content returns error', async () => {
		const result = await mcp.execute(makeCall('write_file', { path: '/tmp/new.txt' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(false)
			expect(result.value.error).toContain('content')
		}
	})

	test('write_file fails when file is locked by another owner', async () => {
		mcp.lockManager.acquireLock('/tmp/hello.txt', 'other-owner')
		const result = await mcp.execute(makeCall('write_file', { path: '/tmp/hello.txt', content: 'x' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(false)
			expect(result.value.error).toContain('locked')
		}
	})

	// -- delete_file --
	test('delete_file removes file', async () => {
		const result = await mcp.execute(makeCall('delete_file', { path: '/tmp/hello.txt' }))
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.value.success).toBe(true)
		expect(store.has('/tmp/hello.txt')).toBe(false)
	})

	test('delete_file fails on locked file', async () => {
		mcp.lockManager.acquireLock('/tmp/hello.txt', 'other-owner')
		const result = await mcp.execute(makeCall('delete_file', { path: '/tmp/hello.txt' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(false)
			expect(result.value.error).toContain('locked')
		}
	})

	// -- list_directory --
	test('list_directory lists entries', async () => {
		const result = await mcp.execute(makeCall('list_directory', { path: '/tmp/dir' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(true)
			const data = result.value.data as string[]
			expect(data).toContain('a.txt')
			expect(data).toContain('b.txt')
		}
	})

	// -- create_directory --
	test('create_directory succeeds', async () => {
		const result = await mcp.execute(makeCall('create_directory', { path: '/tmp/newdir' }))
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.value.success).toBe(true)
	})

	// -- stat_file --
	test('stat_file returns metadata', async () => {
		const result = await mcp.execute(makeCall('stat_file', { path: '/tmp/hello.txt' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(true)
			const data = result.value.data as { size: number; isFile: boolean }
			expect(data.size).toBe(11)
			expect(data.isFile).toBe(true)
		}
	})

	// -- unknown tool --
	test('unknown tool returns error', async () => {
		const result = await mcp.execute(makeCall('no_such_tool', { path: '/tmp/hello.txt' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(false)
			expect(result.value.error).toContain('Unknown tool')
		}
	})

	// -- executionTimeMs always present --
	test('executionTimeMs is always set', async () => {
		const result = await mcp.execute(makeCall('read_file', { path: '/tmp/hello.txt' }))
		if (result.ok) {
			expect(result.value.executionTimeMs).toBeGreaterThanOrEqual(0)
		}
	})
})
