import { describe, expect, test } from "bun:test";
import { PermissionGuard } from "../src/index.js";
import type { GateCallbacks, PermissionResult } from "../src/index.js";

function createSpyCallbacks() {
	const calls: {
		allow: PermissionResult[];
		deny: PermissionResult[];
		prompt: PermissionResult[];
	} = {
		allow: [],
		deny: [],
		prompt: [],
	};
	const callbacks: GateCallbacks = {
		onAllow: (r) => calls.allow.push(r),
		onDeny: (r) => calls.deny.push(r),
		onPrompt: (r) => calls.prompt.push(r),
	};
	return { calls, callbacks };
}

describe("PermissionGuard", () => {
	test("instantiates with default praetorian level", () => {
		const guard = new PermissionGuard();
		expect(guard.profile.level).toBe("praetorian");
	});

	test("accepts custom comfort level", () => {
		const guard = new PermissionGuard("mad-max");
		expect(guard.profile.level).toBe("mad-max");
	});

	test("evaluate returns correct verdict for mad-max", () => {
		const guard = new PermissionGuard("mad-max");
		const result = guard.evaluate("file-delete");
		expect(result.verdict).toBe("allow");
		expect(result.action).toBe("file-delete");
		expect(result.comfortLevel).toBe("mad-max");
	});

	test("evaluate returns prompt for praetorian file-delete", () => {
		const guard = new PermissionGuard("praetorian");
		const result = guard.evaluate("file-delete");
		expect(result.verdict).toBe("prompt");
	});

	test("evaluate returns deny for imperator system-modify", () => {
		const guard = new PermissionGuard("imperator");
		const result = guard.evaluate("system-modify");
		expect(result.verdict).toBe("deny");
	});

	test("setLevel changes the active profile", () => {
		const guard = new PermissionGuard("mad-max");
		expect(guard.profile.level).toBe("mad-max");
		guard.setLevel("imperator");
		expect(guard.profile.level).toBe("imperator");
	});

	test("evaluateAll returns results for all actions", () => {
		const guard = new PermissionGuard("praetorian");
		const results = guard.evaluateAll([
			"file-read",
			"file-delete",
			"system-modify",
		]);
		expect(results).toHaveLength(3);
		expect(results[0]?.verdict).toBe("allow");
		expect(results[1]?.verdict).toBe("prompt");
		expect(results[2]?.verdict).toBe("deny");
	});

	test("reason string includes profile name", () => {
		const guard = new PermissionGuard("praetorian");
		const result = guard.evaluate("file-read");
		expect(result.reason).toContain("Praetorian");
	});

	// ========== gate() tests ==========

	test("gate dispatches to onAllow for mad-max file-delete", () => {
		const guard = new PermissionGuard("mad-max");
		const { calls, callbacks } = createSpyCallbacks();
		const result = guard.gate("file-delete", callbacks);
		expect(result.verdict).toBe("allow");
		expect(calls.allow).toHaveLength(1);
		expect(calls.allow[0]?.action).toBe("file-delete");
		expect(calls.deny).toHaveLength(0);
		expect(calls.prompt).toHaveLength(0);
	});

	test("gate dispatches to onDeny for imperator system-modify", () => {
		const guard = new PermissionGuard("imperator");
		const { calls, callbacks } = createSpyCallbacks();
		const result = guard.gate("system-modify", callbacks);
		expect(result.verdict).toBe("deny");
		expect(calls.deny).toHaveLength(1);
		expect(calls.deny[0]?.action).toBe("system-modify");
		expect(calls.allow).toHaveLength(0);
		expect(calls.prompt).toHaveLength(0);
	});

	test("gate dispatches to onPrompt for praetorian file-delete", () => {
		const guard = new PermissionGuard("praetorian");
		const { calls, callbacks } = createSpyCallbacks();
		const result = guard.gate("file-delete", callbacks);
		expect(result.verdict).toBe("prompt");
		expect(calls.prompt).toHaveLength(1);
		expect(calls.prompt[0]?.comfortLevel).toBe("praetorian");
		expect(calls.allow).toHaveLength(0);
		expect(calls.deny).toHaveLength(0);
	});

	test("gate returns the PermissionResult", () => {
		const guard = new PermissionGuard("praetorian");
		const { callbacks } = createSpyCallbacks();
		const result = guard.gate("file-read", callbacks);
		expect(result.action).toBe("file-read");
		expect(result.verdict).toBe("allow");
		expect(result.reason).toContain("Praetorian");
	});
});
