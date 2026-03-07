import type { Notification, NotificationType, NotificationPriority, Result, SuspensionContext } from '@imperium/shared-types'
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
