import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from '../src/App.js'

// ============================================================================
// Mock satellite-client to prevent actual network calls in tests
// ============================================================================

vi.mock('@imperium/satellite-client', () => ({
  createSatelliteClient: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    invoke: vi.fn().mockResolvedValue({}),
    onPush: vi.fn().mockReturnValue(() => {}),
    isConnected: false,
  }),
}))

const STORED_CONFIG = JSON.stringify({
  masterUrl: 'http://localhost:9100',
  token: 'test-token',
})

// ============================================================================
// Setup screen tests (no localStorage config)
// ============================================================================

describe('Mobile App — setup screen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows setup screen when no config is stored', () => {
    render(<App />)
    expect(screen.getByTestId('setup-screen')).toBeInTheDocument()
  })

  it('shows satellite config modal', () => {
    render(<App />)
    expect(screen.getByTestId('satellite-config-modal')).toBeInTheDocument()
  })

  it('shows "Connect to Master" heading in config modal', () => {
    render(<App />)
    expect(screen.getByText('Connect to Master')).toBeInTheDocument()
  })

  it('renders Master URL and token inputs', () => {
    render(<App />)
    expect(screen.getByTestId('master-url-input')).toBeInTheDocument()
    expect(screen.getByTestId('token-input')).toBeInTheDocument()
  })

  it('renders Connect button', () => {
    render(<App />)
    expect(screen.getByTestId('config-save-btn')).toBeInTheDocument()
  })
})

// ============================================================================
// Connected shell tests (localStorage config present)
// ============================================================================

describe('Mobile App — connected shell', () => {
  beforeEach(() => {
    localStorage.setItem('imperium:satellite-config', STORED_CONFIG)
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('shows satellite shell when config is stored', () => {
    render(<App />)
    expect(screen.getByTestId('satellite-shell')).toBeInTheDocument()
  })

  it('renders the sidebar navigation', () => {
    render(<App />)
    expect(screen.getByTestId('satellite-sidebar')).toBeInTheDocument()
  })

  it('sidebar shows Master Offline badge when not connected', () => {
    render(<App />)
    expect(screen.getByTestId('master-offline-badge')).toBeInTheDocument()
  })

  it('renders theme toggle buttons', () => {
    render(<App />)
    expect(screen.getByTestId('theme-light')).toBeInTheDocument()
    expect(screen.getByTestId('theme-dark')).toBeInTheDocument()
    expect(screen.getByTestId('theme-auto')).toBeInTheDocument()
  })

  it('renders sidebar nav items', () => {
    render(<App />)
    expect(screen.getByTestId('nav-kanban')).toBeInTheDocument()
    expect(screen.getByTestId('nav-costing')).toBeInTheDocument()
    expect(screen.getByTestId('nav-tailscale')).toBeInTheDocument()
    expect(screen.getByTestId('nav-mcp')).toBeInTheDocument()
    expect(screen.getByTestId('nav-agent')).toBeInTheDocument()
    expect(screen.getByTestId('nav-permissions')).toBeInTheDocument()
    expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
  })
})
