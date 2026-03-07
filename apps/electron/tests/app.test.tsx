import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { App } from '../src/renderer/App.js'
import type { OnboardingCheckResponse } from '@imperium/shared-types'

// Mock electronApi so the onboarding screen completes
const allInstalledResponse: OnboardingCheckResponse = {
  results: [
    { name: 'Bun', command: 'bun', installed: true, version: '1.1.29', required: true, installUrl: 'https://bun.sh' },
    { name: 'Git', command: 'git', installed: true, version: '2.43.0', required: true, installUrl: 'https://git-scm.com' },
  ],
  allRequiredInstalled: true,
}

beforeEach(() => {
  window.electronApi = {
    invoke: vi.fn().mockResolvedValue(allInstalledResponse),
    on: vi.fn().mockReturnValue(() => {}),
  } as unknown as typeof window.electronApi
})

describe('App', () => {
  it('shows onboarding screen first', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Welcome to Imperium OS')).toBeInTheDocument()
    })
  })

  it('shows main dashboard after onboarding continue', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('continue-btn')).not.toBeDisabled()
    })
    fireEvent.click(screen.getByTestId('continue-btn'))
    await waitFor(() => {
      expect(screen.getByText('Imperium OS')).toBeInTheDocument()
      expect(screen.getByText(/Phase 2/)).toBeInTheDocument()
    })
  })

  it('renders theme toggle buttons after onboarding', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('continue-btn')).not.toBeDisabled()
    })
    fireEvent.click(screen.getByTestId('continue-btn'))
    await waitFor(() => {
      expect(screen.getByText('Light')).toBeInTheDocument()
      expect(screen.getByText('Dark')).toBeInTheDocument()
      expect(screen.getByText('Auto')).toBeInTheDocument()
    })
  })

  it('renders cost tags after onboarding', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('continue-btn')).not.toBeDisabled()
    })
    fireEvent.click(screen.getByTestId('continue-btn'))
    await waitFor(() => {
      expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument()
      expect(screen.getByText('GPT-4o')).toBeInTheDocument()
    })
  })
})
