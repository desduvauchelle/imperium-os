// ============================================================================
// Theme Types
// ============================================================================

/** Theme mode options */
export type ThemeMode = 'light' | 'dark' | 'auto'

/** All valid theme mode values */
export const THEME_MODES = ['light', 'dark', 'auto'] as const satisfies readonly ThemeMode[]

/** Type guard for ThemeMode */
export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && THEME_MODES.includes(value as ThemeMode)
}

/** Theme configuration */
export interface ThemeConfig {
  readonly mode: ThemeMode
  readonly accentColor?: string | undefined
  readonly fontSize?: 'small' | 'medium' | 'large' | undefined
}
