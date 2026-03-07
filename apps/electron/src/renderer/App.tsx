import React, { useState } from 'react'
import { ThemeProvider, Button, CostTag, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@imperium/ui-shared'
import type { ThemeMode } from '@imperium/shared-types'
import { useTheme } from '@imperium/ui-shared'
import { OnboardingScreen } from './screens/OnboardingScreen.js'

// ============================================================================
// Theme Toggle - Demonstrates Light/Dark/Auto switching
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
// App Component
// ============================================================================

export function App() {
  const [onboardingDone, setOnboardingDone] = useState(false)

  if (!onboardingDone) {
    return (
      <ThemeProvider>
        <OnboardingScreen onComplete={() => setOnboardingDone(true)} />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto max-w-2xl py-12">
          <Card>
            <CardHeader>
              <CardTitle>Imperium OS</CardTitle>
              <CardDescription>Multi-Platform Agentic OS — Desktop Master Node</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Toggle */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Theme</h3>
                <ThemeToggle />
              </div>

              {/* Cost Tag Demo */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Model Cost Tags</h3>
                <div className="flex flex-wrap gap-2">
                  <CostTag model="Claude 3.5 Sonnet" costUsd={0.002} />
                  <CostTag model="GPT-4o" costUsd={0.015} />
                  <CostTag model="Gemini Pro" costUsd={0.001} />
                </div>
              </div>

              {/* Status */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Phase 2 Core & Context • All systems nominal
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ThemeProvider>
  )
}
