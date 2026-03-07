import type { ProjectId, Timestamp } from './brand.js'
import type { ComfortLevel } from './comfort-level.js'

// ============================================================================
// Project Types
// ============================================================================

/** Project status */
export type ProjectStatus = 'active' | 'archived' | 'paused'

/** All valid project statuses */
export const PROJECT_STATUSES = ['active', 'archived', 'paused'] as const satisfies readonly ProjectStatus[]

/** Type guard for ProjectStatus */
export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === 'string' && PROJECT_STATUSES.includes(value as ProjectStatus)
}

/** Project metadata */
export interface ProjectMetadata {
  readonly id: ProjectId
  readonly name: string
  readonly description: string
  readonly createdAt: Timestamp
  readonly updatedAt: Timestamp
  readonly status: ProjectStatus
  readonly comfortLevel: ComfortLevel
  readonly tags: readonly string[]
}

/** Full project configuration */
export interface ProjectConfig {
  readonly metadata: ProjectMetadata
  readonly paths: {
    readonly root: string
    readonly memory: string
    readonly tasks: string
  }
  readonly llm: {
    readonly defaultModel: string
    readonly maxTokenBudget: number
    readonly slidingWindowSize: number
  }
}

/** Project with runtime state */
export interface Project {
  readonly config: ProjectConfig
  readonly isLocked: boolean
  readonly activeAgentCount: number
}
