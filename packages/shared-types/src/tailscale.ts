// ============================================================================
// Tailscale P2P Networking Types
// ============================================================================

/** Tailscale peer connection status */
export type TailscalePeerStatus = 'online' | 'offline' | 'idle'

/** All valid peer statuses */
export const TAILSCALE_PEER_STATUSES = [
  'online',
  'offline',
  'idle',
] as const satisfies readonly TailscalePeerStatus[]

/** Type guard for TailscalePeerStatus */
export function isTailscalePeerStatus(value: unknown): value is TailscalePeerStatus {
  return typeof value === 'string' && TAILSCALE_PEER_STATUSES.includes(value as TailscalePeerStatus)
}

/** Tailscale backend state (from `tailscale status --json`) */
export type TailscaleBackendState =
  | 'Running'
  | 'Stopped'
  | 'NeedsLogin'
  | 'NeedsMachineAuth'
  | 'NoState'

/** A peer on the Tailscale network */
export interface TailscalePeer {
  readonly id: string
  readonly hostname: string
  readonly ipv4: string
  readonly ipv6?: string | undefined
  readonly os: string
  readonly online: boolean
  readonly lastSeen?: string | undefined
  readonly exitNode: boolean
  readonly tags?: readonly string[] | undefined
}

/** Self node info */
export interface TailscaleSelf {
  readonly hostname: string
  readonly ipv4: string
  readonly ipv6?: string | undefined
  readonly tailnet: string
  readonly online: boolean
}

/** Full Tailscale status snapshot */
export interface TailscaleStatus {
  readonly backendState: TailscaleBackendState
  readonly self: TailscaleSelf
  readonly peers: readonly TailscalePeer[]
  readonly version: string
}
