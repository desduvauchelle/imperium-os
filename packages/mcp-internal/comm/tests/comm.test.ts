import { describe, expect, test, beforeEach } from 'bun:test'
import {
	CommunicationMcp,
	COMM_CHANNELS,
	DiscordAdapter,
	TelegramAdapter,
	WhatsAppAdapter,
	EmailAdapter,
	type CommAdapter,
	type CommChannel,
	type CommMessage,
	type FetchFn,
	type SendEmailFn,
} from '../src/index.js'
import { isMcpServer, ok } from '@imperium/shared-types'
import type { McpToolCall, Result } from '@imperium/shared-types'

// ============================================================================
// Helpers
// ============================================================================

function makeCall(toolName: string, args: Record<string, unknown> = {}, requestId = 'req-1'): McpToolCall {
	return { serverId: 'mcp-comm', toolName, arguments: args, requestId }
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
		clone: () => ({ }) as Response,
		body: null,
		bodyUsed: false,
		arrayBuffer: async () => new ArrayBuffer(0),
		blob: async () => new Blob(),
		formData: async () => new FormData(),
		bytes: async () => new Uint8Array(),
	})
}

function mockSendEmail(succeed: boolean): SendEmailFn {
	return async (opts) => {
		if (succeed) return ok({ messageId: `email-${Date.now()}` })
		return { ok: false, error: new Error('SMTP error') }
	}
}

// ============================================================================
// CommunicationMcp tests
// ============================================================================

describe('CommunicationMcp', () => {
	test('instantiates correctly', () => {
		const mcp = new CommunicationMcp()
		expect(mcp.id).toBe('mcp-comm')
		expect(mcp.name).toBe('Communication')
		expect(mcp.enabled).toBe(true)
	})

	test('implements McpServer interface', () => {
		const mcp = new CommunicationMcp()
		expect(isMcpServer(mcp)).toBe(true)
	})

	test('COMM_CHANNELS includes all channels', () => {
		expect(COMM_CHANNELS).toEqual(['discord', 'telegram', 'whatsapp', 'email'])
	})

	test('has 3 tools', () => {
		const mcp = new CommunicationMcp()
		expect(mcp.tools.length).toBe(3)
		const names = mcp.tools.map((t) => t.name)
		expect(names).toContain('send_message')
		expect(names).toContain('read_messages')
		expect(names).toContain('list_channels')
	})

	test('list_channels returns registered channels', async () => {
		const mcp = new CommunicationMcp([
			new DiscordAdapter('https://hook.example', mockFetch(200, {})),
		])
		const result = await mcp.execute(makeCall('list_channels'))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(true)
			expect(result.value.data).toEqual(['discord'])
		}
	})

	test('send_message missing channel returns error', async () => {
		const mcp = new CommunicationMcp()
		const result = await mcp.execute(makeCall('send_message', { recipient: 'x', message: 'hi' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(false)
			expect(result.value.error).toContain('channel')
		}
	})

	test('send_message unknown channel returns error', async () => {
		const mcp = new CommunicationMcp()
		const result = await mcp.execute(makeCall('send_message', { channel: 'discord', recipient: 'x', message: 'hi' }))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(false)
			expect(result.value.error).toContain('No adapter')
		}
	})

	test('unknown tool returns error', async () => {
		const mcp = new CommunicationMcp()
		const result = await mcp.execute(makeCall('no_such_tool'))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(false)
			expect(result.value.error).toContain('Unknown tool')
		}
	})

	test('registerAdapter adds adapter at runtime', () => {
		const mcp = new CommunicationMcp()
		expect(mcp.getAvailableChannels().length).toBe(0)
		mcp.registerAdapter(new DiscordAdapter('https://hook.example', mockFetch(200, {})))
		expect(mcp.getAvailableChannels()).toEqual(['discord'])
	})
})

// ============================================================================
// DiscordAdapter tests
// ============================================================================

describe('DiscordAdapter', () => {
	test('send succeeds', async () => {
		const adapter = new DiscordAdapter('https://hook.example', mockFetch(204, {}))
		const result = await adapter.send('channel', 'Hello!')
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.value.messageId).toContain('discord')
	})

	test('read returns empty (webhook is write-only)', async () => {
		const adapter = new DiscordAdapter('https://hook.example', mockFetch(200, {}))
		const result = await adapter.read(10)
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.value).toEqual([])
	})
})

// ============================================================================
// TelegramAdapter tests
// ============================================================================

describe('TelegramAdapter', () => {
	test('send succeeds', async () => {
		const fetchFn = mockFetch(200, { result: { message_id: 42 } })
		const adapter = new TelegramAdapter('bot-token', '12345', fetchFn)
		const result = await adapter.send('67890', 'Hello!')
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.value.messageId).toBe('42')
	})

	test('send uses default chat id', async () => {
		let capturedUrl = ''
		const fetchFn: FetchFn = async (url, init) => {
			capturedUrl = url
			return (mockFetch(200, { result: { message_id: 1 } }))(url, init)
		}
		const adapter = new TelegramAdapter('bot-token', 'default-chat', fetchFn)
		await adapter.send('', 'hi')
		expect(capturedUrl).toContain('sendMessage')
	})

	test('send fails without chat id', async () => {
		const adapter = new TelegramAdapter('bot-token', undefined, mockFetch(200, {}))
		const result = await adapter.send('', 'hi')
		expect(result.ok).toBe(false)
	})

	test('read returns messages', async () => {
		const fetchFn = mockFetch(200, {
			result: [
				{ message: { message_id: 1, from: { username: 'alice' }, text: 'hello', date: 1700000000 } },
				{ message: { message_id: 2, text: 'world', date: 1700000001 } },
			],
		})
		const adapter = new TelegramAdapter('bot-token', undefined, fetchFn)
		const result = await adapter.read(10)
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.length).toBe(2)
			expect(result.value[0]!.from).toBe('alice')
			expect(result.value[1]!.from).toBe('unknown')
		}
	})
})

// ============================================================================
// WhatsAppAdapter tests
// ============================================================================

describe('WhatsAppAdapter', () => {
	test('send succeeds', async () => {
		const fetchFn = mockFetch(201, { sid: 'SM123' })
		const adapter = new WhatsAppAdapter('sid', 'token', '+1234567890', fetchFn)
		const result = await adapter.send('+0987654321', 'Hello!')
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.value.messageId).toBe('SM123')
	})

	test('send failure returns error', async () => {
		const fetchFn = mockFetch(400, { message: 'Bad request' })
		const adapter = new WhatsAppAdapter('sid', 'token', '+1234567890', fetchFn)
		const result = await adapter.send('+0987654321', 'Hello!')
		expect(result.ok).toBe(false)
	})

	test('read returns empty', async () => {
		const adapter = new WhatsAppAdapter('sid', 'token', '+1234567890', mockFetch(200, {}))
		const result = await adapter.read(10)
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.value).toEqual([])
	})
})

// ============================================================================
// EmailAdapter tests
// ============================================================================

describe('EmailAdapter', () => {
	test('send succeeds', async () => {
		const adapter = new EmailAdapter(mockSendEmail(true))
		const result = await adapter.send('user@example.com', 'Hello!')
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.value.messageId).toContain('email')
	})

	test('send failure returns error', async () => {
		const adapter = new EmailAdapter(mockSendEmail(false))
		const result = await adapter.send('user@example.com', 'Hello!')
		expect(result.ok).toBe(false)
	})

	test('read returns empty', async () => {
		const adapter = new EmailAdapter(mockSendEmail(true))
		const result = await adapter.read(10)
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.value).toEqual([])
	})
})

// ============================================================================
// Integration: send_message through mcp
// ============================================================================

describe('CommunicationMcp integration', () => {
	test('send_message via discord adapter', async () => {
		const mcp = new CommunicationMcp([
			new DiscordAdapter('https://hook.example', mockFetch(204, {})),
		])
		const result = await mcp.execute(makeCall('send_message', {
			channel: 'discord',
			recipient: '#general',
			message: 'Hello from Imperium!',
		}))
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.value.success).toBe(true)
	})

	test('read_messages via telegram adapter', async () => {
		const fetchFn = mockFetch(200, {
			result: [{ message: { message_id: 1, text: 'hi', date: 1700000000 } }],
		})
		const mcp = new CommunicationMcp([
			new TelegramAdapter('bot-token', undefined, fetchFn),
		])
		const result = await mcp.execute(makeCall('read_messages', {
			channel: 'telegram',
			limit: 5,
		}))
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value.success).toBe(true)
			const msgs = result.value.data as readonly CommMessage[]
			expect(msgs.length).toBe(1)
		}
	})

	test('executionTimeMs is always set', async () => {
		const mcp = new CommunicationMcp()
		const result = await mcp.execute(makeCall('list_channels'))
		if (result.ok) expect(result.value.executionTimeMs).toBeGreaterThanOrEqual(0)
	})
})
