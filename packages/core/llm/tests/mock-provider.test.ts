import { describe, expect, test } from 'bun:test'
import { MockLlmProvider } from '../src/mock-provider.js'
import type { LlmMessage, LlmCompletionOptions } from '@imperium/shared-types'
import { isOk, isErr } from '@imperium/shared-types'

describe('MockLlmProvider', () => {
  const messages: readonly LlmMessage[] = [
    { role: 'system', content: 'You are a summarizer.' },
    { role: 'user', content: 'Summarize this conversation.' },
  ]

  const options: LlmCompletionOptions = {
    model: 'mock-model',
    maxTokens: 1000,
  }

  test('returns default mock response', async () => {
    const provider = new MockLlmProvider()
    const result = await provider.complete(messages, options)

    expect(isOk(result)).toBe(true)
    if (result.ok) {
      expect(result.value.content).toBe('Mock LLM response summary.')
      expect(result.value.model).toBe('mock-model')
      expect(result.value.inputTokens).toBe(100)
      expect(result.value.outputTokens).toBe(50)
      expect(result.value.costUsd).toBe(0.001)
    }
  })

  test('returns custom response content', async () => {
    const provider = new MockLlmProvider({
      responseContent: 'Custom summary of the chat.',
      responseModel: 'custom-model',
      inputTokens: 200,
      outputTokens: 80,
      costUsd: 0.005,
    })

    const result = await provider.complete(messages, options)
    expect(isOk(result)).toBe(true)
    if (result.ok) {
      expect(result.value.content).toBe('Custom summary of the chat.')
      expect(result.value.model).toBe('custom-model')
      expect(result.value.inputTokens).toBe(200)
      expect(result.value.outputTokens).toBe(80)
      expect(result.value.costUsd).toBe(0.005)
    }
  })

  test('returns error when configured to fail', async () => {
    const provider = new MockLlmProvider({
      error: new Error('API rate limit exceeded'),
    })

    const result = await provider.complete(messages, options)
    expect(isErr(result)).toBe(true)
    if (!result.ok) {
      expect(result.error.message).toBe('API rate limit exceeded')
    }
  })

  test('records all calls for assertions', async () => {
    const provider = new MockLlmProvider()

    await provider.complete(messages, options)
    await provider.complete([{ role: 'user', content: 'Hello' }], { model: 'other' })

    expect(provider.calls).toHaveLength(2)
    expect(provider.calls[0]!.messages).toEqual(messages)
    expect(provider.calls[0]!.options).toEqual(options)
    expect(provider.calls[1]!.options.model).toBe('other')
  })

  test('implements LlmProvider interface', () => {
    const provider = new MockLlmProvider()
    expect(provider.type).toBe('anthropic')
    expect(provider.name).toBe('Mock')
  })
})
