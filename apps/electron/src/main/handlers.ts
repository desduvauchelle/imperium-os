import type { PermissionsProfileResponse, PermissionsEvaluateResponse } from '@imperium/shared-types'
import { createIpcHandler } from './ipc.js'

// ============================================================================
// Phase 3 IPC Handlers
// ============================================================================

/**
 * Dependencies injected into the handler registry.
 * Keeps handlers testable and decoupled from concrete implementations.
 */
export interface HandlerDeps {
	readonly getProfile: () => PermissionsProfileResponse
	readonly setLevel: (level: string) => void
	readonly evaluate: (action: string) => PermissionsEvaluateResponse
	readonly resumeAgent: (agentId: string, approved: boolean) => Promise<void>
	readonly setPowerMode: (enabled: boolean) => Promise<void>
}

/**
 * Create all Phase 3 IPC handlers with injected dependencies.
 */
export function createPhase3Handlers(deps: HandlerDeps) {
	return [
		createIpcHandler('permissions:get-profile', async () => {
			return deps.getProfile()
		}),

		createIpcHandler('permissions:set-level', async (payload) => {
			deps.setLevel(payload.level)
		}),

		createIpcHandler('permissions:evaluate', async (payload) => {
			return deps.evaluate(payload.action)
		}),

		createIpcHandler('agent:resume', async (payload) => {
			await deps.resumeAgent(payload.agentId, payload.approved)
		}),

		createIpcHandler('system:power-mode', async (payload) => {
			await deps.setPowerMode(payload.enabled)
		}),
	] as const
}
