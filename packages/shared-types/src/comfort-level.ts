// ============================================================================
// Comfort Level Types (Permission Profiles)
// ============================================================================

/** The three permission profiles */
export type ComfortLevel = 'mad-max' | 'praetorian' | 'imperator'

/** All valid comfort level values */
export const COMFORT_LEVELS = ['mad-max', 'praetorian', 'imperator'] as const satisfies readonly ComfortLevel[]

/** Type guard for ComfortLevel */
export function isComfortLevel(value: unknown): value is ComfortLevel {
  return typeof value === 'string' && COMFORT_LEVELS.includes(value as ComfortLevel)
}

/** Action categories that can be restricted */
export type ActionCategory =
  | 'file-read'
  | 'file-write'
  | 'file-delete'
  | 'network-request'
  | 'shell-execute'
  | 'mcp-call'
  | 'system-modify'

/** Permission result when evaluating an action */
export type PermissionVerdict = 'allow' | 'deny' | 'prompt'

/** Map of action categories to their permission verdict */
export type ActionPermissionMap = Readonly<Record<ActionCategory, PermissionVerdict>>

/** Full comfort level profile */
export interface ComfortLevelProfile {
  readonly level: ComfortLevel
  readonly label: string
  readonly description: string
  readonly permissions: ActionPermissionMap
}

/** Default profiles */
export const DEFAULT_PROFILES: Readonly<Record<ComfortLevel, ComfortLevelProfile>> = {
  'mad-max': {
    level: 'mad-max',
    label: 'Mad Max',
    description: 'No restrictions. The AI operates with total freedom.',
    permissions: {
      'file-read': 'allow',
      'file-write': 'allow',
      'file-delete': 'allow',
      'network-request': 'allow',
      'shell-execute': 'allow',
      'mcp-call': 'allow',
      'system-modify': 'allow',
    },
  },
  praetorian: {
    level: 'praetorian',
    label: 'Praetorian',
    description: 'Balanced safeguarding. Tools verified before execution.',
    permissions: {
      'file-read': 'allow',
      'file-write': 'allow',
      'file-delete': 'prompt',
      'network-request': 'allow',
      'shell-execute': 'prompt',
      'mcp-call': 'prompt',
      'system-modify': 'deny',
    },
  },
  imperator: {
    level: 'imperator',
    label: 'Imperator',
    description: 'Total lockdown. No high-risk action without manual authorization.',
    permissions: {
      'file-read': 'allow',
      'file-write': 'prompt',
      'file-delete': 'prompt',
      'network-request': 'prompt',
      'shell-execute': 'prompt',
      'mcp-call': 'prompt',
      'system-modify': 'deny',
    },
  },
} as const
