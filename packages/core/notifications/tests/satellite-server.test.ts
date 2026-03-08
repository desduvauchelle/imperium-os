import { describe, expect, test, mock } from 'bun:test'
import {
	SatelliteServer,
	type HandlerMap,
	type ServeFn,
	type WsHandle,
	type SatelliteServeOptions,
} from '../src/index.js'
import type { SatelliteServerConfig, SatellitePushEvent } from '@imperium/shared-types'

// ============================================================================
// Test helpers
// ============================================================================

const BASE_CONFIG: SatelliteServerConfig = {
	port: 19100,
	token: 'test-token-abc',
	allowedChannels: ['kanban:get-board', 'tailscale:status', 'costing:get-summary'],
}

/**
 * Captured state from a mock serve call.
 */
interface MockServerState {
	options: SatelliteServeOptions | undefined
	stopped: boolean
}

function makeMockServeFn(): { serveFn: ServeFn; state: MockServerState } {
	const state: MockServerState = { options: undefined, stopped: false }

	const serveFn: ServeFn = (options) => {
		state.options = options
		return {
			stop() {
				state.stopped = true
			},
		}
	}

	return { serveFn, state }
}

function makeHandlers(): HandlerMap {
	return new Map([
		['kanban:get-board', async (_payload) => ({ columns: {}, taskCount: 0 })],
		['tailscale:status', async (_payload) => ({ backendState: 'Running', peers: [] })],
		['costing:get-summary', async (_payload) => ({ totalCostUsd: 0.5, entries: [] })],
	])
}

function makeRequest(
	method: string,
	pathname: string,
	opts: { token?: string; body?: unknown } = {},
): Request {
	const url = `http://localhost:19100${pathname}`
	const headers: Record<string, string> = {}
	if (opts.token !== undefined) {
		headers['x-imperium-token'] = opts.token
	}
	if (opts.body !== undefined) {
		headers['content-type'] = 'application/json'
	}
	return new Request(url, {
		method,
		headers,
		...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
	})
}

/** Fake upgrade server (records if upgrade was called) */
function makeUpgradeServer(): { upgrade: (req: Request) => boolean; upgraded: boolean } {
	const s = { upgrade: (_req: Request) => { s.upgraded = true; return true }, upgraded: false }
	return s
}

// ============================================================================
// SatelliteServer tests
// ============================================================================

describe('SatelliteServer', () => {
	test('instantiates with config', () => {
		const { serveFn } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		expect(server.config).toEqual(BASE_CONFIG)
		expect(server.isRunning).toBe(false)
	})

	test('start registers the server', () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		const result = server.start(makeHandlers())

		expect(result.ok).toBe(true)
		expect(server.isRunning).toBe(true)
		expect(state.options?.port).toBe(BASE_CONFIG.port)
	})

	test('start returns error if already running', () => {
		const { serveFn } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		server.start(makeHandlers())
		const result = server.start(makeHandlers())

		expect(result.ok).toBe(false)
	})

	test('stop clears running state', () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		server.start(makeHandlers())
		server.stop()

		expect(server.isRunning).toBe(false)
		expect(state.stopped).toBe(true)
	})

	// -------------------------------------------------------------------------
	// HTTP handler tests — invoke fetch directly from captured options
	// -------------------------------------------------------------------------

	test('GET /health returns 200 with valid token', async () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		server.start(makeHandlers())

		const req = makeRequest('GET', '/health', { token: BASE_CONFIG.token })
		const upgradeServer = makeUpgradeServer()
		const resp = await state.options!.fetch(req, upgradeServer)

		expect(resp).toBeDefined()
		expect((resp as Response).status).toBe(200)
		const body = await (resp as Response).json() as { ok: boolean; version: string }
		expect(body.ok).toBe(true)
		expect(body.version).toBe('6.0')
	})

	test('GET /health returns 401 with missing token', async () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		server.start(makeHandlers())

		const req = makeRequest('GET', '/health')
		const resp = await state.options!.fetch(req, makeUpgradeServer())

		expect((resp as Response).status).toBe(401)
	})

	test('GET /health returns 401 with wrong token', async () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		server.start(makeHandlers())

		const req = makeRequest('GET', '/health', { token: 'wrong-token' })
		const resp = await state.options!.fetch(req, makeUpgradeServer())

		expect((resp as Response).status).toBe(401)
	})

	test('POST /api/kanban:get-board dispatches to handler', async () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		server.start(makeHandlers())

		const req = makeRequest('POST', '/api/kanban:get-board', {
			token: BASE_CONFIG.token,
			body: { projectId: 'p-1' },
		})
		const resp = await state.options!.fetch(req, makeUpgradeServer())

		expect((resp as Response).status).toBe(200)
		const body = await (resp as Response).json() as { ok: boolean; data: { taskCount: number } }
		expect(body.ok).toBe(true)
		expect(body.data.taskCount).toBe(0)
	})

	test('POST /api/:channel returns 403 for disallowed channel', async () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		server.start(makeHandlers())

		const req = makeRequest('POST', '/api/tailscale:up', {
			token: BASE_CONFIG.token,
		})
		const resp = await state.options!.fetch(req, makeUpgradeServer())

		expect((resp as Response).status).toBe(403)
	})

	test('POST /api/:channel returns 404 for unknown path', async () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		server.start(makeHandlers())

		const req = makeRequest('POST', '/unknown', { token: BASE_CONFIG.token })
		const resp = await state.options!.fetch(req, makeUpgradeServer())

		expect((resp as Response).status).toBe(404)
	})

	test('POST /api/:channel returns 404 when no handler registered', async () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		// Allowed but no handler provided
		const config: SatelliteServerConfig = { ...BASE_CONFIG, allowedChannels: ['kanban:get-board', 'costing:get-entries'] }
		const serverNoHandler = new SatelliteServer(config, serveFn)
		serverNoHandler.start(new Map()) // empty handlers

		const req = makeRequest('POST', '/api/kanban:get-board', { token: BASE_CONFIG.token })
		const resp = await state.options!.fetch(req, makeUpgradeServer())

		expect((resp as Response).status).toBe(404)
	})

	test('handler errors return 500', async () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		const handlers: HandlerMap = new Map([
			['tailscale:status', async () => { throw new Error('Tailscale not found') }],
		])
		server.start(handlers)

		const req = makeRequest('POST', '/api/tailscale:status', { token: BASE_CONFIG.token })
		const resp = await state.options!.fetch(req, makeUpgradeServer())

		expect((resp as Response).status).toBe(500)
		const body = await (resp as Response).json() as { ok: false; error: string }
		expect(body.error).toContain('Tailscale not found')
	})

	// -------------------------------------------------------------------------
	// WebSocket tests
	// -------------------------------------------------------------------------

	test('WebSocket upgrade rejected with wrong token', async () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		server.start(makeHandlers())

		const req = new Request(`http://localhost:19100/ws?token=wrong`)
		const upgradeServer = makeUpgradeServer()
		const resp = await state.options!.fetch(req, upgradeServer)

		expect((resp as Response).status).toBe(401)
		expect(upgradeServer.upgraded).toBe(false)
	})

	test('WebSocket upgrade accepted with correct token', async () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		server.start(makeHandlers())

		const req = new Request(`http://localhost:19100/ws?token=${BASE_CONFIG.token}`)
		const upgradeServer = makeUpgradeServer()
		const resp = await state.options!.fetch(req, upgradeServer)

		// undefined means upgrade was attempted
		expect(resp).toBeUndefined()
		expect(upgradeServer.upgraded).toBe(true)
	})

	test('push broadcasts to connected clients', () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		server.start(makeHandlers())

		const received: string[] = []
		const fakeWs: WsHandle = {
			send(data) { received.push(data as string) },
			close() {},
		}

		// Simulate a client connecting
		state.options!.websocket.open(fakeWs)
		expect(server.clientCount).toBe(1)

		const event: SatellitePushEvent = {
			type: 'notification:show',
			payload: { title: 'Hello', message: 'World' },
		}
		server.push(event)

		expect(received).toHaveLength(1)
		const parsed = JSON.parse(received[0]!) as SatellitePushEvent
		expect(parsed.type).toBe('notification:show')
	})

	test('push delivers to multiple clients', () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		server.start(makeHandlers())

		const received1: string[] = []
		const received2: string[] = []
		state.options!.websocket.open({ send: (d) => received1.push(d as string), close: () => {} })
		state.options!.websocket.open({ send: (d) => received2.push(d as string), close: () => {} })

		server.push({ type: 'ping', payload: {} })

		expect(received1).toHaveLength(1)
		expect(received2).toHaveLength(1)
	})

	test('client removed on WebSocket close', () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		server.start(makeHandlers())

		const fakeWs: WsHandle = { send: () => {}, close: () => {} }
		state.options!.websocket.open(fakeWs)
		expect(server.clientCount).toBe(1)

		state.options!.websocket.close(fakeWs)
		expect(server.clientCount).toBe(0)
	})

	test('stop disconnects all clients', () => {
		const { serveFn, state } = makeMockServeFn()
		const server = new SatelliteServer(BASE_CONFIG, serveFn)
		server.start(makeHandlers())

		const closedCount = { value: 0 }
		const makeWs = (): WsHandle => ({ send: () => {}, close: () => { closedCount.value++ } })

		state.options!.websocket.open(makeWs())
		state.options!.websocket.open(makeWs())
		expect(server.clientCount).toBe(2)

		server.stop()
		expect(server.clientCount).toBe(0)
		expect(closedCount.value).toBe(2)
	})
})
