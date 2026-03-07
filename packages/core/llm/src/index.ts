// ============================================================================
// @imperium/core-llm — Unified LLM provider abstraction
// ============================================================================

// Factory
export { createLlmProvider } from './factory.js'
export type { CreateLlmProviderOptions } from './factory.js'

// Providers
export { AnthropicProvider } from './providers/anthropic.js'
export { GoogleProvider } from './providers/google.js'
export { OpenAiProvider } from './providers/openai.js'
export { OllamaProvider } from './providers/ollama.js'

// Mock (for tests in downstream packages)
export { MockLlmProvider } from './mock-provider.js'
export type { MockLlmProviderOptions } from './mock-provider.js'
