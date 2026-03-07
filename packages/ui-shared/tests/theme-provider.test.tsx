import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../src/providers/theme-provider.js'

// Helper component to test the hook
function ThemeDisplay() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button data-testid="set-light" onClick={() => setTheme('light')}>Light</button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>Dark</button>
      <button data-testid="set-auto" onClick={() => setTheme('auto')}>Auto</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
  })

  it('renders children', () => {
    render(
      <ThemeProvider>
        <span data-testid="child">Hello</span>
      </ThemeProvider>,
    )
    expect(screen.getByTestId('child')).toHaveTextContent('Hello')
  })

  it('defaults to auto theme', () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('theme')).toHaveTextContent('auto')
  })

  it('accepts a default theme', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeDisplay />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
  })

  it('sets theme class on html element', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeDisplay />
      </ThemeProvider>,
    )
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('switches theme when setTheme is called', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeDisplay />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('light')

    act(() => {
      fireEvent.click(screen.getByTestId('set-dark'))
    })

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('persists theme to localStorage', () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    )

    act(() => {
      fireEvent.click(screen.getByTestId('set-dark'))
    })

    expect(localStorage.getItem('imperium-theme')).toBe('dark')
  })

  it('reads theme from localStorage', () => {
    localStorage.setItem('imperium-theme', 'dark')

    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })
})

describe('useTheme', () => {
  it('throws when used outside ThemeProvider', () => {
    // Suppress console.error for the expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<ThemeDisplay />)).toThrow(
      'useTheme must be used within a ThemeProvider',
    )

    spy.mockRestore()
  })
})
