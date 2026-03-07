import { describe, expect, test } from 'bun:test'
import { PowerManager, DEFAULT_POWER_CONFIG } from '../src/index.js'

describe('PowerManager', () => {
  test('instantiates with default config', () => {
    const pm = new PowerManager()
    expect(pm.config).toEqual(DEFAULT_POWER_CONFIG)
  })

  test('default mode is normal', () => {
    const pm = new PowerManager()
    expect(pm.mode).toBe('normal')
  })

  test('accepts custom config', () => {
    const pm = new PowerManager({ autoRestart: true })
    expect(pm.config.autoRestart).toBe(true)
    expect(pm.config.caffeinateCommand).toBe('caffeinate')
  })

  test('preventSleep throws not-implemented', async () => {
    const pm = new PowerManager()
    await expect(pm.preventSleep()).rejects.toThrow('Not implemented')
  })

  test('allowSleep throws not-implemented', async () => {
    const pm = new PowerManager()
    await expect(pm.allowSleep()).rejects.toThrow('Not implemented')
  })

  test('isAvailable throws not-implemented', async () => {
    const pm = new PowerManager()
    await expect(pm.isAvailable()).rejects.toThrow('Not implemented')
  })
})
