import type { Config } from 'tailwindcss'
import { imperiumPreset } from '@imperium/ui-shared/tailwind-config'

export default {
  presets: [imperiumPreset],
  content: [
    './src/**/*.{ts,tsx}',
    './index.html',
    '../../packages/ui-shared/src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
} satisfies Config
