import { describe, expect, test } from 'bun:test'
import { MediaMcp, IMAGE_PROVIDERS } from '../src/index.js'
import { isMcpServer } from '@imperium/shared-types'

describe('MediaMcp', () => {
  test('instantiates correctly', () => {
    const mcp = new MediaMcp()
    expect(mcp.id).toBe('mcp-media')
    expect(mcp.name).toBe('Media')
    expect(mcp.enabled).toBe(true)
  })

  test('implements McpServer interface', () => {
    const mcp = new MediaMcp()
    expect(isMcpServer(mcp)).toBe(true)
  })

  test('IMAGE_PROVIDERS includes all providers', () => {
    expect(IMAGE_PROVIDERS).toEqual(['dall-e', 'imagen', 'stable-diffusion'])
  })

  test('has defined tools', () => {
    const mcp = new MediaMcp()
    expect(mcp.tools.length).toBeGreaterThan(0)
    const toolNames = mcp.tools.map((t) => t.name)
    expect(toolNames).toContain('generate_image')
    expect(toolNames).toContain('edit_image')
  })

  test('execute throws not-implemented', async () => {
    const mcp = new MediaMcp()
    await expect(mcp.execute({} as never)).rejects.toThrow('Not implemented')
  })
})
