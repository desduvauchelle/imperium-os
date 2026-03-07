import { describe, expect, test } from 'bun:test'
import { THEME_MODES, isThemeMode } from '../src/theme.js'
import type { ThemeConfig, ThemeMode } from '../src/theme.js'

describe('Theme Types', () => {
  test('THEME_MODES contains all valid modes', () => {
    expect(THEME_MODES).toEqual(['light', 'dark', 'auto'])
  })

  test('isThemeMode returns true for valid modes', () => {
    expect(isThemeMode('light')).toBe(true)
    expect(isThemeMode('dark')).toBe(true)
    expect(isThemeMode('auto')).toBe(true)
  })

  test('isThemeMode returns false for invalid values', () => {
    expect(isThemeMode('invalid')).toBe(false)
    expect(isThemeMode('')).toBe(false)
    expect(isThemeMode(null)).toBe(false)
    expect(isThemeMode(undefined)).toBe(false)
    expect(isThemeMode(42)).toBe(false)
    expect(isThemeMode({})).toBe(false)
  })

  test('ThemeConfig accepts valid configuration', () => {
    const config: ThemeConfig = {
      mode: 'dark',
      accentColor: '#ff0000',
      fontSize: 'medium',
    }
    expect(config.mode).toBe('dark')
    expect(config.accentColor).toBe('#ff0000')
    expect(config.fontSize).toBe('medium')
  })

  test('ThemeConfig works with minimal config', () => {
    const config: ThemeConfig = { mode: 'auto' }
    expect(config.mode).toBe('auto')
    expect(config.accentColor).toBeUndefined()
    expect(config.fontSize).toBeUndefined()
  })

  test('ThemeMode type is correctly narrowed by guard', () => {
    const value: unknown = 'dark'
    if (isThemeMode(value)) {
      // TypeScript should narrow this to ThemeMode
      const mode: ThemeMode = value
      expect(mode).toBe('dark')
    }
  })
})
