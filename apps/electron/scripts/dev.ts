#!/usr/bin/env bun
/**
 * Dev launcher — starts Vite, waits for it, builds Electron, launches Electron.
 * Uses only Bun built-ins. No concurrently, no wait-on.
 */
import { spawn } from 'bun'
import { join, resolve } from 'path'

const root = resolve(join(import.meta.dir, '..'))
const workspaceRoot = resolve(join(root, '..', '..'))

// Resolve a binary: check workspace node_modules first, then local
async function bin(name: string): Promise<string> {
	const hoisted = join(workspaceRoot, 'node_modules', '.bin', name)
	if (await Bun.file(hoisted).exists()) return hoisted
	const local = join(root, 'node_modules', '.bin', name)
	if (await Bun.file(local).exists()) return local
	return name
}

const viteBin = await bin('vite')
const esbuildBin = await bin('esbuild')
const electronBin = await bin('electron')

console.log('[dev] vite:', viteBin)
console.log('[dev] esbuild:', esbuildBin)
console.log('[dev] electron:', electronBin)

// ── 1. Start Vite ────────────────────────────────────────────────────────────
console.log('[dev] Starting Vite...')
const vite = spawn([viteBin, '--strictPort'], {
	cwd: root,
	stdout: 'inherit',
	stderr: 'inherit',
})

// ── 2. Build main + preload in parallel while Vite starts ────────────────────
console.log('[dev] Building Electron bundles...')
const bMain = spawn([esbuildBin,
	join(root, 'src/main/index.ts'),
	'--bundle', `--outfile=${join(root, 'dist/main/index.js')}`,
	'--external:electron', '--external:better-sqlite3', '--external:bun:sqlite',
	'--format=esm', '--platform=node',
], { cwd: root, stdout: 'inherit', stderr: 'inherit' })

const bPreload = spawn([esbuildBin,
	join(root, 'src/preload/index.ts'),
	'--bundle', `--outfile=${join(root, 'dist/preload/index.js')}`,
	'--external:electron', '--format=cjs',
], { cwd: root, stdout: 'inherit', stderr: 'inherit' })

await Promise.all([bMain.exited, bPreload.exited])
console.log('[dev] Bundles ready')

// ── 3. Poll until Vite's HTTP server is reachable ────────────────────────────
console.log('[dev] Waiting for Vite on http://localhost:5173...')
for (let i = 0; i < 120; i++) {
	if (vite.exitCode !== null) {
		console.error(`[dev] Vite exited early with code ${vite.exitCode}`)
		process.exit(1)
	}
	try {
		const r = await fetch('http://localhost:5173/')
		await r.body?.cancel()
		console.log('[dev] Vite ready — launching Electron')
		break
	} catch {
		if (i === 119) {
			console.error('[dev] Timed out waiting for Vite (60s)')
			vite.kill()
			process.exit(1)
		}
		await Bun.sleep(500)
	}
}

// ── 4. Launch Electron ───────────────────────────────────────────────────────
const electron = spawn([electronBin, '.'], {
	cwd: root,
	stdout: 'inherit',
	stderr: 'inherit',
})

// ── 5. Cleanup ───────────────────────────────────────────────────────────────
const cleanup = () => {
	try { vite.kill() } catch { }
	try { electron.kill() } catch { }
}
process.on('SIGINT', () => { cleanup(); process.exit(0) })
process.on('SIGTERM', () => { cleanup(); process.exit(0) })

await electron.exited
cleanup()
