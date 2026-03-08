/**
 * Dev script for Electron + Vite hot reload.
 *
 * This script is a Bun-based launcher that:
 * 1. Starts a Vite dev server via a Node subprocess (Bun can't run Vite's
 *    createServer, and the Vite CLI hangs on esbuild dep scanning).
 * 2. Waits for the dev server to be ready.
 * 3. Builds the Electron main and preload bundles.
 * 4. Launches Electron.
 *
 * Run with: bun scripts/dev.ts
 */
import { spawn, execSync } from 'child_process'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dir, '..')
const DEV_URL = 'http://127.0.0.1:5173'

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		try {
			await fetch(url)
			return
		} catch {
			await new Promise((r) => setTimeout(r, 500))
		}
	}
	throw new Error(`Dev server at ${url} did not start within ${timeoutMs}ms`)
}

async function main() {
	process.chdir(ROOT)

	// 1. Start Vite dev server via Node using the programmatic API
	//    (Bun hangs on createServer; Vite CLI hangs on esbuild)
	console.log('[dev] Starting Vite dev server...')
	const viteStarter = resolve(ROOT, 'scripts/vite-server.mjs')
	const vite = spawn('node', [viteStarter], {
		cwd: ROOT,
		stdio: 'inherit',
		env: { ...process.env },
	})

	vite.on('error', (err) => {
		console.error('[dev] Failed to start Vite:', err)
		process.exit(1)
	})

	vite.on('exit', (code) => {
		if (code !== null && code !== 0) {
			console.error(`[dev] Vite exited unexpectedly with code ${code}`)
			process.exit(1)
		}
	})

	// 2. Wait for dev server to be ready
	console.log(`[dev] Waiting for Vite at ${DEV_URL}...`)
	await waitForServer(DEV_URL)
	console.log('[dev] Vite is ready!')

	// 3. Build Electron main process
	console.log('[dev] Building main process...')
	execSync(
		'bunx esbuild src/main/index.ts --bundle --outfile=dist/main/index.js --external:electron --external:better-sqlite3 --external:bun:sqlite --format=esm --platform=node',
		{ stdio: 'inherit', cwd: ROOT },
	)

	// 4. Build Electron preload
	console.log('[dev] Building preload...')
	execSync(
		'bunx esbuild src/preload/index.ts --bundle --outfile=dist/preload/index.js --external:electron --format=cjs',
		{ stdio: 'inherit', cwd: ROOT },
	)

	// 5. Launch Electron
	console.log('[dev] Launching Electron...')
	const electronBin = resolve(ROOT, '../../node_modules/.bin/electron')
	const electron = spawn(electronBin, ['.'], {
		stdio: 'inherit',
		cwd: ROOT,
		env: { ...process.env },
	})

	electron.on('close', (code) => {
		console.log(`[dev] Electron exited (code ${code}). Shutting down Vite...`)
		vite.kill()
		process.exit(0)
	})

	const cleanup = () => {
		console.log('\n[dev] Shutting down...')
		vite.kill()
		electron.kill()
		process.exit(0)
	}
	process.on('SIGINT', cleanup)
	process.on('SIGTERM', cleanup)
}

main().catch((err) => {
	console.error('[dev] Fatal error:', err)
	process.exit(1)
})
