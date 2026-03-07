import { describe, expect, test } from 'bun:test'
import { PermissionGuard } from '../src/index.js'

describe('PermissionGuard', () => {
  test('instantiates with default praetorian level', () => {
    const guard = new PermissionGuard()
    expect(guard.profile.level).toBe('praetorian')
  })

  test('accepts custom comfort level', () => {
    const guard = new PermissionGuard('mad-max')
    expect(guard.profile.level).toBe('mad-max')
  })

  test('evaluate returns correct verdict for mad-max', () => {
    const guard = new PermissionGuard('mad-max')
    const result = guard.evaluate('file-delete')
    expect(result.verdict).toBe('allow')
    expect(result.action).toBe('file-delete')
    expect(result.comfortLevel).toBe('mad-max')
  })

  test('evaluate returns prompt for praetorian file-delete', () => {
    const guard = new PermissionGuard('praetorian')
    const result = guard.evaluate('file-delete')
    expect(result.verdict).toBe('prompt')
  })

  test('evaluate returns deny for imperator system-modify', () => {
    const guard = new PermissionGuard('imperator')
    const result = guard.evaluate('system-modify')
    expect(result.verdict).toBe('deny')
  })

  test('setLevel changes the active profile', () => {
    const guard = new PermissionGuard('mad-max')
    expect(guard.profile.level).toBe('mad-max')
    guard.setLevel('imperator')
    expect(guard.profile.level).toBe('imperator')
  })

  test('evaluateAll returns results for all actions', () => {
    const guard = new PermissionGuard('praetorian')
    const results = guard.evaluateAll(['file-read', 'file-delete', 'system-modify'])
    expect(results).toHaveLength(3)
    expect(results[0]!.verdict).toBe('allow')
    expect(results[1]!.verdict).toBe('prompt')
    expect(results[2]!.verdict).toBe('deny')
  })

  test('reason string includes profile name', () => {
    const guard = new PermissionGuard('praetorian')
    const result = guard.evaluate('file-read')
    expect(result.reason).toContain('Praetorian')
  })
})
