import React from 'react'
import {
  ThemeProvider,
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  useTheme,
} from '@imperium/ui-shared'
import type { ThemeMode } from '@imperium/shared-types'

// ============================================================================
// Theme Toggle
// ============================================================================

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const modes: ThemeMode[] = ['light', 'dark', 'auto']

  return (
    <div className="flex gap-2">
      {modes.map((mode) => (
        <Button
          key={mode}
          variant={theme === mode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTheme(mode)}
        >
          {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </Button>
      ))}
    </div>
  )
}

// ============================================================================
// Satellite App
// ============================================================================

export function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto max-w-2xl py-12">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Imperium Satellite</CardTitle>
                  <CardDescription>Web Remote Interface</CardDescription>
                </div>
                <Badge variant="destructive">Master Offline</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Theme</h3>
                <ThemeToggle />
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Waiting for connection to Imperium Master node...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ThemeProvider>
  )
}
