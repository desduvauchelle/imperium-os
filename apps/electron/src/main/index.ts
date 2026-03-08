/**
 * Imperium Desktop - Main Process Entry
 *
 * This is the Electron main process. It creates the BrowserWindow,
 * sets up IPC handlers, and loads the renderer.
 *
 * Phase 1: Stub — not wired to real Electron APIs yet.
 * Phase 6: SatelliteServer wired — REST + WebSocket gateway for web/mobile.
 *
 * The renderer is built with Vite and served during development.
 */

import type { ElectronApi } from './ipc.js'
import { SatelliteServer, defaultServeFn, type HandlerMap, type ServeFn } from '@imperium/core-notifications'
import type { IpcChannel, SatelliteConfigResponse, SatelliteRegenerateTokenResponse } from '@imperium/shared-types'
import { app, BrowserWindow, ipcMain, powerSaveBlocker } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { OnboardingChecker } from '@imperium/core-onboarding'
import { createDb, ProjectRepository, TaskRepository, CostEntryRepository, projects } from '@imperium/core-db'
import { createPhase3Handlers, createPhase5Handlers, createPhase6Handlers } from './handlers.js'

export interface MainProcessConfig {
	readonly devServerUrl: string
	readonly width: number
	readonly height: number
}

export const DEFAULT_MAIN_CONFIG: MainProcessConfig = {
	devServerUrl: 'http://localhost:5173',
	width: 1200,
	height: 800,
}

let mainWindow: BrowserWindow | null = null

// ============================================================================
// Phase 6 — Satellite server (REST + WS gateway)
// ============================================================================

const SATELLITE_PORT = 9100

/** Generate a random 32-char hex token. Works without Node crypto module. */
function generateToken(): string {
	const bytes = new Uint8Array(16)
	// Use globalThis.crypto (available in Bun/Node 19+)
	globalThis.crypto.getRandomValues(bytes)
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export interface SatelliteManager {
	readonly server: SatelliteServer
	/** Current token (shown once in renderer; regenerate to rotate). */
	readonly getToken: () => string
	/** Generate + store a new token, returns new value. */
	readonly rotateToken: () => string
	/** Convenience Phase 6 deps object for createPhase6Handlers. */
	readonly phase6Deps: {
		getSatelliteConfig: () => SatelliteConfigResponse
		regenerateToken: () => SatelliteRegenerateTokenResponse
	}
}

/**
 * Create and start the SatelliteServer with the given handler map.
 * Call on app-ready; call `server.stop()` on app quit.
 *
 * @param handlers - Map of channel → handler function
 * @param serveFn  - Injectable server factory (defaults to Bun.serve wrapper).
 *                   Override in tests to avoid binding real ports.
 */
export function createSatelliteManager(handlers: HandlerMap, serveFn: ServeFn = defaultServeFn): SatelliteManager {
	let currentToken = generateToken()
	let currentServer = new SatelliteServer(
		{ port: SATELLITE_PORT, token: currentToken, allowedChannels: Array.from(handlers.keys()) as IpcChannel[] },
		serveFn,
	)

	const getToken = () => currentToken

	const rotateToken = (): string => {
		// Stop the old server and start a new one with a fresh token
		if (currentServer.isRunning) {
			currentServer.stop()
		}
		currentToken = generateToken()
		currentServer = new SatelliteServer(
			{ port: SATELLITE_PORT, token: currentToken, allowedChannels: Array.from(handlers.keys()) as IpcChannel[] },
			serveFn,
		)
		currentServer.start(handlers)
		return currentToken
	}

	const phase6Deps = {
		getSatelliteConfig: (): SatelliteConfigResponse => ({
			port: SATELLITE_PORT,
			token: currentToken,
			isRunning: currentServer.isRunning,
			connectedClients: currentServer.clientCount,
		}),
		regenerateToken: (): SatelliteRegenerateTokenResponse => {
			const newToken = rotateToken()
			return { newToken }
		},
	}

	// Start immediately with the provided handler map
	currentServer.start(handlers)

	// Expose a stable `server` getter so callers can push events at any time
	const manager: SatelliteManager = {
		get server() { return currentServer },
		getToken,
		rotateToken,
		phase6Deps,
	}

	return manager
}

// ============================================================================
// Window creation
// ============================================================================

/**
 * Create and configure the main Electron window.
 * Phase 1 stub — does not actually call Electron APIs.
 */
export function createMainWindow(config: MainProcessConfig = DEFAULT_MAIN_CONFIG): BrowserWindow {
	const __dirname = dirname(fileURLToPath(import.meta.url))
	const preloadPath = join(__dirname, '../preload/index.js')
	const rendererHtmlPath = join(__dirname, '../renderer/index.html')
	const forceLocalRenderer = process.env['ELECTRON_USE_LOCAL_RENDERER'] === '1'

	const win = new BrowserWindow({
		width: config.width,
		height: config.height,
		titleBarStyle: 'hidden',
		webPreferences: {
			preload: preloadPath,
			nodeIntegration: false,
			contextIsolation: true
		}
	})

	mainWindow = win
	win.on('closed', () => {
		if (mainWindow === win) {
			mainWindow = null
		}
	})

	if (!app.isPackaged && !forceLocalRenderer) {
		const loadDevServer = async () => {
			for (let i = 0; i < 15; i++) {
				try {
					await win.loadURL(config.devServerUrl)
					win.webContents.openDevTools()
					return // Success!
				} catch (err) {
					console.log(`[Electron] Vite server not ready yet. Retrying in 500ms... (${i + 1}/15)`)
					await new Promise(resolve => setTimeout(resolve, 500))
				}
			}

			console.warn('[Electron] Failed to connect to Vite dev server after 15 attempts. Falling back to built renderer.')
			await win.loadFile(rendererHtmlPath)
		}
		loadDevServer().catch(console.error)
	} else {
		win.loadFile(rendererHtmlPath).catch(console.error)
	}

	win.webContents.on('console-message', (event, level, message, line, sourceId) => {
		console.log(`[Renderer] ${message} (line ${line})`)
	})

	return win
}

// ============================================================================
// Onboarding Handlers
// ============================================================================

const onboardingChecker = new OnboardingChecker()

ipcMain.handle('onboarding:check', async () => {
	const result = await onboardingChecker.generateReport()
	if (!result.ok) throw result.error
	return {
		results: result.value.results.map((r) => ({
			name: r.dependency.name,
			command: r.dependency.command,
			installed: r.installed,
			version: r.version,
			required: r.dependency.required,
			installUrl: r.dependency.installUrl,
			error: r.error,
		})),
		allRequiredInstalled: result.value.allRequiredInstalled,
	}
})

ipcMain.handle('onboarding:install', async (_event, payload: { name: string }) => {
	const dep = onboardingChecker.dependencies.find(d => d.name === payload.name)
	if (!dep) return { success: false, error: `Dependency ${payload.name} not found` }

	const result = await onboardingChecker.autoInstall(dep)
	return { success: result.ok, error: result.ok ? undefined : result.error.message }
})

// ============================================================================
// Database & Project Handlers
// ============================================================================

import { promises as fs } from 'node:fs'

const imperiumDir = join(app.getPath('home'), '.imperium')
// Ensure ~/.imperium exists before initializing DB
try {
	await fs.mkdir(imperiumDir, { recursive: true })
} catch (e) {
	// ignore
}

const db = createDb(join(imperiumDir, 'imperium.db'))
const projectRepo = new ProjectRepository(db)

// Make a slug/safe name for file paths
function slugify(text: string) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

ipcMain.handle('project:list', async () => {
	const allProjects = await projectRepo.listAll()
	return allProjects
})

ipcMain.handle('project:create', async (_event, payload: { name: string }) => {
	const safeName = slugify(payload.name) || 'unnamed-project'
	const id = `proj-${safeName}-${Date.now()}`

	const homePath = app.getPath('home')
	const projectRoot = join(homePath, '.imperium', 'projects', safeName)
	const memoryPath = join(projectRoot, '.imperium', 'memory')
	const tasksPath = join(projectRoot, '.imperium', 'tasks')

	// Create directories
	await fs.mkdir(projectRoot, { recursive: true })
	await fs.mkdir(memoryPath, { recursive: true })
	await fs.mkdir(tasksPath, { recursive: true })

	const newProject = await projectRepo.insert({
		id,
		name: payload.name,
		description: '',
		rootPath: projectRoot,
		memoryPath,
		tasksPath,
	})

	return newProject
})

// ============================================================================
// Phase 3 Handlers (Mock State & Power Save Blocker)
// ============================================================================

let currentPermissionLevel = 'praetorian'
let currentPowerSaveBlockerId: number | null = null

const phase3Handlers = createPhase3Handlers({
	getProfile: () => ({
		level: currentPermissionLevel,
		label: currentPermissionLevel === 'mad-max' ? 'Mad Max' : currentPermissionLevel === 'praetorian' ? 'Praetorian' : 'Imperator',
		description: currentPermissionLevel === 'mad-max' ? 'Full autonomy — no restrictions' : currentPermissionLevel === 'praetorian' ? 'Balanced safeguarding' : 'Total lockdown',
		permissions: currentPermissionLevel === 'mad-max'
			? { 'filesystem:write': 'allow', 'network:request': 'allow' }
			: currentPermissionLevel === 'praetorian'
				? { 'filesystem:write': 'prompt', 'network:request': 'allow' }
				: { 'filesystem:write': 'deny', 'network:request': 'deny' }
	}),
	setLevel: (level: string) => {
		currentPermissionLevel = level
	},
	evaluate: (action: string) => ({
		action, verdict: 'prompt', comfortLevel: currentPermissionLevel, reason: 'Mock evaluation'
	}),
	resumeAgent: async () => { },
	setPowerMode: async (enabled: boolean) => {
		if (enabled && currentPowerSaveBlockerId === null) {
			currentPowerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep')
		} else if (!enabled && currentPowerSaveBlockerId !== null) {
			powerSaveBlocker.stop(currentPowerSaveBlockerId)
			currentPowerSaveBlockerId = null
		}
	},
	listMcpServers: () => ({ servers: [] }),
	getMcpLocks: () => ({ locks: [] }),
	releaseMcpLock: () => { }
})

// Phase 5: Kanban, Costing, Tailscale mock handlers
const taskRepo = new TaskRepository(db)
const costRepo = new CostEntryRepository(db)

const phase5Handlers = createPhase5Handlers({
	listTasks: async (projectId) => {
		const tasks = await taskRepo.getByProject(projectId as any)
		return { tasks } as any
	},
	createTask: async ({ projectId, title, description, priority, assignee }) => {
		const id = `task-${Date.now()}`
		const task = {
			id, projectId, title, description, priority, assignee: assignee || 'agent',
			status: 'todo', comments: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
		}
		await taskRepo.insert(task as any)
		return { taskId: id }
	},
	updateTask: async (payload) => {
		await taskRepo.update(payload.taskId as any, payload as any)
	},
	deleteTask: async (taskId) => {
		await taskRepo.delete(taskId as any)
	},
	addComment: async (payload) => {
		const id = `comment-${Date.now()}`
		await taskRepo.insertComment({
			id, taskId: payload.taskId, author: payload.author, content: payload.content, emoji: payload.emoji, createdAt: new Date().toISOString()
		} as any)
	},
	getBoard: async (projectId) => {
		const tasks = await taskRepo.getByProject(projectId as any)
		const count = await taskRepo.countByProject(projectId as any)
		const columns: Record<string, any[]> = {}

		for (const task of tasks) {
			if (!columns[task.status]) columns[task.status] = []
				; (columns[task.status] as any[]).push(task)
		}
		return { projectId: projectId, columns, tasks, taskCount: count } as any
	},
	getCostSummary: async () => {
		const entries = await costRepo.getAll()
		let totalCostUsd = 0
		let totalInputTokens = 0
		let totalOutputTokens = 0
		const entriesByModelMap: Record<string, any> = {}

		for (const e of entries) {
			totalCostUsd += e.costUsd
			totalInputTokens += e.inputTokens
			totalOutputTokens += e.outputTokens

			if (!entriesByModelMap[e.model]) {
				entriesByModelMap[e.model] = { model: e.model, provider: e.provider, totalCostUsd: 0, callCount: 0 }
			}
			entriesByModelMap[e.model].totalCostUsd += e.costUsd
			entriesByModelMap[e.model].callCount += 1
		}

		return {
			totalCostUsd, totalInputTokens, totalOutputTokens,
			entriesByModel: Object.values(entriesByModelMap),
			entriesByDay: [] // Mock for now
		} as any
	},
	getCostEntries: async (payload) => {
		const entries = await costRepo.getAll(payload.limit as number, payload.offset as number)
		const count = await costRepo.count()
		return { entries, total: count } as any
	},
	getTailscaleStatus: async () => ({ backendState: 'Running', selfHostname: 'mock-mac', selfIp: '100.x.x.x', tailnet: 'mock.tailnet', isConnected: true, peers: [] } as any),
	tailscaleUp: async () => ({ success: true }),
	tailscaleDown: async () => ({ success: true })
})

// Phase 6: Satellite Config mock handlers
const phase6Handlers = createPhase6Handlers({
	getSatelliteConfig: () => ({ port: 9100, token: 'mock-token-xyz', isRunning: false, connectedClients: 0 }),
	regenerateToken: () => ({ newToken: 'mock-token-abc' })
})

for (const { channel, handler } of [...phase3Handlers, ...phase5Handlers, ...phase6Handlers]) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	ipcMain.handle(channel, async (_event, payload: any) => handler(payload))
}

app.whenReady().then(() => {
	createMainWindow()

	app.on('activate', () => {
		if (mainWindow === null || BrowserWindow.getAllWindows().length === 0) {
			createMainWindow()
		}
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
