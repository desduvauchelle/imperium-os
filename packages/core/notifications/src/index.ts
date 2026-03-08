import type { Notification, NotificationType, NotificationPriority, Result, SuspensionContext, SatelliteServerConfig, SatellitePushEvent } from '@imperium/shared-types'
import { ok, err, createNotificationId, createTimestamp } from '@imperium/shared-types'

// ============================================================================
// Notification Server - In-Process Event Emitter
// ============================================================================

export interface NotificationServerConfig {
	readonly port: number
	readonly heartbeatIntervalMs: number
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationServerConfig = {
	port: 9100,
	heartbeatIntervalMs: 30_000,
}

/** Callback for notification subscriptions */
export type NotificationCallback = (notification: Notification) => void

/** Options for creating a notification */
export interface CreateNotificationOptions {
	readonly type: NotificationType
	readonly priority: NotificationPriority
	readonly title: string
	readonly message: string
	readonly sound?: boolean | undefined
	readonly actionUrl?: string | undefined
}

export class NotificationServer {
	readonly config: NotificationServerConfig
	private _isRunning = false
	private readonly _listeners: NotificationCallback[] = []
	private readonly _history: Notification[] = []

	constructor(config: Partial<NotificationServerConfig> = {}) {
		this.config = { ...DEFAULT_NOTIFICATION_CONFIG, ...config }
	}

	get isRunning(): boolean {
		return this._isRunning
	}

	/** Get all notifications that have been broadcast */
	get history(): readonly Notification[] {
		return this._history
	}

	/**
	 * Start the notification server.
	 * Enables broadcasting and subscription.
	 */
	async start(): Promise<Result<void>> {
		if (this._isRunning) {
			return err(new Error('NotificationServer is already running'))
		}
		this._isRunning = true
		return ok(undefined)
	}

	/**
	 * Subscribe to notifications.
	 * Returns an unsubscribe function.
	 */
	onNotification(callback: NotificationCallback): () => void {
		this._listeners.push(callback)
		return () => {
			const idx = this._listeners.indexOf(callback)
			if (idx >= 0) this._listeners.splice(idx, 1)
		}
	}

	/**
	 * Broadcast a notification to all subscribers.
	 * Server must be running.
	 */
	async broadcast(notification: Notification): Promise<Result<void>> {
		if (!this._isRunning) {
			return err(new Error('NotificationServer is not running'))
		}
		this._history.push(notification)
		for (const listener of this._listeners) {
			listener(notification)
		}
		return ok(undefined)
	}

	/**
	 * Create and broadcast a notification from options.
	 */
	async emit(options: CreateNotificationOptions): Promise<Result<Notification>> {
		const notification: Notification = {
			id: createNotificationId(crypto.randomUUID()),
			type: options.type,
			priority: options.priority,
			title: options.title,
			message: options.message,
			timestamp: createTimestamp(),
			read: false,
			sound: options.sound ?? false,
			...(options.actionUrl ? { actionUrl: options.actionUrl } : {}),
		}
		const result = await this.broadcast(notification)
		if (!result.ok) {
			return err(result.error)
		}
		return ok(notification)
	}

	/**
	 * Stop the notification server.
	 * Clears all listeners.
	 */
	async stop(): Promise<void> {
		this._isRunning = false
		this._listeners.length = 0
	}
}

// ============================================================================
// Factory functions for common notification patterns
// ============================================================================

/** Create a suspension notification for when an agent is blocked */
export function createSuspensionNotification(
	agentId: string,
	suspension: SuspensionContext,
): CreateNotificationOptions {
	return {
		type: 'action-required',
		priority: 'high',
		title: 'Agent Suspended',
		message: `Agent ${agentId} suspended: ${suspension.reason}`,
		sound: true,
		actionUrl: `imperium://agent/${agentId}/suspended`,
	}
}

/** Create an error notification */
export function createErrorNotification(
	title: string,
	message: string,
): CreateNotificationOptions {
	return {
		type: 'error',
		priority: 'high',
		title,
		message,
		sound: true,
	}
}

/** Create an info notification */
export function createInfoNotification(
	title: string,
	message: string,
): CreateNotificationOptions {
	return {
		type: 'info',
		priority: 'normal',
		title,
		message,
	}
}

// ============================================================================
// SatelliteServer — Real-time HTTP REST + WebSocket bridge (Phase 6)
// ============================================================================

/** A typed handler function that accepts unknown payload and returns unknown result */
export type HandlerFn = (payload: unknown) => Promise<unknown>

/** Map of channel name → handler function */
export type HandlerMap = ReadonlyMap<string, HandlerFn>

/** Minimal WebSocket handle for sending push events */
export interface WsHandle {
	send(data: string | Uint8Array): void
	close(): void
}

/** Minimal server handle returned by the serve function */
export interface ServerHandle {
	stop(closeActiveConnections?: boolean): void
}

/** Server options passed to the injectable serve function */
export interface SatelliteServeOptions {
	readonly port: number
	readonly fetch: (
		req: Request,
		server: { upgrade(req: Request): boolean },
	) => Response | undefined | Promise<Response | undefined>
	readonly websocket: {
		open(ws: WsHandle): void
		close(ws: WsHandle): void
		message(ws: WsHandle, message: string | Uint8Array): void
	}
}

/** Injectable serve function — defaults to Bun.serve in production */
export type ServeFn = (options: SatelliteServeOptions) => ServerHandle

/** Default serve function using Bun.serve */
// biome-ignore lint/suspicious/noExplicitAny: bridging to Bun runtime types
export const defaultServeFn: ServeFn = (options) => {
  // Access Bun dynamically so this module compiles in non-Bun TS environments.
  // At runtime this is only called in the Bun main process.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bun = (globalThis as any)['Bun'] as { serve: (o: unknown) => ServerHandle } | undefined
  if (!bun) throw new Error('defaultServeFn requires a Bun runtime')
  return bun.serve(options)
}

/**
 * SatelliteServer — exposes IPC handler logic over HTTP REST and WebSocket.
 *
 * REST: POST /api/:channel  (X-Imperium-Token for auth)
 * REST: GET  /health
 * WS:   ws://host:port/ws   (?token=<value>)
 *
 * Push events (satellite → clients) via push(SatellitePushEvent).
 */
export class SatelliteServer {
	readonly config: SatelliteServerConfig
	private readonly _serveFn: ServeFn
	private _handle: ServerHandle | undefined = undefined
	private readonly _clients = new Set<WsHandle>()

	constructor(config: SatelliteServerConfig, serveFn: ServeFn = defaultServeFn) {
		this.config = config
		this._serveFn = serveFn
	}

	get isRunning(): boolean {
		return this._handle !== undefined
	}

	get clientCount(): number {
		return this._clients.size
	}

	/**
	 * Start the server with the provided handler map.
	 */
	start(handlers: HandlerMap): Result<void> {
		if (this._handle !== undefined) {
			return err(new Error('SatelliteServer is already running'))
		}

		const self = this

		this._handle = this._serveFn({
			port: this.config.port,

			fetch(req, server) {
				const url = new URL(req.url)

				// WebSocket upgrade
				if (url.pathname === '/ws') {
					const token = url.searchParams.get('token')
					if (token !== self.config.token) {
						return new Response('Unauthorized', { status: 401 })
					}
					server.upgrade(req)
					return undefined
				}

				return self._handleHttp(req, handlers)
			},

			websocket: {
				open(ws) {
					self._clients.add(ws)
				},
				close(ws) {
					self._clients.delete(ws)
				},
				message(_ws, _msg) {
					// server → client only; ignore inbound messages
				},
			},
		})

		return ok(undefined)
	}

	/**
	 * Push a typed event to all connected WebSocket clients.
	 */
	push(event: SatellitePushEvent): void {
		const payload = JSON.stringify(event)
		for (const client of this._clients) {
			client.send(payload)
		}
	}

	/**
	 * Stop the server and disconnect all clients.
	 */
	stop(): void {
		for (const client of this._clients) {
			client.close()
		}
		this._clients.clear()
		if (this._handle !== undefined) {
			this._handle.stop(true)
			this._handle = undefined
		}
	}

	// -------------------------------------------------------------------------
	// Internal HTTP routing
	// -------------------------------------------------------------------------

	private async _handleHttp(req: Request, handlers: HandlerMap): Promise<Response> {
		// Validate token
		const token = req.headers.get('x-imperium-token')
		if (token !== this.config.token) {
			return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
		}

		const url = new URL(req.url)

		// Health check
		if (req.method === 'GET' && url.pathname === '/health') {
			return Response.json({ ok: true, version: '6.0', uptime: Date.now() })
		}

		// Channel dispatch: POST /api/:channel
		if (req.method === 'POST') {
			const match = url.pathname.match(/^\/api\/(.+)$/)
			if (match === null) {
				return Response.json({ ok: false, error: 'Not found' }, { status: 404 })
			}

			const channel = match[1] as string

			// Check allowed channels
			const allowed = this.config.allowedChannels as readonly string[]
			if (!allowed.includes(channel)) {
				return Response.json({ ok: false, error: `Channel '${channel}' not allowed` }, { status: 403 })
			}

			const handler = handlers.get(channel)
			if (handler === undefined) {
				return Response.json({ ok: false, error: `No handler for '${channel}'` }, { status: 404 })
			}

			let payload: unknown = undefined
			const contentType = req.headers.get('content-type') ?? ''
			if (contentType.includes('application/json')) {
				try {
					payload = await req.json()
				} catch {
					return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
				}
			}

			try {
				const data = await handler(payload)
				return Response.json({ ok: true, data })
			} catch (e) {
				const message = e instanceof Error ? e.message : 'Internal error'
				return Response.json({ ok: false, error: message }, { status: 500 })
			}
		}

		return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 })
	}
}
