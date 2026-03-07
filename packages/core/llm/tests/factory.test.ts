import { describe, expect, test } from 'bun:test'
import { createLlmProvider } from '../src/factory.js'
import { AnthropicProvider } from '../src/providers/anthropic.js'
import { GoogleProvider } from '../src/providers/google.js'
import { OpenAiProvider } from '../src/providers/openai.js'
import { OllamaProvider } from '../src/providers/ollama.js'

describe('createLlmProvider', () => {
  test('creates AnthropicProvider for "anthropic"', () => {
    const provider = createLlmProvider('anthropic', { apiKey: 'test-key' })
    expect(provider).toBeInstanceOf(AnthropicProvider)
    expect(provider.type).toBe('anthropic')
    expect(provider.name).toBe('Anthropic')
  })

  test('creates GoogleProvider for "google"', () => {
    const provider = createLlmProvider('google', { apiKey: 'test-key' })
    expect(provider).toBeInstanceOf(GoogleProvider)
    expect(provider.type).toBe('google')
    expect(provider.name).toBe('Google')
  })

  test('creates OpenAiProvider for "openai"', () => {
    const provider = createLlmProvider('openai', { apiKey: 'test-key' })
    expect(provider).toBeInstanceOf(OpenAiProvider)
    expect(provider.type).toBe('openai')
    expect(provider.name).toBe('OpenAI')
  })

  test('creates OllamaProvider for "ollama"', () => {
    const provider = createLlmProvider('ollama', { baseUrl: 'http://localhost:11434' })
    expect(provider).toBeInstanceOf(OllamaProvider)
    expect(provider.type).toBe('ollama')
    expect(provider.name).toBe('Ollama')
  })
})
