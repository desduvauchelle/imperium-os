import { describe, expect, test } from 'bun:test'
import { NotificationServer, DEFAULT_NOTIFICATION_CONFIG } from '../src/index.js'

describe('NotificationServer', () => {
  test('instantiates with default config', () => {
    const server = new NotificationServer()
    expect(server.config).toEqual(DEFAULT_NOTIFICATION_CONFIG)
  })

  test('accepts partial config override', () => {
    const server = new NotificationServer({ port: 9200 })
    expect(server.config.port).toBe(9200)
    expect(server.config.heartbeatIntervalMs).toBe(DEFAULT_NOTIFICATION_CONFIG.heartbeatIntervalMs)
  })

  test('isRunning defaults to false', () => {
    const server = new NotificationServer()
    expect(server.isRunning).toBe(false)
  })

  test('start throws not-implemented', async () => {
    const server = new NotificationServer()
    await expect(server.start()).rejects.toThrow('Not implemented')
  })

  test('broadcast throws not-implemented', async () => {
    const server = new NotificationServer()
    await expect(server.broadcast({} as never)).rejects.toThrow('Not implemented')
  })

  test('stop throws not-implemented', async () => {
    const server = new NotificationServer()
    await expect(server.stop()).rejects.toThrow('Not implemented')
  })
})
