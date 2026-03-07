import type { McpServer, McpTool, McpToolCall, McpToolResult, Result } from '@imperium/shared-types'

// ============================================================================
// Media MCP - Image Gen (DALL-E, Imagen, Local SD)
// ============================================================================

/** Supported image generation providers */
export type ImageProvider = 'dall-e' | 'imagen' | 'stable-diffusion'

export const IMAGE_PROVIDERS: readonly ImageProvider[] = ['dall-e', 'imagen', 'stable-diffusion'] as const

const MEDIA_TOOLS: readonly McpTool[] = [
  {
    name: 'generate_image',
    description: 'Generate an image from a text prompt',
    inputSchema: {
      prompt: { type: 'string' },
      provider: { type: 'string' },
      width: { type: 'number' },
      height: { type: 'number' },
    },
    requiresPermission: 'network-request',
  },
  {
    name: 'edit_image',
    description: 'Edit an existing image with a text prompt',
    inputSchema: {
      imagePath: { type: 'string' },
      prompt: { type: 'string' },
      provider: { type: 'string' },
    },
    requiresPermission: 'network-request',
  },
] as const

export class MediaMcp implements Pick<McpServer, 'id' | 'name' | 'description' | 'version' | 'tools' | 'enabled'> {
  readonly id = 'mcp-media'
  readonly name = 'Media'
  readonly description = 'Image generation via DALL-E, Imagen, and local Stable Diffusion'
  readonly version = '0.1.0'
  readonly tools = MEDIA_TOOLS
  readonly enabled = true

  /**
   * Execute a tool call on this MCP server.
   * @throws {Error} Not implemented in Phase 1
   */
  async execute(call: McpToolCall): Promise<Result<McpToolResult>> {
    void call
    throw new Error('MediaMcp.execute: Not implemented (Phase 1 stub)')
  }
}
