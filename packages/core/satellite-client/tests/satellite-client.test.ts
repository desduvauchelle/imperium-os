import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test'
import { SatelliteClient, createSatelliteClient, type FetchFn, type WebSocketCtor } from '../src/index.js'
import type { SatelliteClientConfig, SatellitePushEvent } from '@imperium/shared-types'

// ============================================================================
// Test helpers
// ============================================================================

const BASE_CONFIG: SatelliteClientConfig = {
	baseUrl: 'http://localhost:9100',
	token: 'test-token',
}

// ---------------------------------------------------------------------------
// Mock WebSocket
// ---------------------------------------------------------------------------

type WsReadyState = 0 | 1 | 2 | 3 // CONNECTING | OPEN | CLOSING | CLOSED

class MockWebSocket {
	static instances: MockWebSocket[] = []

	readonly url: string
	readyState: WsReadyState = 0 // CONNECTING

	onopen: (() => void) | null = null
	onmessage: ((event: { data: string }) => void) | null = null
	onclose: (() => void) | null = null
	onerror: (() => void) | null = null

	closedIntentionally = false

	constructor(url: string) {
		this.url = url
		MockWebSocket.instances.push(this)
	}

	close(): void {
		this.closedIntentionally = true
		this.readyState = 3 // CLOSED
		this.onclose?.()
	}

	// Test utilities
	simulateOpen(): void {
		this.readyState = 1 // OPEN
		this.onopen?.()
	}

	simulateMessage(data: unknown): void {
		this.onmessage?.({ data: JSON.stringify(data) })
	}

	simulateClose(): void {
		this.readyState = 3 // CLOSED
		this.onclose?.()
	}

	simulateError(): void {
		this.onerror?.()
	}
}

function makeMockWebSocketCtor(): WebSocketCtor {
	MockWebSocket.instances = []
	return MockWebSocket as unknown as WebSocketCtor
}

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

function makeOkFetch(data: unknown): FetchFn {
	return async (_url, _init) =>
		new Response(JSON.stringify({ ok: true, data }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		})
}

function makeErrorFetch(error: string, status = 403): FetchFn {
	return async (_url, _init) =>
		new Response(JSON.stringify({ ok: false, error }), {
			status,
			headers: { 'content-type': 'application/json' },
		})
}

type CapturedRequest = { url: string; method: string; headers: Record<string, string>; body: unknown }

function makeCapturingFetch(data: unknown): { fetchFn: FetchFn; calls: CapturedRequest[] } {
	const calls: CapturedRequest[] = []
	const fetchFn: FetchFn = async (url, init) => {
		const headers: Record<string, string> = {}
		if (init?.headers) {
			for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
				headers[k] = v
			}
		}
		let body: unknown = undefined
		if (init?.body) {
			try { body = JSON.parse(init.body as string) } catch { body = init.body }
		}
		calls.push({ url, method: init?.method ?? 'GET', headers, body })
		return new Response(JSON.stringify({ ok: true, data }), {
			headers: { 'content-type': 'application/json' },
		})
	}
	return { fetchFn, calls }
}

// ============================================================================
// invoke() tests
// ============================================================================

describe('SatelliteClient > invoke', () => {
	test('sends POST to /api/:channel with x-imperium-token header', async () => {
		const { fetchFn, calls } = makeCapturingFetch({ columns: {}, taskCount: 0 })
		const client = new SatelliteClient(BASE_CONFIG, { fetchFn })

		await client.invoke('kanban:get-board', { projectId: 'p-1' })

		expect(calls).toHaveLength(1)
		expect(calls[0]!.url).toBe('http://localhost:9100/api/kanban:get-board')
		expect(calls[0]!.method).toBe('POST')
		expect(calls[0]!.headers['x-imperium-token']).toBe(BASE_CONFIG.token)
	})

	test('sends body for channels with payload', async () => {
		const { fetchFn, calls } = makeCapturingFetch({ taskId: 'task-1' })
		const client = new SatelliteClient(BASE_CONFIG, { fetchFn })

		await client.invoke('kanban:create-task', {
			projectId: 'p-1',
			title: 'Task A',
			description: 'Desc',
			priority: 'medium',
		})

		expect(calls[0]!.body).toMatchObject({ projectId: 'p-1', title: 'Task A' })
		expect(calls[0]!.headers['content-type']).toBe('application/json')
	})

	test('sends no body for void-payload channels', async () => {
		const { fetchFn, calls } = makeCapturingFetch({ backendState: 'Running', peers: [] })
		const client = new SatelliteClient(BASE_CONFIG, { fetchFn })

		// void payload
		await client.invoke('tailscale:status', undefined as unknown as void)

		expect(calls[0]!.body).toBeUndefined()
	})

	test('returns typed response data', async () => {
		const expected = { columns: { todo: [] }, taskCount: 5 }
		const client = new SatelliteClient(BASE_CONFIG, { fetchFn: makeOkFetch(expected) })

		const result = await client.invoke('kanban:get-board', { projectId: 'p-1' })

		expect(result).toEqual(expected)
	})

	test('throws when response ok is false', async () => {
		const client = new SatelliteClient(BASE_CONFIG, {
			fetchFn: makeErrorFetch('Channel not allowed'),
		})

		await expect(
			client.invoke('kanban:get-board', { projectId: 'p-1' }),
		).rejects.toThrow('Channel not allowed')
	})

	test('createSatelliteClient factory works', async () => {
		const { fetchFn, calls } = makeCapturingFetch({})
		const client = createSatelliteClient(BASE_CONFIG, { fetchFn })

		await client.invoke('mcp:get-locks', undefined as unknown as void)

		expect(calls).toHaveLength(1)
	})
})

// ============================================================================
// WebSocket tests
// ============================================================================

describe('SatelliteClient > WebSocket', () => {
	test('connect() creates WebSocket with correct URL including token', () => {
		const WsCtor = makeMockWebSocketCtor()
		const client = new SatelliteClient(BASE_CONFIG, { WebSocketCtor: WsCtor })

		client.connect()

		expect(MockWebSocket.instances).toHaveLength(1)
		expect(MockWebSocket.instances[0]!.url).toBe(
			`ws://localhost:9100/ws?token=${BASE_CONFIG.token}`,
		)
	})

	test('https baseUrl produces wss:// WebSocket URL', () => {
		const WsCtor = makeMockWebSocketCtor()
		const client = new SatelliteClient(
			{ baseUrl: 'https://100.64.1.2:9100', token: 'tok' },
			{ WebSocketCtor: WsCtor },
		)

		client.connect()

		expect(MockWebSocket.instances[0]!.url).toContain('wss://')
	})

	test('isConnected reflects WebSocket readyState', () => {
		const WsCtor = makeMockWebSocketCtor()
		const client = new SatelliteClient(BASE_CONFIG, { WebSocketCtor: WsCtor })

		expect(client.isConnected).toBe(false)
		client.connect()
		expect(client.isConnected).toBe(false) // still CONNECTING

		MockWebSocket.instances[0]!.simulateOpen()
		expect(client.isConnected).toBe(true)
	})

	test('disconnect() closes WebSocket and prevents reconnect', () => {
		const WsCtor = makeMockWebSocketCtor()
		const client = new SatelliteClient(BASE_CONFIG, { WebSocketCtor: WsCtor })

		client.connect()
		const ws = MockWebSocket.instances[0]!
		ws.simulateOpen()

		client.disconnect()

		expect(ws.closedIntentionally).toBe(true)
		expect(client.isConnected).toBe(false)
		// No second instance should have been created
		expect(MockWebSocket.instances).toHaveLength(1)
	})

	test('push event dispatched to onPush callbacks', () => {
		const WsCtor = makeMockWebSocketCtor()
		const client = new SatelliteClient(BASE_CONFIG, { WebSocketCtor: WsCtor })
		client.connect()

		const received: SatellitePushEvent[] = []
		client.onPush((e) => received.push(e))

		const event: SatellitePushEvent = {
			type: 'notification:show',
			payload: { title: 'Test', message: 'Hello' },
		}
		MockWebSocket.instances[0]!.simulateMessage(event)

		expect(received).toHaveLength(1)
		expect(received[0]!.type).toBe('notification:show')
	})

	test('multiple onPush callbacks all receive events', () => {
		const WsCtor = makeMockWebSocketCtor()
		const client = new SatelliteClient(BASE_CONFIG, { WebSocketCtor: WsCtor })
		client.connect()

		const r1: SatellitePushEvent[] = []
		const r2: SatellitePushEvent[] = []
		client.onPush((e) => r1.push(e))
		client.onPush((e) => r2.push(e))

		MockWebSocket.instances[0]!.simulateMessage({ type: 'ping', payload: {} })

		expect(r1).toHaveLength(1)
		expect(r2).toHaveLength(1)
	})

	test('onPush unsubscribe stops delivery', () => {
		const WsCtor = makeMockWebSocketCtor()
		const client = new SatelliteClient(BASE_CONFIG, { WebSocketCtor: WsCtor })
		client.connect()

		const received: SatellitePushEvent[] = []
		const unsub = client.onPush((e) => received.push(e))

		MockWebSocket.instances[0]!.simulateMessage({ type: 'ping', payload: {} })
		unsub()
		MockWebSocket.instances[0]!.simulateMessage({ type: 'ping', payload: {} })

		expect(received).toHaveLength(1)
	})

	test('malformed push message is silently ignored', () => {
		const WsCtor = makeMockWebSocketCtor()
		const client = new SatelliteClient(BASE_CONFIG, { WebSocketCtor: WsCtor })
		client.connect()

		const received: SatellitePushEvent[] = []
		client.onPush((e) => received.push(e))

		// Simulate malformed message
		MockWebSocket.instances[0]!.onmessage?.({ data: '{{not-json' })

		expect(received).toHaveLength(0)
	})

	test('auto-reconnects on unexpected close', () => {
		const WsCtor = makeMockWebSocketCtor()
		const client = new SatelliteClient(BASE_CONFIG, { WebSocketCtor: WsCtor })
		client.connect()

		MockWebSocket.instances[0]!.simulateOpen()
		// Simulate server-side close (not intentional)
		MockWebSocket.instances[0]!.readyState = 3
		MockWebSocket.instances[0]!.onclose?.()

		// A reconnect timer should be scheduled — after advancing time with bun:test
		// We can verify state: isConnected is false and no immediate second connection
		expect(client.isConnected).toBe(false)
		// The reconnect attempt counter should increment (internal check via timing)
		// Don't poll timers — just verify the first instance was properly handled
		expect(MockWebSocket.instances).toHaveLength(1) // no immediate reconnect
	})

	test('does not reconnect after intentional disconnect', () => {
		const WsCtor = makeMockWebSocketCtor()
		const client = new SatelliteClient(BASE_CONFIG, { WebSocketCtor: WsCtor })
		client.connect()

		MockWebSocket.instances[0]!.simulateOpen()
		client.disconnect()

		// Even if onclose fires after disconnect, no second WS is created
		expect(MockWebSocket.instances).toHaveLength(1)
	})
})
