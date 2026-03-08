import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { App } from '../src/renderer/App.js'
import type { OnboardingCheckResponse, PermissionsProfileResponse } from '@imperium/shared-types'

// Mock electronApi so the onboarding screen completes
const allInstalledResponse: OnboardingCheckResponse = {
  results: [
    { name: 'Bun', command: 'bun', installed: true, version: '1.1.29', required: true, installUrl: 'https://bun.sh' },
    { name: 'Git', command: 'git', installed: true, version: '2.43.0', required: true, installUrl: 'https://git-scm.com' },
  ],
  allRequiredInstalled: true,
}

const mockProfile: PermissionsProfileResponse = {
  level: 'praetorian',
  label: 'Praetorian',
  description: 'Balanced safeguarding.',
  permissions: {
    'file-read': 'allow',
    'file-write': 'allow',
    'file-delete': 'prompt',
    'system-modify': 'deny',
  },
}

beforeEach(() => {
  localStorage.clear()
  window.electronApi = {
    invoke: vi.fn().mockImplementation((channel: string) => {
      if (channel === 'permissions:get-profile') return Promise.resolve(mockProfile)
      if (channel === 'project:list') return Promise.resolve([])
      return Promise.resolve(allInstalledResponse)
    }),
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
      expect(screen.getByText('No projects found.')).toBeInTheDocument()
    })
  })

  it('renders navigation panel after onboarding', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('continue-btn')).not.toBeDisabled()
    })
    fireEvent.click(screen.getByTestId('continue-btn'))
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Tailscale')).toBeInTheDocument()
      expect(screen.getByText('Satellite Config')).toBeInTheDocument()
    })
  })

  it('renders welcome screen after onboarding when no projects exist', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('continue-btn')).not.toBeDisabled()
    })
    fireEvent.click(screen.getByTestId('continue-btn'))
    await waitFor(() => {
      expect(screen.getByText('Welcome to Imperium')).toBeInTheDocument()
    })
  })
})
