import { desc } from 'drizzle-orm'
import type { ImperiumDb } from '../client.js'
import { projects } from '../schema.js'
import type { ProjectMetadata, ProjectId, Timestamp, ProjectStatus, ComfortLevel } from '@imperium/shared-types'

// ============================================================================
// Project Repository
// ============================================================================

export class ProjectRepository {
	constructor(private readonly db: ImperiumDb) { }

	/** Get all projects ordered by creation date descending */
	async listAll(): Promise<readonly ProjectMetadata[]> {
		const rows = await this.db
			.select({
				id: projects.id,
				name: projects.name,
				description: projects.description,
				status: projects.status,
				comfortLevel: projects.comfortLevel,
				createdAt: projects.createdAt,
				updatedAt: projects.updatedAt,
			})
			.from(projects)
			.orderBy(desc(projects.createdAt))

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
		return rows.map((row: { id: string; name: string; description: string; status: string; comfortLevel: string; createdAt: string; updatedAt: string }) => ({
			id: row.id as ProjectId,
			name: row.name,
			description: row.description,
			status: row.status as ProjectStatus,
			comfortLevel: row.comfortLevel as ComfortLevel,
			createdAt: row.createdAt as Timestamp,
			updatedAt: row.updatedAt as Timestamp,
			tags: [], // Tags aren't in the schema, just returning an empty array to satisfy ProjectMetadata
		}))
	}

	/** Create a new project */
	async insert(data: {
		id: string
		name: string
		description?: string
		status?: 'active' | 'archived' | 'paused'
		comfortLevel?: 'mad-max' | 'praetorian' | 'imperator'
		rootPath: string
		memoryPath: string
		tasksPath: string
	}): Promise<ProjectMetadata> {
		const now = new Date().toISOString()

		await this.db.insert(projects).values({
			id: data.id,
			name: data.name,
			description: data.description ?? '',
			status: data.status ?? 'active',
			comfortLevel: data.comfortLevel ?? 'praetorian',
			rootPath: data.rootPath,
			memoryPath: data.memoryPath,
			tasksPath: data.tasksPath,
			createdAt: now,
			updatedAt: now,
		}).run()

		return {
			id: data.id as ProjectId,
			name: data.name,
			description: data.description ?? '',
			status: (data.status ?? 'active') as ProjectStatus,
			comfortLevel: (data.comfortLevel ?? 'praetorian') as ComfortLevel,
			createdAt: now as Timestamp,
			updatedAt: now as Timestamp,
			tags: []
		}
	}
}
