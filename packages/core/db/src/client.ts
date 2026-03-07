import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema.js'

// ============================================================================
// Database Client Factory
// ============================================================================

export type ImperiumDb = ReturnType<typeof drizzle<typeof schema>>

/**
 * Create a persistent database at the given file path.
 * Enables WAL mode for concurrent read performance.
 */
export function createDb(path: string): ImperiumDb {
  const sqlite = new Database(path)
  sqlite.exec('PRAGMA journal_mode = WAL;')
  sqlite.exec('PRAGMA foreign_keys = ON;')
  return drizzle(sqlite, { schema })
}

/**
 * Create an in-memory database — ideal for unit tests.
 * Automatically runs the schema DDL statements to create tables.
 */
export function createInMemoryDb(): ImperiumDb {
  const sqlite = new Database(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON;')

  // Create tables inline for in-memory use (no migration files needed)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      model TEXT,
      token_count INTEGER,
      cost_usd REAL
    );

    CREATE TABLE IF NOT EXISTS memory_blocks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      from_message_id TEXT NOT NULL,
      to_message_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      token_count INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'paused')),
      comfort_level TEXT NOT NULL DEFAULT 'praetorian' CHECK(comfort_level IN ('mad-max', 'praetorian', 'imperator')),
      root_path TEXT NOT NULL,
      memory_path TEXT NOT NULL,
      tasks_path TEXT NOT NULL,
      default_model TEXT NOT NULL DEFAULT 'claude-3.5-sonnet',
      max_token_budget INTEGER NOT NULL DEFAULT 100000,
      sliding_window_size INTEGER NOT NULL DEFAULT 10,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  return drizzle(sqlite, { schema })
}
