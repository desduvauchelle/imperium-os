import { describe, expect, test } from 'bun:test'
import { CommunicationMcp, COMM_CHANNELS } from '../src/index.js'
import { isMcpServer } from '@imperium/shared-types'

describe('CommunicationMcp', () => {
  test('instantiates correctly', () => {
    const mcp = new CommunicationMcp()
    expect(mcp.id).toBe('mcp-comm')
    expect(mcp.name).toBe('Communication')
    expect(mcp.enabled).toBe(true)
  })

  test('implements McpServer interface', () => {
    const mcp = new CommunicationMcp()
    expect(isMcpServer(mcp)).toBe(true)
  })

  test('COMM_CHANNELS includes all channels', () => {
    expect(COMM_CHANNELS).toEqual(['discord', 'telegram', 'whatsapp', 'email'])
  })

  test('has defined tools', () => {
    const mcp = new CommunicationMcp()
    expect(mcp.tools.length).toBeGreaterThan(0)
    const toolNames = mcp.tools.map((t) => t.name)
    expect(toolNames).toContain('send_message')
    expect(toolNames).toContain('read_messages')
  })

  test('execute throws not-implemented', async () => {
    const mcp = new CommunicationMcp()
    await expect(mcp.execute({} as never)).rejects.toThrow('Not implemented')
  })
})
