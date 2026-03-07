'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ThemeMode } from '@imperium/shared-types'
import { isThemeMode } from '@imperium/shared-types'

// ============================================================================
// Theme Context
// ============================================================================

interface ThemeContextValue {
  readonly theme: ThemeMode
  readonly resolvedTheme: 'light' | 'dark'
  readonly setTheme: (theme: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'imperium-theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'auto'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && isThemeMode(stored)) return stored
  } catch {
    // localStorage unavailable
  }
  return 'auto'
}

function applyThemeClass(resolvedTheme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolvedTheme)
}

// ============================================================================
// Theme Provider
// ============================================================================

export interface ThemeProviderProps {
  readonly children: ReactNode
  readonly defaultTheme?: ThemeMode | undefined
  readonly storageKey?: string | undefined
}

export function ThemeProvider({
  children,
  defaultTheme,
  storageKey = STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() => defaultTheme ?? getStoredTheme())
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme)

  const resolvedTheme: 'light' | 'dark' = theme === 'auto' ? systemTheme : theme

  // Apply class to <html> on change
  useEffect(() => {
    applyThemeClass(resolvedTheme)
  }, [resolvedTheme])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const setTheme = useCallback(
    (newTheme: ThemeMode) => {
      setThemeState(newTheme)
      try {
        localStorage.setItem(storageKey, newTheme)
      } catch {
        // localStorage unavailable
      }
    },
    [storageKey],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// ============================================================================
// useTheme Hook
// ============================================================================

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
