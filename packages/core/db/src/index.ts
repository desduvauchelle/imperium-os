// ============================================================================
// @imperium/core-db — Drizzle ORM + bun:sqlite persistence layer
// ============================================================================

// Client
export { createDb, createInMemoryDb } from './client.js'
export type { ImperiumDb } from './client.js'

// Schema
export { chatMessages, memoryBlocks, projects } from './schema.js'

// Repositories
export { ChatMessageRepository } from './repositories/chat-message-repository.js'
export { MemoryBlockRepository } from './repositories/memory-block-repository.js'
