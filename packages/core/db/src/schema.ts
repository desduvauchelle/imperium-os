import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// ============================================================================
// Database Schema — Drizzle ORM (bun:sqlite)
// ============================================================================

/** Chat messages table — full raw archive */
export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  role: text('role', { enum: ['user', 'assistant', 'system', 'tool'] }).notNull(),
  content: text('content').notNull(),
  timestamp: text('timestamp').notNull(),
  model: text('model'),
  tokenCount: integer('token_count'),
  costUsd: real('cost_usd'),
})

/** Memory blocks table — summarized context snapshots */
export const memoryBlocks = sqliteTable('memory_blocks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  summary: text('summary').notNull(),
  fromMessageId: text('from_message_id').notNull(),
  toMessageId: text('to_message_id').notNull(),
  createdAt: text('created_at').notNull(),
  tokenCount: integer('token_count').notNull(),
})

/** Projects table — project metadata */
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  status: text('status', { enum: ['active', 'archived', 'paused'] }).notNull().default('active'),
  comfortLevel: text('comfort_level', { enum: ['mad-max', 'praetorian', 'imperator'] }).notNull().default('praetorian'),
  rootPath: text('root_path').notNull(),
  memoryPath: text('memory_path').notNull(),
  tasksPath: text('tasks_path').notNull(),
  defaultModel: text('default_model').notNull().default('claude-3.5-sonnet'),
  maxTokenBudget: integer('max_token_budget').notNull().default(100000),
  slidingWindowSize: integer('sliding_window_size').notNull().default(10),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ============================================================================
// Phase 5 — Kanban Tasks
// ============================================================================

/** Tasks table — Kanban board task cards */
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  status: text('status', { enum: ['todo', 'in-progress', 'review', 'done'] }).notNull().default('todo'),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'critical'] }).notNull().default('medium'),
  assignee: text('assignee'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

/** Task comments table — comments on Kanban cards */
export const taskComments = sqliteTable('task_comments', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  author: text('author').notNull(),
  content: text('content').notNull(),
  emoji: text('emoji'),
  createdAt: text('created_at').notNull(),
})

// ============================================================================
// Phase 5 — Cost Entries (persistent costing)
// ============================================================================

/** Cost entries table — persisted usage records */
export const costEntries = sqliteTable('cost_entries', {
  id: text('id').primaryKey(),
  model: text('model').notNull(),
  provider: text('provider', { enum: ['anthropic', 'openai', 'google', 'local'] }).notNull(),
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  costUsd: real('cost_usd').notNull(),
  timestamp: text('timestamp').notNull(),
})
