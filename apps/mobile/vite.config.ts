import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
  },
  build: {
    // Capacitor requires a non-module build output
    target: 'es2020',
  },
})
