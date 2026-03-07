import type { Notification, Result } from '@imperium/shared-types'

// ============================================================================
// Notification Server - WebSocket Master-to-Satellite
// ============================================================================

export interface NotificationServerConfig {
  readonly port: number
  readonly heartbeatIntervalMs: number
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationServerConfig = {
  port: 9100,
  heartbeatIntervalMs: 30_000,
}

export class NotificationServer {
  readonly config: NotificationServerConfig
  private _isRunning = false

  constructor(config: Partial<NotificationServerConfig> = {}) {
    this.config = { ...DEFAULT_NOTIFICATION_CONFIG, ...config }
  }

  get isRunning(): boolean {
    return this._isRunning
  }

  /**
   * Start the WebSocket notification server.
   * @throws {Error} Not implemented in Phase 1
   */
  async start(): Promise<Result<void>> {
    throw new Error('NotificationServer.start: Not implemented (Phase 1 stub)')
  }

  /**
   * Broadcast a notification to all connected satellites.
   * @throws {Error} Not implemented in Phase 1
   */
  async broadcast(notification: Notification): Promise<Result<void>> {
    void notification
    throw new Error('NotificationServer.broadcast: Not implemented (Phase 1 stub)')
  }

  /**
   * Stop the notification server.
   * @throws {Error} Not implemented in Phase 1
   */
  async stop(): Promise<void> {
    throw new Error('NotificationServer.stop: Not implemented (Phase 1 stub)')
  }
}
