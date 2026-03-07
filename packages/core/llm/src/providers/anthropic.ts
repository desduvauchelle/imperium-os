import Anthropic from '@anthropic-ai/sdk'
import type {
  LlmProvider,
  LlmMessage,
  LlmCompletionOptions,
  LlmCompletionResult,
  Result,
} from '@imperium/shared-types'
import { ok, err } from '@imperium/shared-types'

// ============================================================================
// Anthropic Provider (Claude)
// ============================================================================

/** Default pricing per million tokens (Claude 3.5 Sonnet) */
const DEFAULT_INPUT_COST_PER_M = 3.0
const DEFAULT_OUTPUT_COST_PER_M = 15.0

export class AnthropicProvider implements LlmProvider {
  readonly type = 'anthropic' as const
  readonly name = 'Anthropic'

  private readonly client: Anthropic

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env['ANTHROPIC_API_KEY'],
    })
  }

  async complete(
    messages: readonly LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<Result<LlmCompletionResult>> {
    try {
      // Extract system message if present
      const systemMessage = messages.find((m) => m.role === 'system')
      const conversationMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))

      const response = await this.client.messages.create({
        model: options.model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        ...(systemMessage ? { system: systemMessage.content } : {}),
        messages: conversationMessages,
        ...(options.stopSequences ? { stop_sequences: options.stopSequences as string[] } : {}),
      })

      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')

      const inputTokens = response.usage.input_tokens
      const outputTokens = response.usage.output_tokens
      const costUsd =
        (inputTokens / 1_000_000) * DEFAULT_INPUT_COST_PER_M +
        (outputTokens / 1_000_000) * DEFAULT_OUTPUT_COST_PER_M

      return ok({
        content,
        model: response.model,
        inputTokens,
        outputTokens,
        costUsd,
      })
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Anthropic API error: ${String(error)}`),
      )
    }
  }
}
