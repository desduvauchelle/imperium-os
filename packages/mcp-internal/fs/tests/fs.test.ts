import { describe, expect, test } from 'bun:test'
import { FileSystemMcp } from '../src/index.js'
import { isMcpServer } from '@imperium/shared-types'

describe('FileSystemMcp', () => {
  test('instantiates correctly', () => {
    const mcp = new FileSystemMcp()
    expect(mcp.id).toBe('mcp-fs')
    expect(mcp.name).toBe('File System')
    expect(mcp.enabled).toBe(true)
  })

  test('implements McpServer interface', () => {
    const mcp = new FileSystemMcp()
    expect(isMcpServer(mcp)).toBe(true)
  })

  test('has defined tools', () => {
    const mcp = new FileSystemMcp()
    expect(mcp.tools.length).toBeGreaterThan(0)
    const toolNames = mcp.tools.map((t) => t.name)
    expect(toolNames).toContain('read_file')
    expect(toolNames).toContain('write_file')
    expect(toolNames).toContain('delete_file')
    expect(toolNames).toContain('list_directory')
  })

  test('execute throws not-implemented', async () => {
    const mcp = new FileSystemMcp()
    await expect(mcp.execute({} as never)).rejects.toThrow('Not implemented')
  })

  test('acquireLock throws not-implemented', async () => {
    const mcp = new FileSystemMcp()
    await expect(mcp.acquireLock('/path')).rejects.toThrow('Not implemented')
  })

  test('releaseLock throws not-implemented', async () => {
    const mcp = new FileSystemMcp()
    await expect(mcp.releaseLock('/path')).rejects.toThrow('Not implemented')
  })
})
