import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PermissionsPanel } from '../src/renderer/panels/PermissionsPanel.js'
import { SuspendedAgentBanner } from '../src/renderer/panels/SuspendedAgentBanner.js'
import { CaffeinateToggle } from '../src/renderer/panels/CaffeinateToggle.js'
import { KanbanPanel } from '../src/renderer/panels/KanbanPanel.js'
import { CostingDashboard } from '../src/renderer/panels/CostingDashboard.js'
import { TailscalePanel } from '../src/renderer/panels/TailscalePanel.js'
import { SatelliteSettingsPanel } from '../src/renderer/panels/SatelliteSettingsPanel.js'
import type {
	PermissionsProfileResponse,
	SuspensionContext,
	KanbanGetBoardResponse,
	CostingGetSummaryResponse,
	CostingGetEntriesResponse,
	TailscaleStatusResponse,
} from '@imperium/shared-types'

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

// ============================================================================
// Mock data for Phase 5 panels
// ============================================================================

const mockBoard: KanbanGetBoardResponse = {
	columns: {
		'todo': [
			{ id: 't1', title: 'Task 1', status: 'todo', priority: 'high', commentCount: 2 },
			{ id: 't2', title: 'Task 2', status: 'todo', priority: 'low', commentCount: 0 },
		],
		'in-progress': [
			{ id: 't3', title: 'Task 3', status: 'in-progress', priority: 'medium', commentCount: 1 },
		],
		'review': [],
		'done': [
			{ id: 't4', title: 'Task 4', status: 'done', priority: 'medium', commentCount: 0 },
		],
	},
	taskCount: 4,
}

const mockCostSummary: CostingGetSummaryResponse = {
	totalCostUsd: 1.5,
	totalInputTokens: 50000,
	totalOutputTokens: 20000,
	entriesByModel: {
		'claude-3.5-sonnet': {
			model: 'claude-3.5-sonnet',
			provider: 'anthropic',
			totalCostUsd: 1.2,
			totalInputTokens: 40000,
			totalOutputTokens: 15000,
			callCount: 5,
		},
		'gpt-4': {
			model: 'gpt-4',
			provider: 'openai',
			totalCostUsd: 0.3,
			totalInputTokens: 10000,
			totalOutputTokens: 5000,
			callCount: 2,
		},
	},
	periodStart: '2026-01-01T00:00:00.000Z',
	periodEnd: '2026-03-07T00:00:00.000Z',
}

const mockCostEntries: CostingGetEntriesResponse = {
	entries: [
		{ model: 'claude-3.5-sonnet', provider: 'anthropic', inputTokens: 1000, outputTokens: 500, costUsd: 0.002, timestamp: '2026-03-07T00:00:00.000Z' },
	],
	total: 1,
}

const mockTailscaleStatus: TailscaleStatusResponse = {
	backendState: 'Running',
	selfHostname: 'imperium-master',
	selfIp: '100.64.0.1',
	tailnet: 'example.ts.net',
	peers: [
		{ id: 'p1', hostname: 'satellite-1', ipv4: '100.64.0.2', online: true, os: 'macOS' },
		{ id: 'p2', hostname: 'satellite-2', ipv4: '100.64.0.3', online: false, os: 'linux' },
	],
	version: '1.56.0',
}

// ============================================================================
// KanbanPanel tests
// ============================================================================

describe('KanbanPanel', () => {
	it('shows loading state initially', () => {
		const invoke = vi.fn().mockImplementation(() => new Promise(() => {}))
		render(<KanbanPanel projectId="proj-1" invoke={invoke} />)
		expect(screen.getByTestId('kanban-loading')).toBeInTheDocument()
	})

	it('displays board after loading', async () => {
		const invoke = vi.fn().mockResolvedValue(mockBoard)
		render(<KanbanPanel projectId="proj-1" invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('kanban-panel')).toBeInTheDocument()
			expect(screen.getByText('4 task(s)')).toBeInTheDocument()
		})
	})

	it('renders all four columns', async () => {
		const invoke = vi.fn().mockResolvedValue(mockBoard)
		render(<KanbanPanel projectId="proj-1" invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('kanban-column-todo')).toBeInTheDocument()
			expect(screen.getByTestId('kanban-column-in-progress')).toBeInTheDocument()
			expect(screen.getByTestId('kanban-column-review')).toBeInTheDocument()
			expect(screen.getByTestId('kanban-column-done')).toBeInTheDocument()
		})
	})

	it('renders task cards', async () => {
		const invoke = vi.fn().mockResolvedValue(mockBoard)
		render(<KanbanPanel projectId="proj-1" invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('kanban-card-t1')).toBeInTheDocument()
			expect(screen.getByTestId('kanban-card-t3')).toBeInTheDocument()
		})
	})
})

// ============================================================================
// CostingDashboard tests
// ============================================================================

describe('CostingDashboard', () => {
	it('shows loading state initially', () => {
		const invoke = vi.fn().mockImplementation(() => new Promise(() => {}))
		render(<CostingDashboard invoke={invoke} />)
		expect(screen.getByTestId('costing-loading')).toBeInTheDocument()
	})

	it('displays summary after loading', async () => {
		const invoke = vi.fn().mockImplementation((channel: string) => {
			if (channel === 'costing:get-summary') return Promise.resolve(mockCostSummary)
			if (channel === 'costing:get-entries') return Promise.resolve(mockCostEntries)
			return Promise.resolve(undefined)
		})
		render(<CostingDashboard invoke={invoke} budgetLimit={5} />)
		await waitFor(() => {
			expect(screen.getByTestId('costing-dashboard')).toBeInTheDocument()
			expect(screen.getByTestId('spend-bar')).toBeInTheDocument()
		})
	})

	it('shows model breakdown', async () => {
		const invoke = vi.fn().mockImplementation((channel: string) => {
			if (channel === 'costing:get-summary') return Promise.resolve(mockCostSummary)
			if (channel === 'costing:get-entries') return Promise.resolve(mockCostEntries)
			return Promise.resolve(undefined)
		})
		render(<CostingDashboard invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('costing-by-model')).toBeInTheDocument()
			expect(screen.getByTestId('cost-model-claude-3.5-sonnet')).toBeInTheDocument()
			expect(screen.getByTestId('cost-model-gpt-4')).toBeInTheDocument()
		})
	})

	it('shows recent entries', async () => {
		const invoke = vi.fn().mockImplementation((channel: string) => {
			if (channel === 'costing:get-summary') return Promise.resolve(mockCostSummary)
			if (channel === 'costing:get-entries') return Promise.resolve(mockCostEntries)
			return Promise.resolve(undefined)
		})
		render(<CostingDashboard invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('costing-recent')).toBeInTheDocument()
			expect(screen.getByTestId('cost-entry-0')).toBeInTheDocument()
		})
	})
})

// ============================================================================
// TailscalePanel tests
// ============================================================================

describe('TailscalePanel', () => {
	it('shows loading state initially', () => {
		const invoke = vi.fn().mockImplementation(() => new Promise(() => {}))
		render(<TailscalePanel invoke={invoke} />)
		expect(screen.getByTestId('tailscale-loading')).toBeInTheDocument()
	})

	it('displays status after loading', async () => {
		const invoke = vi.fn().mockResolvedValue(mockTailscaleStatus)
		render(<TailscalePanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('tailscale-panel')).toBeInTheDocument()
			expect(screen.getByTestId('tailscale-state')).toHaveTextContent('Running')
		})
	})

	it('shows peers table', async () => {
		const invoke = vi.fn().mockResolvedValue(mockTailscaleStatus)
		render(<TailscalePanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('tailscale-peers-table')).toBeInTheDocument()
			expect(screen.getByTestId('peer-p1')).toBeInTheDocument()
			expect(screen.getByTestId('peer-p2')).toBeInTheDocument()
		})
	})

	it('shows disconnect button when running', async () => {
		const invoke = vi.fn().mockResolvedValue(mockTailscaleStatus)
		render(<TailscalePanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('tailscale-down-btn')).toBeInTheDocument()
		})
	})

	it('shows connect button when stopped', async () => {
		const stoppedStatus: TailscaleStatusResponse = {
			...mockTailscaleStatus,
			backendState: 'Stopped',
			peers: [],
		}
		const invoke = vi.fn().mockResolvedValue(stoppedStatus)
		render(<TailscalePanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('tailscale-up-btn')).toBeInTheDocument()
			expect(screen.getByTestId('no-peers')).toBeInTheDocument()
		})
	})

	it('calls tailscale:down on disconnect click', async () => {
		const invoke = vi.fn().mockResolvedValue(mockTailscaleStatus)
		render(<TailscalePanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('tailscale-down-btn')).toBeInTheDocument()
		})
		fireEvent.click(screen.getByTestId('tailscale-down-btn'))
		await waitFor(() => {
			expect(invoke).toHaveBeenCalledWith('tailscale:down', undefined)
		})
	})
})

// ============================================================================
// SatelliteSettingsPanel tests
// ============================================================================

const mockSatelliteConfig = {
	port: 9100,
	token: 'abcdef0123456789abcdef0123456789',
	isRunning: true,
	connectedClients: 2,
}

describe('SatelliteSettingsPanel', () => {
	it('shows loading state before invoke resolves', () => {
		render(<SatelliteSettingsPanel />)
		expect(screen.getByTestId('satellite-settings-loading')).toBeInTheDocument()
	})

	it('renders panel after config loads', async () => {
		const invoke = vi.fn().mockResolvedValue(mockSatelliteConfig)
		render(<SatelliteSettingsPanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('satellite-settings-panel')).toBeInTheDocument()
		})
	})

	it('shows running badge when server is running', async () => {
		const invoke = vi.fn().mockResolvedValue(mockSatelliteConfig)
		render(<SatelliteSettingsPanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('satellite-status-badge')).toHaveTextContent('Running')
		})
	})

	it('shows stopped badge when server is stopped', async () => {
		const invoke = vi.fn().mockResolvedValue({ ...mockSatelliteConfig, isRunning: false })
		render(<SatelliteSettingsPanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('satellite-status-badge')).toHaveTextContent('Stopped')
		})
	})

	it('shows correct port', async () => {
		const invoke = vi.fn().mockResolvedValue(mockSatelliteConfig)
		render(<SatelliteSettingsPanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('satellite-port')).toHaveTextContent('9100')
		})
	})

	it('masks the token to first 8 chars', async () => {
		const invoke = vi.fn().mockResolvedValue(mockSatelliteConfig)
		render(<SatelliteSettingsPanel invoke={invoke} />)
		await waitFor(() => {
			const masked = screen.getByTestId('satellite-token-masked')
			expect(masked).toHaveTextContent('abcdef01')
			expect(masked.textContent).not.toContain('abcdef0123456789abcdef0123456789')
		})
	})

	it('shows client count', async () => {
		const invoke = vi.fn().mockResolvedValue(mockSatelliteConfig)
		render(<SatelliteSettingsPanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('client-count')).toHaveTextContent('2 clients connected')
		})
	})

	it('renders regenerate token button', async () => {
		const invoke = vi.fn().mockResolvedValue(mockSatelliteConfig)
		render(<SatelliteSettingsPanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('regenerate-token-btn')).toBeInTheDocument()
		})
	})

	it('calls satellite:regenerate-token on button click and shows new token', async () => {
		const newTokenValue = 'deadbeef' + 'cafebabe' + 'feedface' + '12345678'
		const invoke = vi.fn()
			.mockResolvedValueOnce(mockSatelliteConfig)             // get-config
			.mockResolvedValueOnce({ newToken: newTokenValue })     // regenerate-token
			.mockResolvedValueOnce(mockSatelliteConfig)             // re-fetch config

		render(<SatelliteSettingsPanel invoke={invoke} />)
		await waitFor(() => {
			expect(screen.getByTestId('regenerate-token-btn')).toBeInTheDocument()
		})

		fireEvent.click(screen.getByTestId('regenerate-token-btn'))

		await waitFor(() => {
			expect(invoke).toHaveBeenCalledWith('satellite:regenerate-token', undefined)
		})

		await waitFor(() => {
			expect(screen.getByTestId('new-token-disclosure')).toBeInTheDocument()
			expect(screen.getByTestId('new-token-value')).toHaveTextContent(newTokenValue)
		})
	})
})
