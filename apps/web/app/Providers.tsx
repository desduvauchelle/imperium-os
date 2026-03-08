'use client'

// Client boundary — wraps the root layout with providers that require React hooks.
// All @imperium/ui-shared imports stay inside this client component so Next.js
// doesn't try to render them in the Server Component tree.

import React from 'react'
import { ThemeProvider } from '@imperium/ui-shared'

export function Providers({ children }: { readonly children: React.ReactNode }) {
  return <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
}
