import React from 'react'
import { NavLink } from 'react-router-dom'
import { Badge } from '@imperium/ui-shared'
import { useSatellite } from '@imperium/ui-shared'

interface NavItem {
	to: string
	label: string
	icon: string
}

const NAV_ITEMS: NavItem[] = [
	{ to: '/kanban', label: 'Kanban', icon: '🗂' },
	{ to: '/costing', label: 'Costing', icon: '💰' },
	{ to: '/tailscale', label: 'Network', icon: '🔗' },
	{ to: '/mcp', label: 'MCP', icon: '⚙️' },
	{ to: '/agent', label: 'Agents', icon: '🤖' },
	{ to: '/permissions', label: 'Permissions', icon: '🛡' },
	{ to: '/settings', label: 'Settings', icon: '⚙' },
]

export function Sidebar() {
	const { masterOffline } = useSatellite()

	return (
		<aside
			data-testid="satellite-sidebar"
			className="w-52 shrink-0 border-r border-border bg-card flex flex-col h-screen"
		>
			{/* Header */}
			<div className="p-4 border-b border-border space-y-1">
				<div className="flex items-center justify-between">
					<span className="font-semibold text-sm">Imperium</span>
					<span className="text-xs text-muted-foreground">Satellite</span>
				</div>
				{masterOffline ? (
					<Badge variant="destructive" data-testid="master-offline-badge">
						Master Offline
					</Badge>
				) : (
					<Badge variant="default" data-testid="master-online-badge">
						Connected
					</Badge>
				)}
			</div>

			{/* Navigation */}
			<nav className="flex-1 p-2 space-y-0.5">
				{NAV_ITEMS.map((item) => (
					<NavLink
						key={item.to}
						to={item.to}
						data-testid={`nav-${item.to.slice(1)}`}
						className={({ isActive }) =>
							`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
								isActive
									? 'bg-accent text-accent-foreground font-medium'
									: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
							}`
						}
					>
						<span>{item.icon}</span>
						<span>{item.label}</span>
					</NavLink>
				))}
			</nav>
		</aside>
	)
}
