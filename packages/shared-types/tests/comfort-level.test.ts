import { describe, expect, test } from 'bun:test'
import {
  COMFORT_LEVELS,
  DEFAULT_PROFILES,
  isComfortLevel,
} from '../src/comfort-level.js'
import type { ComfortLevel, ComfortLevelProfile } from '../src/comfort-level.js'

describe('Comfort Level Types', () => {
  test('COMFORT_LEVELS contains all levels', () => {
    expect(COMFORT_LEVELS).toEqual(['mad-max', 'praetorian', 'imperator'])
  })

  test('isComfortLevel returns true for valid levels', () => {
    expect(isComfortLevel('mad-max')).toBe(true)
    expect(isComfortLevel('praetorian')).toBe(true)
    expect(isComfortLevel('imperator')).toBe(true)
  })

  test('isComfortLevel returns false for invalid values', () => {
    expect(isComfortLevel('admin')).toBe(false)
    expect(isComfortLevel('')).toBe(false)
    expect(isComfortLevel(null)).toBe(false)
    expect(isComfortLevel(123)).toBe(false)
  })

  test('DEFAULT_PROFILES has all three levels', () => {
    expect(Object.keys(DEFAULT_PROFILES)).toEqual(['mad-max', 'praetorian', 'imperator'])
  })

  test('Mad Max profile allows everything', () => {
    const profile = DEFAULT_PROFILES['mad-max']
    const permissions = Object.values(profile.permissions)
    expect(permissions.every((p) => p === 'allow')).toBe(true)
  })

  test('Imperator profile never allows dangerous actions freely', () => {
    const profile = DEFAULT_PROFILES['imperator']
    expect(profile.permissions['file-delete']).toBe('prompt')
    expect(profile.permissions['shell-execute']).toBe('prompt')
    expect(profile.permissions['system-modify']).toBe('deny')
  })

  test('Praetorian profile is balanced', () => {
    const profile = DEFAULT_PROFILES['praetorian']
    expect(profile.permissions['file-read']).toBe('allow')
    expect(profile.permissions['file-write']).toBe('allow')
    expect(profile.permissions['file-delete']).toBe('prompt')
    expect(profile.permissions['system-modify']).toBe('deny')
  })

  test('each profile has required fields', () => {
    for (const level of COMFORT_LEVELS) {
      const profile: ComfortLevelProfile = DEFAULT_PROFILES[level]
      expect(profile.level).toBe(level)
      expect(typeof profile.label).toBe('string')
      expect(typeof profile.description).toBe('string')
      expect(profile.label.length).toBeGreaterThan(0)
      expect(profile.description.length).toBeGreaterThan(0)
    }
  })

  test('type narrowing works with guard', () => {
    const value: unknown = 'praetorian'
    if (isComfortLevel(value)) {
      const level: ComfortLevel = value
      expect(level).toBe('praetorian')
    }
  })
})
