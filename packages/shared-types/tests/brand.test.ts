import { describe, expect, test } from 'bun:test'
import {
  createAgentId,
  createMessageId,
  createNotificationId,
  createProjectId,
  createSessionId,
  createTaskId,
  createTimestamp,
  createUserId,
} from '../src/brand.js'

describe('Branded Types', () => {
  test('createProjectId creates a branded string', () => {
    const id = createProjectId('proj-123')
    expect(id).toBe('proj-123')
    // At runtime it's still a string
    expect(typeof id).toBe('string')
  })

  test('createUserId creates a branded string', () => {
    const id = createUserId('user-456')
    expect(id).toBe('user-456')
  })

  test('createTaskId creates a branded string', () => {
    const id = createTaskId('task-789')
    expect(id).toBe('task-789')
  })

  test('createAgentId creates a branded string', () => {
    const id = createAgentId('agent-abc')
    expect(id).toBe('agent-abc')
  })

  test('createSessionId creates a branded string', () => {
    const id = createSessionId('sess-def')
    expect(id).toBe('sess-def')
  })

  test('createMessageId creates a branded string', () => {
    const id = createMessageId('msg-ghi')
    expect(id).toBe('msg-ghi')
  })

  test('createNotificationId creates a branded string', () => {
    const id = createNotificationId('notif-jkl')
    expect(id).toBe('notif-jkl')
  })

  test('createTimestamp returns ISO string', () => {
    const ts = createTimestamp(new Date('2026-01-01T00:00:00.000Z'))
    expect(ts).toBe('2026-01-01T00:00:00.000Z')
  })

  test('createTimestamp defaults to current time', () => {
    const before = new Date().toISOString()
    const ts = createTimestamp()
    const after = new Date().toISOString()
    expect(ts >= before).toBe(true)
    expect(ts <= after).toBe(true)
  })
})
