import type {
  LlmProvider,
  LlmMessage,
  LlmCompletionOptions,
  LlmCompletionResult,
  Result,
} from '@imperium/shared-types'
import { ok, err } from '@imperium/shared-types'

// ============================================================================
// Ollama Provider (Local Models)
// ============================================================================

/** Ollama local models are typically free */
const LOCAL_COST = 0

interface OllamaChatResponse {
  readonly message: { readonly content: string }
  readonly model: string
  readonly prompt_eval_count?: number
  readonly eval_count?: number
}

export class OllamaProvider implements LlmProvider {
  readonly type = 'ollama' as const
  readonly name = 'Ollama'

  private readonly baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434'
  }

  async complete(
    messages: readonly LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<Result<LlmCompletionResult>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
          options: {
            num_predict: options.maxTokens ?? 4096,
            temperature: options.temperature ?? 0.7,
            stop: options.stopSequences,
          },
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        return err(new Error(`Ollama API error (${response.status}): ${text}`))
      }

      const data = (await response.json()) as OllamaChatResponse
      const inputTokens = data.prompt_eval_count ?? 0
      const outputTokens = data.eval_count ?? 0

      return ok({
        content: data.message.content,
        model: data.model,
        inputTokens,
        outputTokens,
        costUsd: LOCAL_COST,
      })
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Ollama API error: ${String(error)}`),
      )
    }
  }
}
