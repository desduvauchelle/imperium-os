import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { OnboardingScreen } from '../src/renderer/screens/OnboardingScreen.js'
import type { OnboardingCheckResponse } from '@imperium/shared-types'

// ============================================================================
// Helpers
// ============================================================================

function mockCheckResponse(overrides?: Partial<OnboardingCheckResponse>): OnboardingCheckResponse {
  return {
    results: [
      { name: 'Bun', command: 'bun', installed: true, version: '1.1.29', required: true, installUrl: 'https://bun.sh' },
      { name: 'Git', command: 'git', installed: true, version: '2.43.0', required: true, installUrl: 'https://git-scm.com' },
      { name: 'Claude CLI', command: 'claude', installed: false, required: false, installUrl: 'https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview' },
      { name: 'Ollama', command: 'ollama', installed: false, required: false, installUrl: 'https://ollama.ai' },
    ],
    allRequiredInstalled: true,
    ...overrides,
  }
}

function createMockInvoke(response: OnboardingCheckResponse) {
  return vi.fn().mockResolvedValue(response)
}

// ============================================================================
// Tests
// ============================================================================

describe('OnboardingScreen', () => {
  it('shows loading state initially', () => {
    // invoke that never resolves
    const invoke = vi.fn(() => new Promise(() => {}))
    render(<OnboardingScreen invoke={invoke} />)
    expect(screen.getByTestId('loading')).toHaveTextContent('Checking dependencies')
  })

  it('shows dependency list after loading', async () => {
    const invoke = createMockInvoke(mockCheckResponse())
    render(<OnboardingScreen invoke={invoke} />)
    await waitFor(() => {
      expect(screen.getByText('Bun')).toBeInTheDocument()
    })
    expect(screen.getByText('Git')).toBeInTheDocument()
    expect(screen.getByText('Claude CLI')).toBeInTheDocument()
    expect(screen.getByText('Ollama')).toBeInTheDocument()
  })

  it('shows installed indicator with version', async () => {
    const invoke = createMockInvoke(mockCheckResponse())
    render(<OnboardingScreen invoke={invoke} />)
    await waitFor(() => {
      expect(screen.getByText('v1.1.29')).toBeInTheDocument()
    })
  })

  it('shows install buttons for missing dependencies', async () => {
    const invoke = createMockInvoke(mockCheckResponse())
    render(<OnboardingScreen invoke={invoke} />)
    await waitFor(() => {
      expect(screen.getByTestId('install-Claude CLI')).toBeInTheDocument()
    })
    expect(screen.getByTestId('install-Ollama')).toBeInTheDocument()
    // Installed deps should NOT have install buttons
    expect(screen.queryByTestId('install-Bun')).not.toBeInTheDocument()
  })

  it('enables continue button when all required deps are installed', async () => {
    const invoke = createMockInvoke(mockCheckResponse({ allRequiredInstalled: true }))
    render(<OnboardingScreen invoke={invoke} />)
    await waitFor(() => {
      const btn = screen.getByTestId('continue-btn')
      expect(btn).not.toBeDisabled()
      expect(btn).toHaveTextContent('Continue')
    })
  })

  it('disables continue button when required deps are missing', async () => {
    const invoke = createMockInvoke(mockCheckResponse({ allRequiredInstalled: false }))
    render(<OnboardingScreen invoke={invoke} />)
    await waitFor(() => {
      const btn = screen.getByTestId('continue-btn')
      expect(btn).toBeDisabled()
    })
  })

  it('calls onComplete when continue is clicked', async () => {
    const invoke = createMockInvoke(mockCheckResponse({ allRequiredInstalled: true }))
    const onComplete = vi.fn()
    render(<OnboardingScreen invoke={invoke} onComplete={onComplete} />)
    await waitFor(() => {
      expect(screen.getByTestId('continue-btn')).not.toBeDisabled()
    })
    fireEvent.click(screen.getByTestId('continue-btn'))
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('calls install IPC and re-checks on install click', async () => {
    const response = mockCheckResponse()
    const invoke = vi.fn()
      .mockResolvedValueOnce(response) // initial check
      .mockResolvedValueOnce({ success: true }) // install call
      .mockResolvedValueOnce(response) // re-check
    render(<OnboardingScreen invoke={invoke} />)
    await waitFor(() => {
      expect(screen.getByTestId('install-Claude CLI')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('install-Claude CLI'))
    await waitFor(() => {
      // Should have called install and then re-check
      expect(invoke).toHaveBeenCalledWith('onboarding:install', { name: 'Claude CLI' })
    })
  })

  it('shows required/optional badges', async () => {
    const invoke = createMockInvoke(mockCheckResponse())
    render(<OnboardingScreen invoke={invoke} />)
    await waitFor(() => {
      expect(screen.getAllByText('required').length).toBeGreaterThanOrEqual(2)
      expect(screen.getAllByText('optional').length).toBeGreaterThanOrEqual(2)
    })
  })

  it('shows error when IPC is not available', async () => {
    render(<OnboardingScreen invoke={undefined} />)
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('IPC not available')
    })
  })
})
