import type { Metadata } from 'next'
import React from 'react'
import { Providers } from './Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Imperium OS',
  description: 'Imperium OS — Master Node',
}

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
