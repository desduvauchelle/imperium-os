import type { LlmProvider, LlmProviderType } from '@imperium/shared-types'
import { AnthropicProvider } from './providers/anthropic.js'
import { GoogleProvider } from './providers/google.js'
import { OpenAiProvider } from './providers/openai.js'
import { OllamaProvider } from './providers/ollama.js'

// ============================================================================
// LLM Provider Factory
// ============================================================================

export interface CreateLlmProviderOptions {
  /** API key (not needed for Ollama) */
  readonly apiKey?: string
  /** Base URL override (Ollama only) */
  readonly baseUrl?: string
}

/**
 * Create an LLM provider by type.
 * API keys are read from constructor args or environment variables.
 */
export function createLlmProvider(
  type: LlmProviderType,
  options: CreateLlmProviderOptions = {},
): LlmProvider {
  switch (type) {
    case 'anthropic':
      return new AnthropicProvider(options.apiKey)
    case 'google':
      return new GoogleProvider(options.apiKey)
    case 'openai':
      return new OpenAiProvider(options.apiKey)
    case 'ollama':
      return new OllamaProvider(options.baseUrl)
  }
}
