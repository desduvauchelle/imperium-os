import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: [
    '@imperium/ui-shared',
    '@imperium/shared-types',
    '@imperium/satellite-client',
    '@imperium/core-db',
    '@imperium/core-kanban',
    '@imperium/core-costing',
    '@imperium/core-permissions',
  ],
  // better-sqlite3 is a native addon — do not bundle, use Node.js require() directly
  serverExternalPackages: ['better-sqlite3'],
}

export default config
