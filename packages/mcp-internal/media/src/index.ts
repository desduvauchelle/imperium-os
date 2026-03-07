import type {
	McpServer,
	McpTool,
	McpToolCall,
	McpToolResult,
	Result,
} from '@imperium/shared-types'
import { ok } from '@imperium/shared-types'

// ============================================================================
// Media MCP - Image Gen (DALL-E, Imagen, Local SD)
// ============================================================================

/** Supported image generation providers */
export type ImageProvider = 'dall-e' | 'imagen' | 'stable-diffusion'

export const IMAGE_PROVIDERS: readonly ImageProvider[] = ['dall-e', 'imagen', 'stable-diffusion'] as const

// ============================================================================
// Injectable adapter interface
// ============================================================================

export interface ImageGenerateResult {
	readonly url: string
	readonly provider: ImageProvider
	readonly width: number
	readonly height: number
}

export interface ImageProviderAdapter {
	readonly provider: ImageProvider
	generate(prompt: string, opts: { width?: number; height?: number }): Promise<Result<ImageGenerateResult>>
	edit(imageUrl: string, prompt: string): Promise<Result<ImageGenerateResult>>
}

// ============================================================================
// Injectable FetchFn
// ============================================================================

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>

// ============================================================================
// DALL-E Adapter
// ============================================================================

export class DallEAdapter implements ImageProviderAdapter {
	readonly provider: ImageProvider = 'dall-e'
	private readonly apiKey: string
	private readonly fetchFn: FetchFn

	constructor(apiKey: string, fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
		this.apiKey = apiKey
		this.fetchFn = fetchFn
	}

	async generate(prompt: string, opts: { width?: number; height?: number } = {}): Promise<Result<ImageGenerateResult>> {
		const width = opts.width ?? 1024
		const height = opts.height ?? 1024
		try {
			const res = await this.fetchFn('https://api.openai.com/v1/images/generations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify({ model: 'dall-e-3', prompt, size: `${width}x${height}`, n: 1 }),
			})
			if (!res.ok) {
				const text = await res.text()
				return { ok: false, error: new Error(`DALL-E API error: ${text}`) }
			}
			const data = (await res.json()) as { data?: Array<{ url?: string }> }
			const url = data.data?.[0]?.url ?? ''
			return ok({ url, provider: 'dall-e', width, height })
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e : new Error(String(e)) }
		}
	}

	async edit(imageUrl: string, prompt: string): Promise<Result<ImageGenerateResult>> {
		// DALL-E edits require multipart form upload; simplified here
		try {
			const res = await this.fetchFn('https://api.openai.com/v1/images/edits', {
				method: 'POST',
				headers: { Authorization: `Bearer ${this.apiKey}` },
				body: JSON.stringify({ image: imageUrl, prompt, n: 1 }),
			})
			if (!res.ok) {
				const text = await res.text()
				return { ok: false, error: new Error(`DALL-E edit error: ${text}`) }
			}
			const data = (await res.json()) as { data?: Array<{ url?: string }> }
			const url = data.data?.[0]?.url ?? ''
			return ok({ url, provider: 'dall-e', width: 1024, height: 1024 })
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e : new Error(String(e)) }
		}
	}
}

// ============================================================================
// Imagen Adapter (Google Cloud)
// ============================================================================

export class ImagenAdapter implements ImageProviderAdapter {
	readonly provider: ImageProvider = 'imagen'
	private readonly apiKey: string
	private readonly fetchFn: FetchFn

	constructor(apiKey: string, fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
		this.apiKey = apiKey
		this.fetchFn = fetchFn
	}

	async generate(prompt: string, opts: { width?: number; height?: number } = {}): Promise<Result<ImageGenerateResult>> {
		const width = opts.width ?? 1024
		const height = opts.height ?? 1024
		try {
			const url = `https://generativelanguage.googleapis.com/v1/models/imagen-3.0-generate-002:predict?key=${this.apiKey}`
			const res = await this.fetchFn(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1 } }),
			})
			if (!res.ok) {
				const text = await res.text()
				return { ok: false, error: new Error(`Imagen API error: ${text}`) }
			}
			const data = (await res.json()) as { predictions?: Array<{ bytesBase64Encoded?: string }> }
			const b64 = data.predictions?.[0]?.bytesBase64Encoded ?? ''
			return ok({ url: `data:image/png;base64,${b64}`, provider: 'imagen', width, height })
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e : new Error(String(e)) }
		}
	}

	async edit(_imageUrl: string, prompt: string): Promise<Result<ImageGenerateResult>> {
		// Imagen edit is essentially a re-generate with prompt
		return this.generate(prompt)
	}
}

// ============================================================================
// Stable Diffusion Adapter (local API or hosted)
// ============================================================================

export class StableDiffusionAdapter implements ImageProviderAdapter {
	readonly provider: ImageProvider = 'stable-diffusion'
	private readonly baseUrl: string
	private readonly fetchFn: FetchFn

	constructor(baseUrl: string = 'http://127.0.0.1:7860', fetchFn: FetchFn = globalThis.fetch.bind(globalThis)) {
		this.baseUrl = baseUrl
		this.fetchFn = fetchFn
	}

	async generate(prompt: string, opts: { width?: number; height?: number } = {}): Promise<Result<ImageGenerateResult>> {
		const width = opts.width ?? 512
		const height = opts.height ?? 512
		try {
			const res = await this.fetchFn(`${this.baseUrl}/sdapi/v1/txt2img`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt, width, height, steps: 20 }),
			})
			if (!res.ok) {
				const text = await res.text()
				return { ok: false, error: new Error(`Stable Diffusion error: ${text}`) }
			}
			const data = (await res.json()) as { images?: string[] }
			const b64 = data.images?.[0] ?? ''
			return ok({ url: `data:image/png;base64,${b64}`, provider: 'stable-diffusion', width, height })
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e : new Error(String(e)) }
		}
	}

	async edit(imageUrl: string, prompt: string): Promise<Result<ImageGenerateResult>> {
		const width = 512
		const height = 512
		try {
			const res = await this.fetchFn(`${this.baseUrl}/sdapi/v1/img2img`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ init_images: [imageUrl], prompt, width, height, steps: 20 }),
			})
			if (!res.ok) {
				const text = await res.text()
				return { ok: false, error: new Error(`Stable Diffusion edit error: ${text}`) }
			}
			const data = (await res.json()) as { images?: string[] }
			const b64 = data.images?.[0] ?? ''
			return ok({ url: `data:image/png;base64,${b64}`, provider: 'stable-diffusion', width, height })
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e : new Error(String(e)) }
		}
	}
}

// ============================================================================
// Media MCP — tool dispatch
// ============================================================================

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
	{
		name: 'list_providers',
		description: 'List available image generation providers',
		inputSchema: {},
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

	private readonly providers = new Map<ImageProvider, ImageProviderAdapter>()
	private defaultProvider: ImageProvider | undefined

	constructor(adapters: readonly ImageProviderAdapter[] = []) {
		for (const adapter of adapters) {
			this.providers.set(adapter.provider, adapter)
		}
		if (adapters.length > 0) {
			this.defaultProvider = adapters[0]!.provider
		}
	}

	registerProvider(adapter: ImageProviderAdapter): void {
		this.providers.set(adapter.provider, adapter)
		if (!this.defaultProvider) this.defaultProvider = adapter.provider
	}

	getAvailableProviders(): readonly ImageProvider[] {
		return [...this.providers.keys()]
	}

	async execute(call: McpToolCall): Promise<Result<McpToolResult>> {
		const start = Date.now()
		const args = call.arguments as Record<string, unknown>

		try {
			switch (call.toolName) {
				case 'generate_image': {
					const prompt = args['prompt'] as string | undefined
					if (!prompt) return this.toolError(call.requestId, start, 'Missing required argument: prompt')
					const providerName = (args['provider'] as ImageProvider | undefined) ?? this.defaultProvider
					if (!providerName) return this.toolError(call.requestId, start, 'No provider specified and no default configured')
					const adapter = this.providers.get(providerName)
					if (!adapter) return this.toolError(call.requestId, start, `No adapter registered for provider: ${providerName}`)

					const width = args['width'] as number | undefined
					const height = args['height'] as number | undefined
					const opts: { width?: number; height?: number } = {}
					if (width !== undefined) opts.width = width
					if (height !== undefined) opts.height = height
					const result = await adapter.generate(prompt, opts)
					if (!result.ok) return this.toolError(call.requestId, start, result.error.message)
					return ok(this.toolResult(call.requestId, start, result.value))
				}
				case 'edit_image': {
					const imagePath = args['imagePath'] as string | undefined
					if (!imagePath) return this.toolError(call.requestId, start, 'Missing required argument: imagePath')
					const prompt = args['prompt'] as string | undefined
					if (!prompt) return this.toolError(call.requestId, start, 'Missing required argument: prompt')
					const providerName = (args['provider'] as ImageProvider | undefined) ?? this.defaultProvider
					if (!providerName) return this.toolError(call.requestId, start, 'No provider specified and no default configured')
					const adapter = this.providers.get(providerName)
					if (!adapter) return this.toolError(call.requestId, start, `No adapter registered for provider: ${providerName}`)

					const result = await adapter.edit(imagePath, prompt)
					if (!result.ok) return this.toolError(call.requestId, start, result.error.message)
					return ok(this.toolResult(call.requestId, start, result.value))
				}
				case 'list_providers': {
					return ok(this.toolResult(call.requestId, start, this.getAvailableProviders()))
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
