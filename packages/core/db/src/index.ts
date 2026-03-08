// ============================================================================
// @imperium/core-db — Drizzle ORM + bun:sqlite persistence layer
// ============================================================================

// Client
export { createDb, createInMemoryDb } from './client.js'
export type { ImperiumDb } from './client.js'

// Schema
export { chatMessages, memoryBlocks, projects, tasks, taskComments, costEntries } from './schema.js'

// Repositories
export { ChatMessageRepository } from './repositories/chat-message-repository.js'
export { MemoryBlockRepository } from './repositories/memory-block-repository.js'
export { TaskRepository } from './repositories/task-repository.js'
export { CostEntryRepository } from './repositories/cost-entry-repository.js'
export { ProjectRepository } from './repositories/project-repository.js'
