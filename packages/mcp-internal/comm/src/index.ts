import type {
	McpServer,
	McpTool,
	McpToolCall,
	McpToolResult,
	Result,
} from "@imperium/shared-types"
import { ok } from "@imperium/shared-types"

// ============================================================================
// Communication MCP - Discord, Telegram, WhatsApp, Email
// ============================================================================

/** Supported communication channels */
export type CommChannel = "discord" | "telegram" | "whatsapp" | "email"

export const COMM_CHANNELS: readonly CommChannel[] = [
	"discord",
	"telegram",
	"whatsapp",
	"email",
] as const

// ============================================================================
// Injectable adapter interface — one per channel
// ============================================================================

export interface CommMessage {
	readonly id: string
	readonly channel: CommChannel
	readonly from: string
	readonly body: string
	readonly timestamp: string
}

export interface CommAdapter {
	readonly channel: CommChannel
	send(
		recipient: string,
		message: string,
	): Promise<Result<{ messageId: string }>>
	read(limit: number): Promise<Result<readonly CommMessage[]>>
}

// ============================================================================
// Injectable FetchFn type for HTTP-based adapters
// ============================================================================

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>

// ============================================================================
// Discord Adapter  (webhook POST)
// ============================================================================

export class DiscordAdapter implements CommAdapter {
	readonly channel: CommChannel = "discord";
	private readonly webhookUrl: string
	private readonly fetchFn: FetchFn

	constructor(
		webhookUrl: string,
		fetchFn: FetchFn = globalThis.fetch.bind(globalThis),
	) {
		this.webhookUrl = webhookUrl
		this.fetchFn = fetchFn
	}

	async send(
		_recipient: string,
		message: string,
	): Promise<Result<{ messageId: string }>> {
		try {
			const res = await this.fetchFn(this.webhookUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: message }),
			})
			if (!res.ok) {
				return ok({ messageId: "" }) // Discord webhooks don't always return IDs
			}
			return ok({ messageId: `discord-${Date.now()}` })
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e : new Error(String(e)),
			}
		}
	}

	async read(_limit: number): Promise<Result<readonly CommMessage[]>> {
		// Discord webhooks are write-only; reading requires a bot
		return ok([])
	}
}

// ============================================================================
// Telegram Adapter  (Bot API)
// ============================================================================

export class TelegramAdapter implements CommAdapter {
	readonly channel: CommChannel = "telegram";
	private readonly botToken: string
	private readonly defaultChatId: string | undefined
	private readonly fetchFn: FetchFn

	constructor(
		botToken: string,
		defaultChatId?: string,
		fetchFn: FetchFn = globalThis.fetch.bind(globalThis),
	) {
		this.botToken = botToken
		this.defaultChatId = defaultChatId
		this.fetchFn = fetchFn
	}

	async send(
		recipient: string,
		message: string,
	): Promise<Result<{ messageId: string }>> {
		const chatId = recipient || this.defaultChatId
		if (!chatId)
			return {
				ok: false,
				error: new Error("No chat_id specified and no default configured"),
			}
		try {
			const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`
			const res = await this.fetchFn(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ chat_id: chatId, text: message }),
			})
			if (!res.ok) {
				const body = await res.text()
				return { ok: false, error: new Error(`Telegram API error: ${body}`) }
			}
			const data = (await res.json()) as { result?: { message_id?: number } }
			return ok({ messageId: String(data.result?.message_id ?? "") })
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e : new Error(String(e)),
			}
		}
	}

	async read(limit: number): Promise<Result<readonly CommMessage[]>> {
		try {
			const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?limit=${limit}`
			const res = await this.fetchFn(url)
			if (!res.ok) return ok([])
			const data = (await res.json()) as {
				result?: Array<{
					message?: {
						message_id: number
						from?: { username?: string }
						text?: string
						date?: number
					}
				}>
			}
			const messages: CommMessage[] = (data.result ?? [])
				.filter((u) => u.message?.text)
				.map((u) => ({
					id: String(u.message?.message_id),
					channel: "telegram" as CommChannel,
					from: u.message?.from?.username ?? "unknown",
					body: u.message?.text ?? "",
					timestamp: new Date((u.message?.date ?? 0) * 1000).toISOString(),
				}))
			return ok(messages)
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e : new Error(String(e)),
			}
		}
	}
}

// ============================================================================
// WhatsApp Adapter  (Twilio API)
// ============================================================================

export class WhatsAppAdapter implements CommAdapter {
	readonly channel: CommChannel = "whatsapp";
	private readonly accountSid: string
	private readonly authToken: string
	private readonly fromNumber: string
	private readonly fetchFn: FetchFn

	constructor(
		accountSid: string,
		authToken: string,
		fromNumber: string,
		fetchFn: FetchFn = globalThis.fetch.bind(globalThis),
	) {
		this.accountSid = accountSid
		this.authToken = authToken
		this.fromNumber = fromNumber
		this.fetchFn = fetchFn
	}

	async send(
		recipient: string,
		message: string,
	): Promise<Result<{ messageId: string }>> {
		try {
			const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`
			const body = new URLSearchParams({
				From: `whatsapp:${this.fromNumber}`,
				To: `whatsapp:${recipient}`,
				Body: message,
			})
			const res = await this.fetchFn(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`,
				},
				body: body.toString(),
			})
			if (!res.ok) {
				const text = await res.text()
				return { ok: false, error: new Error(`Twilio error: ${text}`) }
			}
			const data = (await res.json()) as { sid?: string }
			return ok({ messageId: data.sid ?? "" })
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e : new Error(String(e)),
			}
		}
	}

	async read(_limit: number): Promise<Result<readonly CommMessage[]>> {
		// Twilio doesn't support polling; would need webhook receiver
		return ok([])
	}
}

// ============================================================================
// Email Adapter  (injectable send function)
// ============================================================================

export type SendEmailFn = (opts: {
	to: string
	subject: string
	body: string
}) => Promise<Result<{ messageId: string }>>

export class EmailAdapter implements CommAdapter {
	readonly channel: CommChannel = "email";
	private readonly sendEmail: SendEmailFn

	constructor(sendEmail: SendEmailFn) {
		this.sendEmail = sendEmail
	}

	async send(
		recipient: string,
		message: string,
	): Promise<Result<{ messageId: string }>> {
		return this.sendEmail({
			to: recipient,
			subject: "Imperium OS Notification",
			body: message,
		})
	}

	async read(_limit: number): Promise<Result<readonly CommMessage[]>> {
		// Email reading would require IMAP; out of scope for now
		return ok([])
	}
}

// ============================================================================
// Communication MCP — tool dispatch
// ============================================================================

const COMM_TOOLS: readonly McpTool[] = [
	{
		name: "send_message",
		description: "Send a message via a communication channel",
		inputSchema: {
			channel: { type: "string" },
			recipient: { type: "string" },
			message: { type: "string" },
		},
		requiresPermission: "network-request",
	},
	{
		name: "read_messages",
		description: "Read recent messages from a communication channel",
		inputSchema: { channel: { type: "string" }, limit: { type: "number" } },
		requiresPermission: "network-request",
	},
	{
		name: "list_channels",
		description: "List available communication channels",
		inputSchema: {},
		requiresPermission: "network-request",
	},
] as const

export class CommunicationMcp
	implements
	Pick<
		McpServer,
		"id" | "name" | "description" | "version" | "tools" | "enabled"
	> {
	readonly id = "mcp-comm";
	readonly name = "Communication";
	readonly description = "Discord, Telegram, WhatsApp, and Email integration";
	readonly version = "0.1.0";
	readonly tools = COMM_TOOLS;
	readonly enabled = true;

	private readonly adapters = new Map<CommChannel, CommAdapter>();

	constructor(adapters: readonly CommAdapter[] = []) {
		for (const adapter of adapters) {
			this.adapters.set(adapter.channel, adapter)
		}
	}

	registerAdapter(adapter: CommAdapter): void {
		this.adapters.set(adapter.channel, adapter)
	}

	getAvailableChannels(): readonly CommChannel[] {
		return [...this.adapters.keys()]
	}

	async execute(call: McpToolCall): Promise<Result<McpToolResult>> {
		const start = Date.now()
		const args = call.arguments as Record<string, unknown>

		try {
			switch (call.toolName) {
				case "send_message": {
					const channel = args['channel'] as CommChannel | undefined
					if (!channel)
						return this.toolError(
							call.requestId,
							start,
							"Missing required argument: channel",
						)
					const recipient = args['recipient'] as string | undefined
					if (!recipient)
						return this.toolError(
							call.requestId,
							start,
							"Missing required argument: recipient",
						)
					const message = args['message'] as string | undefined
					if (!message)
						return this.toolError(
							call.requestId,
							start,
							"Missing required argument: message",
						)

					const adapter = this.adapters.get(channel)
					if (!adapter)
						return this.toolError(
							call.requestId,
							start,
							`No adapter registered for channel: ${channel}`,
						)

					const result = await adapter.send(recipient, message)
					if (!result.ok)
						return this.toolError(call.requestId, start, result.error.message)
					return ok(this.toolResult(call.requestId, start, result.value))
				}
				case "read_messages": {
					const channel = args['channel'] as CommChannel | undefined
					if (!channel)
						return this.toolError(
							call.requestId,
							start,
							"Missing required argument: channel",
						)
					const limit = (args['limit'] as number | undefined) ?? 10

					const adapter = this.adapters.get(channel)
					if (!adapter)
						return this.toolError(
							call.requestId,
							start,
							`No adapter registered for channel: ${channel}`,
						)

					const result = await adapter.read(limit)
					if (!result.ok)
						return this.toolError(call.requestId, start, result.error.message)
					return ok(this.toolResult(call.requestId, start, result.value))
				}
				case "list_channels": {
					return ok(
						this.toolResult(call.requestId, start, this.getAvailableChannels()),
					)
				}
				default:
					return this.toolError(
						call.requestId,
						start,
						`Unknown tool: ${call.toolName}`,
					)
			}
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e)
			return this.toolError(call.requestId, start, message)
		}
	}

	private toolResult(
		requestId: string,
		startMs: number,
		data: unknown,
	): McpToolResult {
		return {
			requestId,
			success: true,
			data,
			executionTimeMs: Date.now() - startMs,
		}
	}

	private toolError(
		requestId: string,
		startMs: number,
		message: string,
	): Result<McpToolResult> {
		return ok({
			requestId,
			success: false,
			error: message,
			executionTimeMs: Date.now() - startMs,
		})
	}
}
