/**
 * Vite dev server launcher — runs under Node (not Bun).
 *
 * Uses dynamic import and explicit optimizeDeps to avoid esbuild hangs.
 */
import { resolve } from 'path'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

console.log('[vite] Loading Vite...')

try {
	const vite = await import('vite')
	const reactPlugin = await import('@vitejs/plugin-react')
	console.log('[vite] Creating dev server...')
	const server = await vite.createServer({
		configFile: false,
		root: resolve(ROOT, 'src/renderer'),
		base: './',
		plugins: [reactPlugin.default()],
		optimizeDeps: {
			noDiscovery: true,
			include: [],
		},
		server: {
			port: 5173,
			strictPort: true,
			host: '127.0.0.1',
		},
	})
	console.log('[vite] Starting listener...')
	await server.listen()
	server.printUrls()
	console.log('[vite] Dev server is ready')
} catch (err) {
	console.error('[vite] Failed to start:', err)
	process.exit(1)
}
