import { GoogleGenerativeAI } from '@google/generative-ai'
import type {
  LlmProvider,
  LlmMessage,
  LlmCompletionOptions,
  LlmCompletionResult,
  Result,
} from '@imperium/shared-types'
import { ok, err } from '@imperium/shared-types'

// ============================================================================
// Google Provider (Gemini)
// ============================================================================

/** Default pricing per million tokens (Gemini 1.5 Pro) */
const DEFAULT_INPUT_COST_PER_M = 1.25
const DEFAULT_OUTPUT_COST_PER_M = 5.0

export class GoogleProvider implements LlmProvider {
  readonly type = 'google' as const
  readonly name = 'Google'

  private readonly client: GoogleGenerativeAI

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env['GOOGLE_API_KEY'] ?? ''
    this.client = new GoogleGenerativeAI(key)
  }

  async complete(
    messages: readonly LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<Result<LlmCompletionResult>> {
    try {
      const model = this.client.getGenerativeModel({
        model: options.model,
        generationConfig: {
          maxOutputTokens: options.maxTokens ?? 4096,
          temperature: options.temperature ?? 0.7,
          ...(options.stopSequences ? { stopSequences: options.stopSequences as string[] } : {}),
        },
      })

      // Extract system instruction if present
      const systemMessage = messages.find((m) => m.role === 'system')
      const chatMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
          parts: [{ text: m.content }],
        }))

      // Use the last user message as the prompt; prior messages as history
      const lastMessage = chatMessages[chatMessages.length - 1]
      if (!lastMessage) {
        return err(new Error('No messages provided'))
      }

      const history = chatMessages.slice(0, -1)

      const chat = model.startChat({
        history,
        ...(systemMessage
          ? { systemInstruction: { role: 'user' as const, parts: [{ text: systemMessage.content }] } }
          : {}),
      })

      const result = await chat.sendMessage(lastMessage.parts)
      const response = result.response
      const text = response.text()

      const usageMetadata = response.usageMetadata
      const inputTokens = usageMetadata?.promptTokenCount ?? 0
      const outputTokens = usageMetadata?.candidatesTokenCount ?? 0
      const costUsd =
        (inputTokens / 1_000_000) * DEFAULT_INPUT_COST_PER_M +
        (outputTokens / 1_000_000) * DEFAULT_OUTPUT_COST_PER_M

      return ok({
        content: text,
        model: options.model,
        inputTokens,
        outputTokens,
        costUsd,
      })
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Google API error: ${String(error)}`),
      )
    }
  }
}
