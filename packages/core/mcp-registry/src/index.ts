import type {
	McpServer,
	McpServerSummary,
	McpToolCall,
	McpToolResult,
	Result,
} from "@imperium/shared-types";
import { err } from "@imperium/shared-types";

// ============================================================================
// MCP Registry — Central dispatcher for MCP tool calls
// ============================================================================

/** Function that executes a tool call for a specific MCP server */
export type McpDispatchFn = (
	call: McpToolCall,
) => Promise<Result<McpToolResult>>;

/** A registered MCP server with its dispatch function */
interface RegisteredServer {
	readonly server: McpServer;
	readonly dispatch: McpDispatchFn;
}

export class McpRegistry {
	private readonly _servers = new Map<string, RegisteredServer>();

	/** Register an MCP server with its dispatch function */
	register(server: McpServer, dispatch: McpDispatchFn): void {
		this._servers.set(server.id, { server, dispatch });
	}

	/** Unregister an MCP server */
	unregister(serverId: string): boolean {
		return this._servers.delete(serverId);
	}

	/** Get all registered servers */
	getServers(): readonly McpServer[] {
		return [...this._servers.values()].map((r) => r.server);
	}

	/** Get server summaries for IPC/UI */
	getSummaries(): readonly McpServerSummary[] {
		return [...this._servers.values()].map((r) => ({
			id: r.server.id,
			name: r.server.name,
			description: r.server.description,
			version: r.server.version,
			toolCount: r.server.tools.length,
			enabled: r.server.enabled,
		}));
	}

	/** Find which server owns a tool by tool name */
	findToolServer(toolName: string): McpServer | null {
		for (const entry of this._servers.values()) {
			if (entry.server.tools.some((t) => t.name === toolName)) {
				return entry.server;
			}
		}
		return null;
	}

	/** Dispatch a tool call to the correct registered server */
	async dispatch(call: McpToolCall): Promise<Result<McpToolResult>> {
		const entry = this._servers.get(call.serverId);
		if (!entry) {
			return err(
				new Error(`No MCP server registered with id '${call.serverId}'`),
			);
		}
		if (!entry.server.enabled) {
			return err(new Error(`MCP server '${call.serverId}' is disabled`));
		}
		return entry.dispatch(call);
	}

	/** Dispatch by tool name — auto-resolves the server */
	async dispatchByToolName(
		toolName: string,
		args: Readonly<Record<string, unknown>>,
		requestId?: string,
	): Promise<Result<McpToolResult>> {
		const server = this.findToolServer(toolName);
		if (!server) {
			return err(new Error(`No MCP server found for tool '${toolName}'`));
		}
		const call: McpToolCall = {
			serverId: server.id,
			toolName,
			arguments: args,
			requestId: requestId ?? crypto.randomUUID(),
		};
		return this.dispatch(call);
	}

	/** Number of registered servers */
	get size(): number {
		return this._servers.size;
	}
}
