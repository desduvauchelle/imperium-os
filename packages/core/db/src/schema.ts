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
