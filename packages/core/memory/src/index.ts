import type {
	ChatMessageRepository,
	MemoryBlockRepository,
} from "@imperium/core-db";
import type {
	ChatMessage,
	ContextSnapshot,
	LlmCompletionOptions,
	LlmProvider,
	MemoryBlock,
	ProjectId,
	Result,
	SlidingWindowConfig,
} from "@imperium/shared-types";
import {
	DEFAULT_SLIDING_WINDOW,
	createMemoryBlockId,
	createTimestamp,
	err,
	ok,
} from "@imperium/shared-types";

// ============================================================================
// Memory Snapshot Manager
// ============================================================================

export interface MemorySnapshotManagerConfig {
	readonly slidingWindow: SlidingWindowConfig;
	/** Model to use for summarization */
	readonly summarizationModel: string;
	/** Max tokens for the summarization response */
	readonly summarizationMaxTokens: number;
}

export const DEFAULT_MEMORY_CONFIG: MemorySnapshotManagerConfig = {
	slidingWindow: DEFAULT_SLIDING_WINDOW,
	summarizationModel: "claude-3-5-sonnet-20241022",
	summarizationMaxTokens: 1024,
};

/** System prompt for context summarization */
const SUMMARIZATION_PROMPT = `You are a context summarization engine for Imperium OS.
Your task is to summarize a block of conversation messages into a concise memory block.

Rules:
- Preserve all key decisions, code changes, and technical details
- Mention specific file paths, function names, and configurations discussed
- Keep the summary factual and actionable — no filler
- Output a single paragraph, max 300 words
- Do not include greetings or meta-commentary`;

export class MemorySnapshotManager {
	readonly config: MemorySnapshotManagerConfig;

	constructor(
		private readonly chatRepo: ChatMessageRepository,
		private readonly blockRepo: MemoryBlockRepository,
		private readonly llmProvider: LlmProvider,
		config: Partial<MemorySnapshotManagerConfig> = {},
	) {
		this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
	}

	/**
	 * Check if the current message count exceeds the summarization threshold.
	 * Pure function — no side effects.
	 */
	shouldSnapshot(
		messages: readonly ChatMessage[],
		config: SlidingWindowConfig = this.config.slidingWindow,
	): boolean {
		if (messages.length > config.maxMessages) return true;

		const totalTokens = messages.reduce(
			(sum, m) => sum + (m.tokenCount ?? 0),
			0,
		);
		return totalTokens >= config.summarizeThreshold;
	}

	/**
	 * Create a memory snapshot by summarizing the given messages via LLM.
	 * Stores the resulting MemoryBlock in the database.
	 */
	async createSnapshot(
		projectId: ProjectId,
		messages: readonly ChatMessage[],
	): Promise<Result<MemoryBlock>> {
		if (messages.length === 0) {
			return err(new Error("Cannot create snapshot from empty messages"));
		}

		const firstMsg = messages[0] as ChatMessage;
		const lastMsg = messages[messages.length - 1] as ChatMessage;

		// Build the conversation text for the LLM
		const conversationText = messages
			.map((m) => `[${m.role}]: ${m.content}`)
			.join("\n\n");

		const options: LlmCompletionOptions = {
			model: this.config.summarizationModel,
			maxTokens: this.config.summarizationMaxTokens,
			temperature: 0.3,
		};

		const result = await this.llmProvider.complete(
			[
				{ role: "system", content: SUMMARIZATION_PROMPT },
				{
					role: "user",
					content: `Summarize this conversation:\n\n${conversationText}`,
				},
			],
			options,
		);

		if (!result.ok) {
			return result;
		}

		const blockId = createMemoryBlockId(
			`mb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		const now = createTimestamp();

		const block: MemoryBlock = {
			id: blockId,
			projectId,
			summary: result.value.content,
			messageRange: {
				from: firstMsg.id,
				to: lastMsg.id,
			},
			createdAt: now,
			tokenCount: result.value.outputTokens,
		};

		await this.blockRepo.insert(block);

		return ok(block);
	}

	/**
	 * Return the trimmed sliding window of messages after excluding
	 * the ones that were just snapshotted.
	 */
	pruneWindow(
		messages: readonly ChatMessage[],
		config: SlidingWindowConfig = this.config.slidingWindow,
	): readonly ChatMessage[] {
		if (messages.length <= config.maxMessages) {
			return messages;
		}
		return messages.slice(-config.maxMessages);
	}

	/**
	 * Build context for the LLM: recent messages + memory blocks + file tree placeholder.
	 */
	async getContext(
		projectId: ProjectId,
		fileTreeSkeleton = "",
	): Promise<Result<ContextSnapshot>> {
		try {
			const recentMessages = await this.chatRepo.getWindow(
				projectId,
				this.config.slidingWindow.maxMessages,
			);
			const memoryBlocks = await this.blockRepo.getByProject(projectId);

			const snapshot: ContextSnapshot = {
				projectId,
				memoryBlocks,
				recentMessages,
				fileTreeSkeleton,
				snapshotAt: createTimestamp(),
			};

			return ok(snapshot);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to build context: ${String(error)}`),
			);
		}
	}
}
