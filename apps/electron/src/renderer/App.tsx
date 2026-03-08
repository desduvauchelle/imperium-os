import React, { useState, useEffect } from 'react'
import {
	ThemeProvider,
	Button,
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardDescription,
	TailscaleView,
	McpView,
	AgentView,
	PermissionsView,
	CostingView,
	ThemeToggle,
	ProjectWorkspace,
	SpendBar,
	GlobalConnectionsView,
	cn,
	useSatellite,
} from '@imperium/ui-shared'
import type { ProjectMetadata, ProjectStatus } from '@imperium/shared-types'

import { ElectronSatelliteProvider } from './providers/ElectronSatelliteProvider.js'
import { OnboardingScreen } from './screens/OnboardingScreen.js'
import { CaffeinateToggle } from './panels/CaffeinateToggle.js'
import { SatelliteSettingsPanel } from './panels/SatelliteSettingsPanel.js'

function statusBorderClass(status: ProjectStatus): string {
	switch (status) {
		case 'active': return 'border-l-green-500'
		case 'paused': return 'border-l-amber-500'
		case 'archived': return 'border-l-zinc-500'
		default: return 'border-l-zinc-500'
	}
}

type SystemView = 'system-status' | 'global-mcp' | 'agents' | 'settings' | 'global-connections'

// ── Sidebar spend bar — must be inside ElectronSatelliteProvider ─────────────
function SidebarSpendBar() {
	const { invoke } = useSatellite()
	const [spend, setSpend] = useState({ current: 0, limit: 10 })

	useEffect(() => {
		invoke('costing:get-summary', {})
			.then((s) => setSpend({ current: s.totalCostUsd, limit: 10 }))
			.catch(() => { /* ignore — satellite may not be connected */ })
	}, [invoke])

	return (
		<div className="shrink-0 border-t px-3 py-2">
			<SpendBar currentSpend={spend.current} budgetLimit={spend.limit} label="Total Burn" />
		</div>
	)
}

export function App() {
	const [onboardingDone, setOnboardingDoneState] = useState(() =>
		localStorage.getItem('imperium:onboarding') === 'true',
	)

	const setOnboardingDone = (done: boolean) => {
		if (done) {
			localStorage.setItem('imperium:onboarding', 'true')
		} else {
			localStorage.removeItem('imperium:onboarding')
		}
		setOnboardingDoneState(done)
	}

	const [projects, setProjects] = useState<readonly ProjectMetadata[]>([])
	const [activeProject, setActiveProject] = useState<ProjectMetadata | null>(null)
	const [newProjectName, setNewProjectName] = useState('')
	const [isCreating, setIsCreating] = useState(false)
	const [systemView, setSystemView] = useState<SystemView>('system-status')

	useEffect(() => {
		if (onboardingDone) {
			window.electronApi.invoke('project:list', undefined).then(setProjects).catch(console.error)
		}
	}, [onboardingDone])

	const handleCreateProject = async (e?: React.FormEvent) => {
		if (e) e.preventDefault()
		if (!newProjectName.trim()) return
		setIsCreating(true)
		try {
			const project = (await window.electronApi.invoke('project:create' as never, {
				name: newProjectName.trim(),
			} as never)) as unknown as ProjectMetadata
			setProjects((prev) => [project, ...prev])
			setActiveProject(project)
			setNewProjectName('')
		} catch (err) {
			console.error('Failed to create project', err)
		} finally {
			setIsCreating(false)
		}
	}

	return (
		<ThemeProvider defaultTheme="dark">
			<ElectronSatelliteProvider>
				<div className="min-h-screen h-screen bg-background text-foreground flex flex-col overflow-hidden">

					{/* macOS draggable titlebar */}
					<header className="window-drag flex-none h-8 z-[100] border-b bg-muted/10 pointer-events-auto flex items-center px-4">
						<div className="w-full h-full pointer-events-none" />
					</header>

					<main className="flex-1 flex overflow-hidden">
						{!onboardingDone ? (
							<div className="w-full overflow-y-auto">
								<OnboardingScreen onComplete={() => setOnboardingDone(true)} />
							</div>
						) : (
							<>
								{/* ─── Left sidebar ──────────────────────────────────── */}
								<aside className="w-52 shrink-0 bg-muted/20 border-r flex flex-col overflow-hidden">

									{/* Projects */}
									<div className="flex items-center justify-between px-3 pt-4 pb-1">
										<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
											Projects
										</span>
										<Button
											variant="outline"
											size="sm"
											className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
											title="New project"
											onClick={() => { setActiveProject(null); setSystemView('system-status') }}
										>
											+
										</Button>
									</div>

									<div className="flex flex-col gap-px px-1 pb-2 overflow-y-auto flex-1">
										{projects.length === 0 && (
											<p className="px-2 py-1 text-xs text-muted-foreground">No projects yet.</p>
										)}
										{projects.map((p) => (
											<button
												key={p.id}
												type="button"
												className={cn(
													'w-full text-left h-8 text-sm pl-2 pr-2 border-l-2 rounded-r-md transition-colors hover:bg-accent/50',
													statusBorderClass(p.status),
													activeProject?.id === p.id
														? 'bg-secondary text-secondary-foreground'
														: 'bg-transparent text-foreground/80',
												)}
												onClick={() => setActiveProject(p)}
											>
												<span className="truncate block">{p.name}</span>
											</button>
										))}
									</div>

									{/* System */}
									<div className="shrink-0 border-t pt-2 px-2">
										<span className="block px-2 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
											System
										</span>
										{(
											[
												['system-status', 'System Status'],
												['global-mcp', 'Skills & MCPs'],
												['agents', 'Agents'],
												['global-connections', 'Global Connections'],
												['settings', 'Satellite Config'],
											] as [SystemView, string][]
										).map(([id, label]) => (
											<Button
												key={id}
												variant={!activeProject && systemView === id ? 'secondary' : 'ghost'}
												className="w-full justify-start h-8 px-2 text-sm"
												onClick={() => { setActiveProject(null); setSystemView(id) }}
											>
												{label}
											</Button>
										))}
									</div>

									{/* Total Burn spend bar */}
									<SidebarSpendBar />
								</aside>

								{/* ─── Main content ──────────────────────────────────── */}
								<section className="flex-1 flex flex-col min-w-0 overflow-hidden">
									{activeProject ? (
										/* ProjectWorkspace lives in @imperium/ui-shared — shared across all apps */
										<ProjectWorkspace
											projectId={activeProject.id}
											projectName={activeProject.name}
										/>
									) : (
										<div className="flex-1 overflow-auto p-6 space-y-6 max-w-4xl mx-auto w-full">

											{systemView === 'system-status' && (
												<>
													<Card>
														<CardHeader>
															<CardTitle>System Status</CardTitle>
															<CardDescription>Desktop Master Node</CardDescription>
														</CardHeader>
														<CardContent className="space-y-4">
															<div>
																<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Theme</p>
																<ThemeToggle />
															</div>
															<div>
																<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Power</p>
																<CaffeinateToggle />
															</div>
														</CardContent>
													</Card>
													<TailscaleView />
													<PermissionsView />
													<CostingView />
													{projects.length === 0 && (
														<Card className="max-w-md mx-auto bg-card/50 backdrop-blur">
															<CardHeader>
																<CardTitle className="text-xl text-center">Create your first project</CardTitle>
															</CardHeader>
															<CardContent>
																<form onSubmit={handleCreateProject} className="flex flex-col gap-3">
																	<input
																		type="text"
																		placeholder="Project name"
																		value={newProjectName}
																		className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
																		onChange={(e) => setNewProjectName(e.target.value)}
																		autoFocus
																	/>
																	<Button type="submit" disabled={!newProjectName.trim() || isCreating}>
																		{isCreating ? 'Creating…' : 'Create Project'}
																	</Button>
																</form>
															</CardContent>
														</Card>
													)}
												</>
											)}

											{systemView === 'global-mcp' && <McpView />}
											{systemView === 'agents' && <AgentView />}
											{systemView === 'global-connections' && <GlobalConnectionsView />}
											{systemView === 'settings' && <SatelliteSettingsPanel />}
										</div>
									)}
								</section>
							</>
						)}
					</main>
				</div>
			</ElectronSatelliteProvider>
		</ThemeProvider>
	)
}
