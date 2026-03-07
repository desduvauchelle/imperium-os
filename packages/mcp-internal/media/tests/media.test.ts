import { describe, expect, test } from 'bun:test'
import {
	MediaMcp,
	IMAGE_PROVIDERS,
	DallEAdapter,
	ImagenAdapter,
	StableDiffusionAdapter,
	type FetchFn,
	type ImageGenerateResult,
	type ImageProvider,
} from '../src/index.js'
import { isMcpServer } from '@imperium/shared-types'
import type { McpToolCall } from '@imperium/shared-types'

// ============================================================================
// Helpers
// ============================================================================

function makeCall(toolName: string, args: Record<string, unknown> = {}, requestId = 'req-1'): McpToolCall {
	return { serverId: 'mcp-media', toolName, arguments: args, requestId }
}

function mockFetch(status: number, body: unknown): FetchFn {
	return async (_url: string, _init?: RequestInit) => ({
		ok: status >= 200 && status < 300,
		status,
		text: async () => JSON.stringify(body),
		json: async () => body,
		headers: new Headers(),
		redirected: false,
		statusText: 'OK',
		type: 'basic' as ResponseType,
		url: _url,
		clone: () => ({}) as Response,
		body: null,
		bodyUsed: false,
		arrayBuffer: async () => new ArrayBuffer(0),
		blob: async () => new Blob(),
		formData: async () => new FormData(),
		bytes: async () => new Uint8Array(),
	})
}

// ============================================================================
// MediaMcp tests
// ============================================================================

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

	test('has 3 tools', () => {
		const mcp = new MediaMcp()
		expect(mcp.tools.length).toBe(3)
		const names = mcp.tools.map((t) => t.name)
		expect(names).toContain('generate_image')
		expect(names).toContain('edit_image')
		expect(names).toContain('list_providers')
	})

	test('list_providers returns registered providers', async () => {
		const adapter = new DallEAdapter('key', mockFetch(200, { data: [{ url: 'https://img' }] }))
		const mcp = new MediaMcp([adapter])
		const result = await mcp.execute(makeCall('list_providers'))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(true)
			expect(result.value.data).toEqual(['dall-e'])
		}
	})

	test('generate_image missing prompt returns error', async () => {
		const mcp = new MediaMcp()
		const result = await mcp.execute(makeCall('generate_image', {}))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(false)
			expect(result.value.error).toContain('prompt')
		}
	})

	test('generate_image no provider returns error', async () => {
		const mcp = new MediaMcp()
		const result = await mcp.execute(makeCall('generate_image', { prompt: 'a cat' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(false)
			expect(result.value.error).toContain('No provider')
		}
	})

	test('generate_image unregistered provider returns error', async () => {
		const mcp = new MediaMcp()
		const result = await mcp.execute(makeCall('generate_image', { prompt: 'a cat', provider: 'dall-e' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(false)
			expect(result.value.error).toContain('No adapter')
		}
	})

	test('edit_image missing imagePath returns error', async () => {
		const mcp = new MediaMcp()
		const result = await mcp.execute(makeCall('edit_image', { prompt: 'x' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(false)
			expect(result.value.error).toContain('imagePath')
		}
	})

	test('unknown tool returns error', async () => {
		const mcp = new MediaMcp()
		const result = await mcp.execute(makeCall('nope'))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(false)
			expect(result.value.error).toContain('Unknown tool')
		}
	})

	test('registerProvider adds adapter', () => {
		const mcp = new MediaMcp()
		expect(mcp.getAvailableProviders().length).toBe(0)
		mcp.registerProvider(new DallEAdapter('key', mockFetch(200, {})))
		expect(mcp.getAvailableProviders()).toEqual(['dall-e'])
	})
})

// ============================================================================
// DallEAdapter tests
// ============================================================================

describe('DallEAdapter', () => {
	test('generate succeeds', async () => {
		const fetchFn = mockFetch(200, { data: [{ url: 'https://img.example/1.png' }] })
		const adapter = new DallEAdapter('test-key', fetchFn)
		const result = await adapter.generate('a cat', { width: 1024, height: 1024 })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.url).toBe('https://img.example/1.png')
			expect(result.value.provider).toBe('dall-e')
		}
	})

	test('generate failure returns error', async () => {
		const fetchFn = mockFetch(400, { error: 'bad request' })
		const adapter = new DallEAdapter('test-key', fetchFn)
		const result = await adapter.generate('a cat')
		expect(result.ok).toBe(false)
	})

	test('edit succeeds', async () => {
		const fetchFn = mockFetch(200, { data: [{ url: 'https://img.example/edited.png' }] })
		const adapter = new DallEAdapter('test-key', fetchFn)
		const result = await adapter.edit('https://original.png', 'make it blue')
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.value.url).toBe('https://img.example/edited.png')
	})
})

// ============================================================================
// ImagenAdapter tests
// ============================================================================

describe('ImagenAdapter', () => {
	test('generate succeeds', async () => {
		const fetchFn = mockFetch(200, { predictions: [{ bytesBase64Encoded: 'abc123' }] })
		const adapter = new ImagenAdapter('test-key', fetchFn)
		const result = await adapter.generate('a dog')
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.url).toContain('data:image/png;base64,abc123')
			expect(result.value.provider).toBe('imagen')
		}
	})

	test('generate failure returns error', async () => {
		const fetchFn = mockFetch(500, { error: 'server error' })
		const adapter = new ImagenAdapter('test-key', fetchFn)
		const result = await adapter.generate('a dog')
		expect(result.ok).toBe(false)
	})
})

// ============================================================================
// StableDiffusionAdapter tests
// ============================================================================

describe('StableDiffusionAdapter', () => {
	test('generate succeeds', async () => {
		const fetchFn = mockFetch(200, { images: ['base64data'] })
		const adapter = new StableDiffusionAdapter('http://localhost:7860', fetchFn)
		const result = await adapter.generate('a landscape', { width: 512, height: 512 })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.url).toContain('data:image/png;base64,base64data')
			expect(result.value.provider).toBe('stable-diffusion')
		}
	})

	test('edit succeeds', async () => {
		const fetchFn = mockFetch(200, { images: ['editeddata'] })
		const adapter = new StableDiffusionAdapter('http://localhost:7860', fetchFn)
		const result = await adapter.edit('data:image/png;base64,orig', 'make it red')
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.value.url).toContain('editeddata')
	})

	test('generate failure returns error', async () => {
		const fetchFn = mockFetch(500, { detail: 'error' })
		const adapter = new StableDiffusionAdapter('http://localhost:7860', fetchFn)
		const result = await adapter.generate('a cat')
		expect(result.ok).toBe(false)
	})
})

// ============================================================================
// Integration: generate_image through MCP
// ============================================================================

describe('MediaMcp integration', () => {
	test('generate_image via dall-e adapter', async () => {
		const fetchFn = mockFetch(200, { data: [{ url: 'https://img.example/gen.png' }] })
		const mcp = new MediaMcp([new DallEAdapter('key', fetchFn)])
		const result = await mcp.execute(makeCall('generate_image', { prompt: 'a sunset', provider: 'dall-e' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(true)
			const data = result.value.data as ImageGenerateResult
			expect(data.url).toBe('https://img.example/gen.png')
		}
	})

	test('generate_image uses default provider', async () => {
		const fetchFn = mockFetch(200, { images: ['b64'] })
		const mcp = new MediaMcp([new StableDiffusionAdapter('http://localhost:7860', fetchFn)])
		const result = await mcp.execute(makeCall('generate_image', { prompt: 'a mountain' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(true)
			const data = result.value.data as ImageGenerateResult
			expect(data.provider).toBe('stable-diffusion')
		}
	})

	test('edit_image via stable-diffusion', async () => {
		const fetchFn = mockFetch(200, { images: ['edited'] })
		const mcp = new MediaMcp([new StableDiffusionAdapter('http://localhost:7860', fetchFn)])
		const result = await mcp.execute(makeCall('edit_image', {
			imagePath: 'data:image/png;base64,orig',
			prompt: 'make it blue',
			provider: 'stable-diffusion',
		}))
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.value.success).toBe(true)
	})

	test('executionTimeMs is always set', async () => {
		const mcp = new MediaMcp()
		const result = await mcp.execute(makeCall('list_providers'))
		if (result.ok) expect(result.value.executionTimeMs).toBeGreaterThanOrEqual(0)
	})
})
