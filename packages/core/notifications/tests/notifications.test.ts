import { describe, expect, test } from 'bun:test'
import {
	NotificationServer,
	DEFAULT_NOTIFICATION_CONFIG,
	createSuspensionNotification,
	createErrorNotification,
	createInfoNotification,
} from '../src/index.js'
import type { Notification, SuspensionContext } from '@imperium/shared-types'
import { createNotificationId, createTimestamp, isOk, isErr } from '@imperium/shared-types'

// ============================================================================
// Helpers
// ============================================================================

function makeNotification(overrides: Partial<Notification> = {}): Notification {
	return {
		id: createNotificationId('test-1'),
		type: 'info',
		priority: 'normal',
		title: 'Test',
		message: 'Test notification',
		timestamp: createTimestamp(),
		read: false,
		sound: false,
		...overrides,
	}
}

// ============================================================================
// NotificationServer tests
// ============================================================================

describe('NotificationServer', () => {
	test('instantiates with default config', () => {
		const server = new NotificationServer()
		expect(server.config).toEqual(DEFAULT_NOTIFICATION_CONFIG)
	})

	test('accepts partial config override', () => {
		const server = new NotificationServer({ port: 9200 })
		expect(server.config.port).toBe(9200)
		expect(server.config.heartbeatIntervalMs).toBe(DEFAULT_NOTIFICATION_CONFIG.heartbeatIntervalMs)
	})

	test('isRunning defaults to false', () => {
		const server = new NotificationServer()
		expect(server.isRunning).toBe(false)
	})

	test('start sets isRunning to true', async () => {
		const server = new NotificationServer()
		const result = await server.start()
		expect(isOk(result)).toBe(true)
		expect(server.isRunning).toBe(true)
	})

	test('start returns error if already running', async () => {
		const server = new NotificationServer()
		await server.start()
		const result = await server.start()
		expect(isErr(result)).toBe(true)
	})

	test('stop sets isRunning to false', async () => {
		const server = new NotificationServer()
		await server.start()
		await server.stop()
		expect(server.isRunning).toBe(false)
	})

	test('broadcast delivers to subscribers', async () => {
		const server = new NotificationServer()
		await server.start()
		const received: Notification[] = []
		server.onNotification((n) => received.push(n))

		const notification = makeNotification()
		await server.broadcast(notification)

		expect(received).toHaveLength(1)
		expect(received[0]!.title).toBe('Test')
	})

	test('broadcast returns error when not running', async () => {
		const server = new NotificationServer()
		const result = await server.broadcast(makeNotification())
		expect(isErr(result)).toBe(true)
	})

	test('broadcast delivers to multiple subscribers', async () => {
		const server = new NotificationServer()
		await server.start()
		const received1: Notification[] = []
		const received2: Notification[] = []
		server.onNotification((n) => received1.push(n))
		server.onNotification((n) => received2.push(n))

		await server.broadcast(makeNotification())

		expect(received1).toHaveLength(1)
		expect(received2).toHaveLength(1)
	})

	test('unsubscribe stops delivery', async () => {
		const server = new NotificationServer()
		await server.start()
		const received: Notification[] = []
		const unsub = server.onNotification((n) => received.push(n))

		await server.broadcast(makeNotification())
		unsub()
		await server.broadcast(makeNotification({ title: 'Second' }))

		expect(received).toHaveLength(1)
	})

	test('history tracks all broadcast notifications', async () => {
		const server = new NotificationServer()
		await server.start()
		await server.broadcast(makeNotification({ title: 'First' }))
		await server.broadcast(makeNotification({ title: 'Second' }))

		expect(server.history).toHaveLength(2)
		expect(server.history[0]!.title).toBe('First')
		expect(server.history[1]!.title).toBe('Second')
	})

	test('stop clears listeners but not history', async () => {
		const server = new NotificationServer()
		await server.start()
		const received: Notification[] = []
		server.onNotification((n) => received.push(n))
		await server.broadcast(makeNotification())
		await server.stop()

		// History persists after stop
		expect(server.history).toHaveLength(1)
	})

	test('emit creates and broadcasts notification', async () => {
		const server = new NotificationServer()
		await server.start()
		const received: Notification[] = []
		server.onNotification((n) => received.push(n))

		const result = await server.emit({
			type: 'warning',
			priority: 'high',
			title: 'Warning',
			message: 'Something happened',
			sound: true,
		})

		expect(isOk(result)).toBe(true)
		if (result.ok) {
			expect(result.value.type).toBe('warning')
			expect(result.value.priority).toBe('high')
			expect(result.value.sound).toBe(true)
			expect(result.value.read).toBe(false)
		}
		expect(received).toHaveLength(1)
	})

	test('emit returns error when not running', async () => {
		const server = new NotificationServer()
		const result = await server.emit({
			type: 'info',
			priority: 'normal',
			title: 'Test',
			message: 'Test',
		})
		expect(isErr(result)).toBe(true)
	})
})

// ============================================================================
// Factory function tests
// ============================================================================

describe('Notification factories', () => {
	test('createSuspensionNotification builds action-required notification', () => {
		const suspension: SuspensionContext = {
			action: 'file-delete',
			reason: 'Requires approval',
			pendingToolCall: 'delete_file',
		}
		const opts = createSuspensionNotification('agent-1', suspension)
		expect(opts.type).toBe('action-required')
		expect(opts.priority).toBe('high')
		expect(opts.sound).toBe(true)
		expect(opts.message).toContain('agent-1')
		expect(opts.message).toContain('Requires approval')
		expect(opts.actionUrl).toContain('agent-1')
	})

	test('createErrorNotification builds error notification', () => {
		const opts = createErrorNotification('Crash', 'Something broke')
		expect(opts.type).toBe('error')
		expect(opts.priority).toBe('high')
		expect(opts.title).toBe('Crash')
		expect(opts.message).toBe('Something broke')
	})

	test('createInfoNotification builds info notification', () => {
		const opts = createInfoNotification('Done', 'Task complete')
		expect(opts.type).toBe('info')
		expect(opts.priority).toBe('normal')
		expect(opts.title).toBe('Done')
	})
})
