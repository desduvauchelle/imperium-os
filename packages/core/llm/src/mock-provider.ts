import type {
  LlmProvider,
  LlmMessage,
  LlmCompletionOptions,
  LlmCompletionResult,
  Result,
} from '@imperium/shared-types'
import { ok } from '@imperium/shared-types'

// ============================================================================
// Mock LLM Provider — Deterministic responses for tests
// ============================================================================

export interface MockLlmProviderOptions {
  /** Fixed response content to return */
  readonly responseContent?: string
  /** Fixed model name to return */
  readonly responseModel?: string
  /** Fixed input token count */
  readonly inputTokens?: number
  /** Fixed output token count */
  readonly outputTokens?: number
  /** Fixed cost */
  readonly costUsd?: number
  /** If set, complete() returns err() with this error */
  readonly error?: Error
}

export class MockLlmProvider implements LlmProvider {
  readonly type = 'anthropic' as const  // satisfy the type constraint
  readonly name = 'Mock'

  /** All calls made to complete(), for assertions */
  readonly calls: Array<{
    messages: readonly LlmMessage[]
    options: LlmCompletionOptions
  }> = []

  private readonly opts: MockLlmProviderOptions

  constructor(opts: MockLlmProviderOptions = {}) {
    this.opts = opts
  }

  async complete(
    messages: readonly LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<Result<LlmCompletionResult>> {
    this.calls.push({ messages, options })

    if (this.opts.error) {
      return { ok: false, error: this.opts.error }
    }

    return ok({
      content: this.opts.responseContent ?? 'Mock LLM response summary.',
      model: this.opts.responseModel ?? options.model,
      inputTokens: this.opts.inputTokens ?? 100,
      outputTokens: this.opts.outputTokens ?? 50,
      costUsd: this.opts.costUsd ?? 0.001,
    })
  }
}
