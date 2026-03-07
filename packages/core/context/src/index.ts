import type { ContextSnapshot, ProjectId, Result, SlidingWindowConfig } from '@imperium/shared-types'
import { DEFAULT_SLIDING_WINDOW, ok, err, createTimestamp } from '@imperium/shared-types'
import type { MemorySnapshotManager } from '@imperium/core-memory'
import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

// ============================================================================
// Context Assembler Configuration
// ============================================================================

export interface ContextAssemblerConfig {
  readonly slidingWindow: SlidingWindowConfig
  readonly fileTreeDepth: number
  readonly includeMemoryBlocks: boolean
}

export const DEFAULT_CONTEXT_CONFIG: ContextAssemblerConfig = {
  slidingWindow: DEFAULT_SLIDING_WINDOW,
  fileTreeDepth: 3,
  includeMemoryBlocks: true,
}

/** Directories to ignore when building the file tree */
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'out',
  '.next',
  '.turbo',
  '.cache',
  'coverage',
  '__pycache__',
  '.DS_Store',
])

// ============================================================================
// Context Assembler - RAG + File Tree + Summarization
// ============================================================================

export class ContextAssembler {
  readonly config: ContextAssemblerConfig

  constructor(
    private readonly memoryManager?: MemorySnapshotManager,
    config: Partial<ContextAssemblerConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONTEXT_CONFIG, ...config }
  }

  /**
   * Build a full context snapshot for a given project.
   * Combines memory blocks, recent messages, and the file tree.
   */
  async assembleContext(
    projectId: ProjectId,
    rootPath: string,
  ): Promise<Result<ContextSnapshot>> {
    try {
      // Build file tree
      const treeResult = await this.getFileTree(rootPath)
      if (!treeResult.ok) return treeResult

      // If we have a memory manager, get context from it
      if (this.memoryManager && this.config.includeMemoryBlocks) {
        const contextResult = await this.memoryManager.getContext(
          projectId,
          treeResult.value,
        )
        return contextResult
      }

      // Fallback: return a snapshot with just the file tree
      return ok({
        projectId,
        memoryBlocks: [],
        recentMessages: [],
        fileTreeSkeleton: treeResult.value,
        snapshotAt: createTimestamp(),
      })
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to assemble context: ${String(error)}`),
      )
    }
  }

  /**
   * Generate a file tree skeleton at the configured depth.
   * Returns an indented ASCII tree string.
   */
  async getFileTree(
    rootPath: string,
    maxDepth?: number,
  ): Promise<Result<string>> {
    try {
      const depth = maxDepth ?? this.config.fileTreeDepth
      const lines: string[] = []
      await buildTree(rootPath, '', depth, lines)
      return ok(lines.join('\n'))
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to build file tree: ${String(error)}`),
      )
    }
  }
}

// ============================================================================
// File Tree Builder (recursive)
// ============================================================================

async function buildTree(
  dirPath: string,
  prefix: string,
  remainingDepth: number,
  lines: string[],
): Promise<void> {
  if (remainingDepth <= 0) return

  let entries: string[]
  try {
    entries = await readdir(dirPath)
  } catch {
    return // Skip unreadable directories
  }

  // Filter and sort: directories first, then files, alphabetically
  const filtered = entries.filter((name) => !IGNORED_DIRS.has(name))
  const withStats = await Promise.all(
    filtered.map(async (name) => {
      try {
        const fullPath = join(dirPath, name)
        const s = await stat(fullPath)
        return { name, isDir: s.isDirectory() }
      } catch {
        return { name, isDir: false }
      }
    }),
  )

  const sorted = withStats.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]!
    const isLast = i === sorted.length - 1
    const connector = isLast ? '└── ' : '├── '
    const childPrefix = isLast ? '    ' : '│   '

    if (entry.isDir) {
      lines.push(`${prefix}${connector}${entry.name}/`)
      await buildTree(
        join(dirPath, entry.name),
        `${prefix}${childPrefix}`,
        remainingDepth - 1,
        lines,
      )
    } else {
      lines.push(`${prefix}${connector}${entry.name}`)
    }
  }
}
