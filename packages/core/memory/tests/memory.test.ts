import { describe, expect, test, beforeEach } from 'bun:test'
import { MemorySnapshotManager, DEFAULT_MEMORY_CONFIG } from '../src/index.js'
import { createInMemoryDb, ChatMessageRepository, MemoryBlockRepository } from '@imperium/core-db'
import { MockLlmProvider } from '@imperium/core-llm'
import type { ChatMessage, SlidingWindowConfig } from '@imperium/shared-types'
import {
  createMessageId,
  createProjectId,
  createTimestamp,
  isOk,
  isErr,
} from '@imperium/shared-types'

describe('MemorySnapshotManager', () => {
  let chatRepo: ChatMessageRepository
  let blockRepo: MemoryBlockRepository
  let mockLlm: MockLlmProvider
  let manager: MemorySnapshotManager

  const projectId = createProjectId('test-project')

  function makeMessages(count: number, tokenCount = 100): readonly ChatMessage[] {
    return Array.from({ length: count }, (_, i) => ({
      id: createMessageId(`msg-${i}`),
      projectId,
      role: 'user' as const,
      content: `Message ${i}`,
      timestamp: createTimestamp(new Date(`2025-01-01T${String(i).padStart(2, '0')}:00:00Z`)),
      tokenCount,
    }))
  }

  beforeEach(() => {
    const db = createInMemoryDb()
    chatRepo = new ChatMessageRepository(db)
    blockRepo = new MemoryBlockRepository(db)
    mockLlm = new MockLlmProvider({
      responseContent: 'Summarized: key decisions were made about architecture.',
      outputTokens: 30,
    })
    manager = new MemorySnapshotManager(chatRepo, blockRepo, mockLlm)
  })

  // ========== shouldSnapshot ==========

  test('shouldSnapshot returns false when under maxMessages', () => {
    const messages = makeMessages(5)
    expect(manager.shouldSnapshot(messages)).toBe(false)
  })

  test('shouldSnapshot returns true when over maxMessages', () => {
    const messages = makeMessages(15)
    expect(manager.shouldSnapshot(messages)).toBe(true)
  })

  test('shouldSnapshot returns true when token threshold exceeded', () => {
    // 8 messages × 1000 tokens = 8000, threshold is 6000
    const messages = makeMessages(8, 1000)
    const config: SlidingWindowConfig = {
      maxMessages: 20,
      maxTokens: 10000,
      summarizeThreshold: 6000,
    }
    expect(manager.shouldSnapshot(messages, config)).toBe(true)
  })

  test('shouldSnapshot with custom config', () => {
    const messages = makeMessages(3)
    const config: SlidingWindowConfig = { maxMessages: 2, maxTokens: 5000, summarizeThreshold: 3000 }
    expect(manager.shouldSnapshot(messages, config)).toBe(true)
  })

  // ========== createSnapshot ==========

  test('createSnapshot calls LLM and stores block', async () => {
    const messages = makeMessages(5)
    const result = await manager.createSnapshot(projectId, messages)

    expect(isOk(result)).toBe(true)
    if (result.ok) {
      expect(result.value.summary).toBe('Summarized: key decisions were made about architecture.')
      expect(result.value.projectId).toBe(projectId)
      expect(result.value.messageRange.from).toBe('msg-0')
      expect(result.value.messageRange.to).toBe('msg-4')
      expect(result.value.tokenCount).toBe(30)
    }

    // Verify stored in DB
    const blocks = await blockRepo.getByProject(projectId)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.summary).toBe('Summarized: key decisions were made about architecture.')
  })

  test('createSnapshot passes correct messages to LLM', async () => {
    const messages = makeMessages(3)
    await manager.createSnapshot(projectId, messages)

    expect(mockLlm.calls).toHaveLength(1)
    const call = mockLlm.calls[0]!
    expect(call.messages).toHaveLength(2) // system + user
    expect(call.messages[0]!.role).toBe('system')
    expect(call.messages[1]!.content).toContain('Message 0')
    expect(call.messages[1]!.content).toContain('Message 2')
  })

  test('createSnapshot returns error for empty messages', async () => {
    const result = await manager.createSnapshot(projectId, [])
    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error.message).toContain('empty messages')
    }
  })

  test('createSnapshot returns error when LLM fails', async () => {
    const failLlm = new MockLlmProvider({ error: new Error('Rate limited') })
    const failManager = new MemorySnapshotManager(chatRepo, blockRepo, failLlm)

    const result = await failManager.createSnapshot(projectId, makeMessages(3))
    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error.message).toBe('Rate limited')
    }
  })

  // ========== pruneWindow ==========

  test('pruneWindow returns all messages when under limit', () => {
    const messages = makeMessages(5)
    const result = manager.pruneWindow(messages)
    expect(result).toHaveLength(5)
  })

  test('pruneWindow returns last N messages when over limit', () => {
    const messages = makeMessages(15)
    const result = manager.pruneWindow(messages)
    expect(result).toHaveLength(10) // DEFAULT_SLIDING_WINDOW.maxMessages
    expect(result[0]!.id).toBe('msg-5')
    expect(result[9]!.id).toBe('msg-14')
  })

  test('pruneWindow respects custom config', () => {
    const messages = makeMessages(10)
    const config: SlidingWindowConfig = { maxMessages: 3, maxTokens: 5000, summarizeThreshold: 3000 }
    const result = manager.pruneWindow(messages, config)
    expect(result).toHaveLength(3)
    expect(result[0]!.id).toBe('msg-7')
  })

  // ========== getContext ==========

  test('getContext builds snapshot from DB', async () => {
    // Insert messages into DB
    const messages = makeMessages(5)
    for (const msg of messages) {
      await chatRepo.insert(msg)
    }

    const result = await manager.getContext(projectId, '├── src/')
    expect(isOk(result)).toBe(true)
    if (result.ok) {
      expect(result.value.projectId).toBe(projectId)
      expect(result.value.recentMessages).toHaveLength(5)
      expect(result.value.memoryBlocks).toHaveLength(0)
      expect(result.value.fileTreeSkeleton).toBe('├── src/')
      expect(result.value.snapshotAt).toBeTruthy()
    }
  })

  test('getContext includes memory blocks', async () => {
    // Insert messages and create a snapshot first
    const messages = makeMessages(5)
    for (const msg of messages) {
      await chatRepo.insert(msg)
    }
    await manager.createSnapshot(projectId, messages)

    const result = await manager.getContext(projectId)
    expect(isOk(result)).toBe(true)
    if (result.ok) {
      expect(result.value.memoryBlocks).toHaveLength(1)
      expect(result.value.memoryBlocks[0]!.summary).toContain('Summarized')
    }
  })

  // ========== config ==========

  test('uses default config when none provided', () => {
    expect(manager.config).toEqual(DEFAULT_MEMORY_CONFIG)
  })

  test('accepts partial config override', () => {
    const custom = new MemorySnapshotManager(chatRepo, blockRepo, mockLlm, {
      summarizationModel: 'gpt-4o',
    })
    expect(custom.config.summarizationModel).toBe('gpt-4o')
    expect(custom.config.slidingWindow).toEqual(DEFAULT_MEMORY_CONFIG.slidingWindow)
  })
})
