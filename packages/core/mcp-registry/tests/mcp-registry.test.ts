import { describe, expect, test } from "bun:test";
import type {
	McpServer,
	McpToolCall,
	McpToolResult,
} from "@imperium/shared-types";
import { isErr, isOk, ok } from "@imperium/shared-types";
import { McpRegistry } from "../src/index.js";

// ============================================================================
// Helpers
// ============================================================================

function makeServer(overrides: Partial<McpServer> = {}): McpServer {
	return {
		id: "test-server",
		name: "Test",
		description: "A test server",
		version: "1.0.0",
		tools: [
			{
				name: "tool_a",
				description: "Tool A",
				inputSchema: {},
				requiresPermission: "file-read",
			},
			{
				name: "tool_b",
				description: "Tool B",
				inputSchema: {},
				requiresPermission: "file-write",
			},
		],
		enabled: true,
		...overrides,
	};
}

function makeResult(requestId: string): McpToolResult {
	return { requestId, success: true, data: "done", executionTimeMs: 5 };
}

function makeCall(overrides: Partial<McpToolCall> = {}): McpToolCall {
	return {
		serverId: "test-server",
		toolName: "tool_a",
		arguments: {},
		requestId: "req-1",
		...overrides,
	};
}

// ============================================================================
// Tests
// ============================================================================

describe("McpRegistry", () => {
	test("starts empty", () => {
		const reg = new McpRegistry();
		expect(reg.size).toBe(0);
		expect(reg.getServers()).toEqual([]);
	});

	test("register adds a server", () => {
		const reg = new McpRegistry();
		const server = makeServer();
		reg.register(server, async () => ok(makeResult("r")));
		expect(reg.size).toBe(1);
		expect(reg.getServers()[0]?.id).toBe("test-server");
	});

	test("unregister removes a server", () => {
		const reg = new McpRegistry();
		reg.register(makeServer(), async () => ok(makeResult("r")));
		expect(reg.unregister("test-server")).toBe(true);
		expect(reg.size).toBe(0);
	});

	test("unregister returns false for unknown", () => {
		const reg = new McpRegistry();
		expect(reg.unregister("nope")).toBe(false);
	});

	test("getSummaries returns tool counts", () => {
		const reg = new McpRegistry();
		reg.register(makeServer(), async () => ok(makeResult("r")));
		const summaries = reg.getSummaries();
		expect(summaries).toHaveLength(1);
		expect(summaries[0]?.toolCount).toBe(2);
		expect(summaries[0]?.enabled).toBe(true);
	});

	test("findToolServer finds by tool name", () => {
		const reg = new McpRegistry();
		reg.register(makeServer(), async () => ok(makeResult("r")));
		expect(reg.findToolServer("tool_a")?.id).toBe("test-server");
		expect(reg.findToolServer("tool_b")?.id).toBe("test-server");
	});

	test("findToolServer returns null for unknown tool", () => {
		const reg = new McpRegistry();
		reg.register(makeServer(), async () => ok(makeResult("r")));
		expect(reg.findToolServer("no_such_tool")).toBeNull();
	});

	test("dispatch routes to correct server", async () => {
		const reg = new McpRegistry();
		const dispatchFn = async (call: McpToolCall) =>
			ok(makeResult(call.requestId));
		reg.register(makeServer(), dispatchFn);

		const result = await reg.dispatch(makeCall());
		expect(isOk(result)).toBe(true);
		if (result.ok) {
			expect(result.value.requestId).toBe("req-1");
			expect(result.value.success).toBe(true);
		}
	});

	test("dispatch returns error for unknown server", async () => {
		const reg = new McpRegistry();
		const result = await reg.dispatch(makeCall({ serverId: "nope" }));
		expect(isErr(result)).toBe(true);
	});

	test("dispatch returns error for disabled server", async () => {
		const reg = new McpRegistry();
		reg.register(makeServer({ enabled: false }), async () =>
			ok(makeResult("r")),
		);
		const result = await reg.dispatch(makeCall());
		expect(isErr(result)).toBe(true);
		if (!result.ok) {
			expect(result.error.message).toContain("disabled");
		}
	});

	test("dispatch routes to correct server among multiple", async () => {
		const reg = new McpRegistry();
		reg.register(
			makeServer({
				id: "server-a",
				tools: [
					{
						name: "ta",
						description: "",
						inputSchema: {},
						requiresPermission: "file-read",
					},
				],
			}),
			async () => ok({ ...makeResult("r"), data: "from-a" }),
		);
		reg.register(
			makeServer({
				id: "server-b",
				tools: [
					{
						name: "tb",
						description: "",
						inputSchema: {},
						requiresPermission: "file-write",
					},
				],
			}),
			async () => ok({ ...makeResult("r"), data: "from-b" }),
		);

		const resultA = await reg.dispatch(makeCall({ serverId: "server-a" }));
		const resultB = await reg.dispatch(makeCall({ serverId: "server-b" }));
		expect(resultA.ok && resultA.value.data).toBe("from-a");
		expect(resultB.ok && resultB.value.data).toBe("from-b");
	});

	test("dispatchByToolName auto-resolves server", async () => {
		const reg = new McpRegistry();
		reg.register(makeServer(), async (call) => ok(makeResult(call.requestId)));
		const result = await reg.dispatchByToolName("tool_a", { foo: "bar" });
		expect(isOk(result)).toBe(true);
	});

	test("dispatchByToolName returns error for unknown tool", async () => {
		const reg = new McpRegistry();
		const result = await reg.dispatchByToolName("no_such_tool", {});
		expect(isErr(result)).toBe(true);
		if (!result.ok) {
			expect(result.error.message).toContain("no_such_tool");
		}
	});
});
