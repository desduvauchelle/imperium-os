import type { SessionId, Timestamp, UserId } from './brand.js'

// ============================================================================
// User & Auth Types
// ============================================================================

/** Auth provider */
export type AuthProvider = 'local' | 'github' | 'google'

/** All valid auth providers */
export const AUTH_PROVIDERS = ['local', 'github', 'google'] as const satisfies readonly AuthProvider[]

/** Type guard for AuthProvider */
export function isAuthProvider(value: unknown): value is AuthProvider {
  return typeof value === 'string' && AUTH_PROVIDERS.includes(value as AuthProvider)
}

/** User profile */
export interface User {
  readonly id: UserId
  readonly name: string
  readonly email: string
  readonly avatarUrl?: string | undefined
  readonly authProvider: AuthProvider
  readonly createdAt: Timestamp
}

/** Active auth session */
export interface AuthSession {
  readonly sessionId: SessionId
  readonly userId: UserId
  readonly provider: AuthProvider
  readonly expiresAt: Timestamp
  readonly createdAt: Timestamp
}
