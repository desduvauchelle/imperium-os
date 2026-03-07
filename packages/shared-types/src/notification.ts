import type { NotificationId, Timestamp } from './brand.js'

// ============================================================================
// Notification Types
// ============================================================================

/** Notification type */
export type NotificationType = 'info' | 'warning' | 'error' | 'action-required'

/** All valid notification types */
export const NOTIFICATION_TYPES = [
  'info',
  'warning',
  'error',
  'action-required',
] as const satisfies readonly NotificationType[]

/** Type guard for NotificationType */
export function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === 'string' && NOTIFICATION_TYPES.includes(value as NotificationType)
}

/** Notification priority */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

/** Notification payload */
export interface Notification {
  readonly id: NotificationId
  readonly type: NotificationType
  readonly priority: NotificationPriority
  readonly title: string
  readonly message: string
  readonly timestamp: Timestamp
  readonly read: boolean
  readonly sound: boolean
  readonly actionUrl?: string | undefined
}
