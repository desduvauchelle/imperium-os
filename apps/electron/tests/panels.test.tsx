import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PermissionsPanel } from '../src/renderer/panels/PermissionsPanel.js'
import { SuspendedAgentBanner } from '../src/renderer/panels/SuspendedAgentBanner.js'
import { CaffeinateToggle } from '../src/renderer/panels/CaffeinateToggle.js'
import type { PermissionsProfileResponse, SuspensionContext } from '@imperium/shared-types'

// ============================================================================
// Mock data
// ============================================================================

const mockProfile: PermissionsProfileResponse = {
	level: 'praetorian',
	label: 'Praetorian',
	description: 'Balanced safeguarding. Tools verified before execution.',
	permissions: {
		'file-read': 'allow',
		'file-write': 'allow',
		'file-delete': 'prompt',
		'network-request': 'allow',
		'shell-execute': 'prompt',
		'mcp-call': 'prompt',
		'system-modify': 'deny',
	},
}

const mockSuspension: SuspensionContext = {
	action: 'file-delete',
	reason: "Tool 'delete_file' requires approval under Praetorian profile",
	pendingToolCall: 'delete_file',
}

// ============================================================================
// PermissionsPanel tests
// ============================================================================

describe('PermissionsPanel', () => {
	it('shows loading state initially', () => {
		const invoke = vi.fn().mockImplementation(() => new Promise(() => {})) // never resolves
		render(<PermissionsPanel invoke={invoke} />)
		expect(screen.getByTestId('permissions-loading')).toBeInTheDocument()
	})

	it('displays profile after loading', async () => {
		const invoke = vi.fn().mockResolvedValue(mockProfile)
		render(<PermissionsPanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByText('Permissions')).toBeInTheDocument()
			expect(screen.getByText('Balanced safeguarding. Tools verified before execution.')).toBeInTheDocument()
		})
	})

	it('shows level selector with correct active state', async () => {
		const invoke = vi.fn().mockResolvedValue(mockProfile)
		render(<PermissionsPanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('level-praetorian')).toBeInTheDocument()
			expect(screen.getByTestId('level-mad-max')).toBeInTheDocument()
			expect(screen.getByTestId('level-imperator')).toBeInTheDocument()
		})
	})

	it('shows verdicts table with badges', async () => {
		const invoke = vi.fn().mockResolvedValue(mockProfile)
		render(<PermissionsPanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('verdicts-table')).toBeInTheDocument()
			expect(screen.getByTestId('verdict-file-delete')).toHaveTextContent('prompt')
			expect(screen.getByTestId('verdict-system-modify')).toHaveTextContent('deny')
		})
	})

	it('calls set-level and reloads on level change', async () => {
		const invoke = vi.fn().mockResolvedValue(mockProfile)
		render(<PermissionsPanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('level-mad-max')).toBeInTheDocument()
		})
		fireEvent.click(screen.getByTestId('level-mad-max'))
		await waitFor(() => {
			expect(invoke).toHaveBeenCalledWith('permissions:set-level', { level: 'mad-max' })
			// Reloads profile after setting
			expect(invoke).toHaveBeenCalledWith('permissions:get-profile', undefined)
		})
	})
})

// ============================================================================
// SuspendedAgentBanner tests
// ============================================================================

describe('SuspendedAgentBanner', () => {
	it('displays suspension reason', () => {
		render(
			<SuspendedAgentBanner agentId="agent-1" suspension={mockSuspension} />,
		)
		expect(screen.getByTestId('suspension-reason')).toHaveTextContent(
			"Tool 'delete_file' requires approval",
		)
	})

	it('shows pending tool call', () => {
		render(
			<SuspendedAgentBanner agentId="agent-1" suspension={mockSuspension} />,
		)
		expect(screen.getByTestId('pending-tool')).toHaveTextContent('delete_file')
	})

	it('shows SUSPENDED badge', () => {
		render(
			<SuspendedAgentBanner agentId="agent-1" suspension={mockSuspension} />,
		)
		expect(screen.getByText('SUSPENDED')).toBeInTheDocument()
	})

	it('approve button calls agent:resume with approved=true', async () => {
		const invoke = vi.fn().mockResolvedValue(undefined)
		const onResolved = vi.fn()
		render(
			<SuspendedAgentBanner
				agentId="agent-1"
				suspension={mockSuspension}
				invoke={invoke}
				onResolved={onResolved}
			/>,
		)
		fireEvent.click(screen.getByTestId('approve-btn'))
		await waitFor(() => {
			expect(invoke).toHaveBeenCalledWith('agent:resume', {
				agentId: 'agent-1',
				approved: true,
			})
			expect(onResolved).toHaveBeenCalled()
		})
	})

	it('deny button calls agent:resume with approved=false', async () => {
		const invoke = vi.fn().mockResolvedValue(undefined)
		const onResolved = vi.fn()
		render(
			<SuspendedAgentBanner
				agentId="agent-1"
				suspension={mockSuspension}
				invoke={invoke}
				onResolved={onResolved}
			/>,
		)
		fireEvent.click(screen.getByTestId('deny-btn'))
		await waitFor(() => {
			expect(invoke).toHaveBeenCalledWith('agent:resume', {
				agentId: 'agent-1',
				approved: false,
			})
			expect(onResolved).toHaveBeenCalled()
		})
	})
})

// ============================================================================
// CaffeinateToggle tests
// ============================================================================

describe('CaffeinateToggle', () => {
	it('starts in off state', () => {
		render(<CaffeinateToggle />)
		expect(screen.getByTestId('caffeinate-btn')).toHaveTextContent('Off')
	})

	it('shows "System may sleep normally" when off', () => {
		render(<CaffeinateToggle />)
		expect(screen.getByText('System may sleep normally')).toBeInTheDocument()
	})

	it('toggles on and calls system:power-mode', async () => {
		const invoke = vi.fn().mockResolvedValue(undefined)
		render(<CaffeinateToggle invoke={invoke} />)
		fireEvent.click(screen.getByTestId('caffeinate-btn'))
		await waitFor(() => {
			expect(invoke).toHaveBeenCalledWith('system:power-mode', { enabled: true })
			expect(screen.getByTestId('caffeinate-btn')).toHaveTextContent('On')
		})
	})

	it('shows stay awake message when on', async () => {
		const invoke = vi.fn().mockResolvedValue(undefined)
		render(<CaffeinateToggle invoke={invoke} />)
		fireEvent.click(screen.getByTestId('caffeinate-btn'))
		await waitFor(() => {
			expect(screen.getByText('System will stay awake during agent tasks')).toBeInTheDocument()
		})
	})

	it('toggles off on second click', async () => {
		const invoke = vi.fn().mockResolvedValue(undefined)
		render(<CaffeinateToggle invoke={invoke} />)
		fireEvent.click(screen.getByTestId('caffeinate-btn'))
		await waitFor(() => {
			expect(screen.getByTestId('caffeinate-btn')).toHaveTextContent('On')
		})
		fireEvent.click(screen.getByTestId('caffeinate-btn'))
		await waitFor(() => {
			expect(invoke).toHaveBeenCalledWith('system:power-mode', { enabled: false })
			expect(screen.getByTestId('caffeinate-btn')).toHaveTextContent('Off')
		})
	})
})
