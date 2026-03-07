import OpenAI from 'openai'
import type {
  LlmProvider,
  LlmMessage,
  LlmCompletionOptions,
  LlmCompletionResult,
  Result,
} from '@imperium/shared-types'
import { ok, err } from '@imperium/shared-types'

// ============================================================================
// OpenAI Provider
// ============================================================================

/** Default pricing per million tokens (GPT-4o) */
const DEFAULT_INPUT_COST_PER_M = 2.5
const DEFAULT_OUTPUT_COST_PER_M = 10.0

export class OpenAiProvider implements LlmProvider {
  readonly type = 'openai' as const
  readonly name = 'OpenAI'

  private readonly client: OpenAI

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey ?? process.env['OPENAI_API_KEY'],
    })
  }

  async complete(
    messages: readonly LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<Result<LlmCompletionResult>> {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        ...(options.stopSequences ? { stop: options.stopSequences as string[] } : {}),
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      })

      const choice = response.choices[0]
      if (!choice) {
        return err(new Error('No completion choices returned'))
      }

      const inputTokens = response.usage?.prompt_tokens ?? 0
      const outputTokens = response.usage?.completion_tokens ?? 0
      const costUsd =
        (inputTokens / 1_000_000) * DEFAULT_INPUT_COST_PER_M +
        (outputTokens / 1_000_000) * DEFAULT_OUTPUT_COST_PER_M

      return ok({
        content: choice.message.content ?? '',
        model: response.model,
        inputTokens,
        outputTokens,
        costUsd,
      })
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`OpenAI API error: ${String(error)}`),
      )
    }
  }
}
