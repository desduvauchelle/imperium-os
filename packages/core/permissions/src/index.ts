import type {
	ActionCategory,
	ComfortLevel,
	ComfortLevelProfile,
	PermissionVerdict,
} from "@imperium/shared-types";
import { DEFAULT_PROFILES } from "@imperium/shared-types";

// ============================================================================
// Permission Guard - Guardrail & Whitelist logic for MCPs
// ============================================================================

/** Result of a permission evaluation */
export interface PermissionResult {
	readonly action: ActionCategory;
	readonly verdict: PermissionVerdict;
	readonly comfortLevel: ComfortLevel;
	readonly reason: string;
}

/** Callbacks for the gate method */
export interface GateCallbacks {
	readonly onAllow: (result: PermissionResult) => void;
	readonly onDeny: (result: PermissionResult) => void;
	readonly onPrompt: (result: PermissionResult) => void;
}

export class PermissionGuard {
	private _profile: ComfortLevelProfile;

	constructor(level: ComfortLevel = "praetorian") {
		this._profile = DEFAULT_PROFILES[level];
	}

	get profile(): ComfortLevelProfile {
		return this._profile;
	}

	/** Update the active comfort level */
	setLevel(level: ComfortLevel): void {
		this._profile = DEFAULT_PROFILES[level];
	}

	/**
	 * Evaluate whether an action is permitted under the current profile.
	 */
	evaluate(action: ActionCategory): PermissionResult {
		const verdict = this._profile.permissions[action];
		return {
			action,
			verdict,
			comfortLevel: this._profile.level,
			reason: `Action '${action}' is '${verdict}' under ${this._profile.label} profile`,
		};
	}

	/**
	 * Gate an action through the permission system.
	 * Evaluates the action and dispatches to the appropriate callback.
	 * Returns the PermissionResult for further inspection.
	 */
	gate(action: ActionCategory, callbacks: GateCallbacks): PermissionResult {
		const result = this.evaluate(action);
		switch (result.verdict) {
			case "allow":
				callbacks.onAllow(result);
				break;
			case "deny":
				callbacks.onDeny(result);
				break;
			case "prompt":
				callbacks.onPrompt(result);
				break;
		}
		return result;
	}

	/**
	 * Batch-evaluate multiple actions.
	 */
	evaluateAll(actions: readonly ActionCategory[]): readonly PermissionResult[] {
		return actions.map((action) => this.evaluate(action));
	}
}
