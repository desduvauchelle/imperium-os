import type {
	IpcChannel,
	IpcHandlerMap,
	SatelliteClientConfig,
	SatelliteHttpResponse,
	SatellitePushEvent,
} from '@imperium/shared-types'

// ============================================================================
// Injectable function types (for testability)
// ============================================================================

/** Injectable fetch function type (mirrors globalThis.fetch signature) */
export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>

/** Injectable WebSocket constructor type */
export type WebSocketCtor = new (url: string) => WebSocket

/** Callback invoked when a push event arrives from the Master */
export type PushCallback = (event: SatellitePushEvent) => void

// ============================================================================
// SatelliteClient
// ============================================================================

const MAX_RECONNECT_DELAY_MS = 30_000
const BASE_RECONNECT_DELAY_MS = 1_000

/**
 * Browser-safe client for connecting a Satellite to the Master node.
 *
 * - REST: invoke<C>(channel, payload) → typed HTTP POST /api/:channel
 * - WebSocket: connect() / disconnect() + onPush() for real-time events
 * - Auto-reconnect with exponential backoff (capped at 30 s)
 */
export class SatelliteClient {
	readonly config: SatelliteClientConfig

	private readonly _fetchFn: FetchFn
	private readonly _WebSocketCtor: WebSocketCtor

	private _ws: WebSocket | undefined = undefined
	private _intentionalClose = false
	private _reconnectAttempt = 0
	private _reconnectTimer: ReturnType<typeof setTimeout> | undefined = undefined
	private readonly _pushListeners: PushCallback[] = []

	constructor(
		config: SatelliteClientConfig,
		opts: { fetchFn?: FetchFn; WebSocketCtor?: WebSocketCtor } = {},
	) {
		this.config = config
		this._fetchFn = opts.fetchFn ?? globalThis.fetch.bind(globalThis)
		this._WebSocketCtor = opts.WebSocketCtor ?? globalThis.WebSocket
	}

	// -------------------------------------------------------------------------
	// REST invoke
	// -------------------------------------------------------------------------

	/**
	 * Invoke an IPC channel on the Master via HTTP POST.
	 * Returns the typed response payload.
	 * Throws on network error or if the Master returns ok: false.
	 */
	async invoke<C extends IpcChannel>(
		channel: C,
		payload: IpcHandlerMap[C]['request'],
	): Promise<IpcHandlerMap[C]['response']> {
		const url = `${this.config.baseUrl}/api/${channel}`
		const hasBody = payload !== undefined && payload !== null

		const resp = await this._fetchFn(url, {
			method: 'POST',
			headers: {
				'x-imperium-token': this.config.token,
				...(hasBody ? { 'content-type': 'application/json' } : {}),
			},
			...(hasBody ? { body: JSON.stringify(payload) } : {}),
		})

		const json = (await resp.json()) as SatelliteHttpResponse<IpcHandlerMap[C]['response']>

		if (!json.ok) {
			throw new Error((json as { ok: false; error: string }).error)
		}

		return (json as { ok: true; data: IpcHandlerMap[C]['response'] }).data
	}

	// -------------------------------------------------------------------------
	// WebSocket lifecycle
	// -------------------------------------------------------------------------

	/**
	 * Open the WebSocket connection to the Master push channel.
	 * Automatically reconnects on unexpected disconnects.
	 */
	connect(): void {
		this._intentionalClose = false
		this._openWebSocket()
	}

	/**
	 * Close the WebSocket connection. Does not reconnect.
	 */
	disconnect(): void {
		this._intentionalClose = true
		if (this._reconnectTimer !== undefined) {
			clearTimeout(this._reconnectTimer)
			this._reconnectTimer = undefined
		}
		if (this._ws !== undefined) {
			this._ws.close()
			this._ws = undefined
		}
	}

	/** Whether the WebSocket is currently open */
	get isConnected(): boolean {
		return this._ws !== undefined && this._ws.readyState === 1 /* OPEN */
	}

	// -------------------------------------------------------------------------
	// Push subscriptions
	// -------------------------------------------------------------------------

	/**
	 * Subscribe to push events arriving from the Master.
	 * Returns an unsubscribe function.
	 */
	onPush(callback: PushCallback): () => void {
		this._pushListeners.push(callback)
		return () => {
			const idx = this._pushListeners.indexOf(callback)
			if (idx >= 0) this._pushListeners.splice(idx, 1)
		}
	}

	// -------------------------------------------------------------------------
	// Internal WebSocket management
	// -------------------------------------------------------------------------

	private _openWebSocket(): void {
		const wsUrl = this._buildWsUrl()
		const ws = new this._WebSocketCtor(wsUrl)
		this._ws = ws

		ws.onopen = () => {
			this._reconnectAttempt = 0
		}

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data as string) as SatellitePushEvent
				for (const listener of this._pushListeners) {
					listener(data)
				}
			} catch {
				// malformed JSON — ignore
			}
		}

		ws.onclose = () => {
			this._ws = undefined
			if (!this._intentionalClose) {
				this._scheduleReconnect()
			}
		}

		ws.onerror = () => {
			// Let onclose handle the reconnect
		}
	}

	private _scheduleReconnect(): void {
		const delay = Math.min(
			MAX_RECONNECT_DELAY_MS,
			BASE_RECONNECT_DELAY_MS * 2 ** this._reconnectAttempt,
		)
		this._reconnectAttempt++
		this._reconnectTimer = setTimeout(() => {
			this._reconnectTimer = undefined
			if (!this._intentionalClose) {
				this._openWebSocket()
			}
		}, delay)
	}

	private _buildWsUrl(): string {
		const base = this.config.baseUrl
			.replace(/^https?:\/\//, (m) => (m.startsWith('https') ? 'wss://' : 'ws://'))
		return `${base}/ws?token=${encodeURIComponent(this.config.token)}`
	}
}

// ============================================================================
// Factory
// ============================================================================

/** Create a SatelliteClient with the given configuration */
export function createSatelliteClient(
	config: SatelliteClientConfig,
	opts: { fetchFn?: FetchFn; WebSocketCtor?: WebSocketCtor } = {},
): SatelliteClient {
	return new SatelliteClient(config, opts)
}
