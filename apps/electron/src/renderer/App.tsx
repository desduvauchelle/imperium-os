import React, { useState, useEffect } from 'react'
import {
	ThemeProvider,
	Button,
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	// Shared views
	KanbanView,
	CostingView,
	TailscaleView,
	McpView,
	AgentView,
	PermissionsView,
	// Theme toggle
	ThemeToggle,
} from '@imperium/ui-shared'
import type { ProjectMetadata, ProjectStatus } from '@imperium/shared-types'

import { ElectronSatelliteProvider } from './providers/ElectronSatelliteProvider.js'
import { OnboardingScreen } from './screens/OnboardingScreen.js'

// Electron-specific panels (master-only features)
import { CaffeinateToggle } from './panels/CaffeinateToggle.js'
import { SatelliteSettingsPanel } from './panels/SatelliteSettingsPanel.js'

// ============================================================================
// Helpers
// ============================================================================

/** Map stored project status → UX indicator colour class */
function statusDotClass(status: ProjectStatus): string {
	switch (status) {
		case 'active': return 'bg-green-500'
		case 'paused': return 'bg-amber-500'
		case 'archived': return 'bg-zinc-500'
		default: return 'bg-zinc-500'
	}
}

// ============================================================================
// App Component
// ============================================================================

type ViewId =
	| 'system-status'
	| 'global-mcp'
	| 'agents'
	| 'settings'
	| 'pr-config'
	| 'pr-chat'
	| 'pr-kanban'
	| 'pr-mcp'
	| 'welcome'

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
	const [activeProject, setActiveProject] = useState<string | null>(null)
	const [currentView, setCurrentView] = useState<ViewId>('system-status')
	const [newProjectName, setNewProjectName] = useState('')
	const [isCreating, setIsCreating] = useState(false)

	useEffect(() => {
		if (onboardingDone) {
			window.electronApi
				.invoke('project:list', undefined)
				.then((fetchedProjects) => {
					setProjects(fetchedProjects)
					if (fetchedProjects.length === 0) setCurrentView('welcome')
				})
				.catch(console.error)
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
			setActiveProject(project.id)
			setCurrentView('pr-kanban')
			setNewProjectName('')
		} catch (error) {
			console.error('Failed to create project', error)
		} finally {
			setIsCreating(false)
		}
	}

	return (
		<ThemeProvider defaultTheme="dark">
			<ElectronSatelliteProvider>
				<div className="min-h-screen h-screen bg-background text-foreground flex flex-col overflow-hidden">
					{/* macOS-style draggable titlebar */}
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
								{/* ─── Primary Sidebar ─────────────────────────────────── */}
								<aside className="w-56 bg-muted/20 border-r flex flex-col overflow-y-auto">
									{/* Project list */}
									<div className="flex items-center justify-between px-3 pt-4 pb-1">
										<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
											Projects
										</span>
										<Button
											variant="ghost"
											size="sm"
											className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
											title="New project"
											onClick={() => { setActiveProject(null); setCurrentView('welcome') }}
										>
											+
										</Button>
									</div>

									<div className="flex flex-col gap-0.5 px-2 pb-2">
										{projects.length === 0 && (
											<p className="px-2 py-1 text-xs text-muted-foreground">No projects yet.</p>
										)}
										{projects.map((p) => (
											<Button
												key={p.id}
												variant={activeProject === p.id ? 'secondary' : 'ghost'}
												className="w-full justify-start gap-2 h-8 text-sm px-2"
												onClick={() => {
													setActiveProject(p.id)
													if (!currentView.startsWith('pr-')) setCurrentView('pr-kanban')
												}}
											>
												{/* Status indicator dot */}
												<span
													className={`shrink-0 w-2 h-2 rounded-full ${statusDotClass(p.status)}`}
												/>
												<span className="truncate">{p.name}</span>
											</Button>
										))}
									</div>

									{/* Spacer */}
									<div className="flex-1" />

									{/* Global / System links */}
									<div className="px-3 pt-2 pb-1">
										<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
											Global
										</span>
									</div>
									<div className="flex flex-col gap-0.5 px-2 pb-4">
										{(
											[
												['global-mcp', 'Skills & MCPs'],
												['agents', 'Agents'],
												['system-status', 'System Status'],
												['settings', 'Satellite Config'],
											] as [ViewId, string][]
										).map(([id, label]) => (
											<Button
												key={id}
												variant={currentView === id && !activeProject ? 'secondary' : 'ghost'}
												className="justify-start w-full h-8 text-sm px-2"
												onClick={() => { setActiveProject(null); setCurrentView(id) }}
											>
												{label}
											</Button>
										))}
									</div>
								</aside>

								{/* ─── Main Content ─────────────────────────────────────── */}
								<section className="flex-1 flex flex-col min-w-0 overflow-hidden">
									{/* Per-project tab bar */}
									{activeProject && (
										<div className="flex-none h-11 border-b flex items-center px-4 gap-1 bg-background">
											<span className="text-sm font-semibold truncate max-w-[160px] mr-3 text-muted-foreground">
												{projects.find((p) => p.id === activeProject)?.name}
											</span>
											{(
												[
													['pr-config', 'Config'],
													['pr-chat', 'Chat'],
													['pr-kanban', 'Kanban'],
													['pr-mcp', 'Skills & MCPs'],
												] as [ViewId, string][]
											).map(([id, label]) => (
												<Button
													key={id}
													size="sm"
													variant={currentView === id ? 'secondary' : 'ghost'}
													className="h-7 px-3 text-xs"
													onClick={() => setCurrentView(id)}
												>
													{label}
												</Button>
											))}
										</div>
									)}

									{/* Content area */}
									<div className="flex-1 overflow-auto">
										<div
											className={
												activeProject ? 'h-full w-full' : 'max-w-4xl mx-auto p-8 space-y-6'
											}
										>
											{/* ── System views ── */}
											{!activeProject && currentView === 'system-status' && (
												<div className="space-y-6">
													<Card>
														<CardHeader>
															<CardTitle>System Status</CardTitle>
															<CardDescription>
																Master node — Desktop
															</CardDescription>
														</CardHeader>
														<CardContent className="space-y-4">
															<div>
																<h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
																	Theme
																</h3>
																<ThemeToggle />
															</div>
															<div>
																<h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
																	Power
																</h3>
																<CaffeinateToggle />
															</div>
														</CardContent>
													</Card>
													<TailscaleView />
													<PermissionsView />
													<CostingView />
												</div>
											)}
											{!activeProject && currentView === 'global-mcp' && (
												<McpView />
											)}
											{!activeProject && currentView === 'agents' && (
												<AgentView />
											)}
											{!activeProject && currentView === 'settings' && (
												<SatelliteSettingsPanel />
											)}

											{/* ── New project welcome ── */}
											{!activeProject && currentView === 'welcome' && (
												<Card className="max-w-md mx-auto mt-12 bg-card/50 backdrop-blur">
													<CardHeader>
														<CardTitle className="text-2xl text-center">
															Welcome to Imperium
														</CardTitle>
														<CardDescription className="text-center text-md">
															Let&apos;s get started by creating your first project.
														</CardDescription>
													</CardHeader>
													<CardContent>
														<form onSubmit={handleCreateProject} className="flex flex-col gap-4">
															<div className="space-y-2">
																<label
																	htmlFor="projectName"
																	className="text-sm font-medium leading-none"
																>
																	Project Name
																</label>
																<input
																	type="text"
																	id="projectName"
																	placeholder="e.g. My Website, Data Analysis, Client Alpha..."
																	value={newProjectName}
																	className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
																	onChange={(e) => setNewProjectName(e.target.value)}
																	autoFocus
																/>
															</div>
															<Button
																type="submit"
																className="w-full"
																disabled={!newProjectName.trim() || isCreating}
															>
																{isCreating ? 'Creating...' : 'Create Project'}
															</Button>
														</form>
													</CardContent>
												</Card>
											)}

											{/* ── Per-project views ── */}
											{activeProject && currentView === 'pr-config' && (
												<div className="p-6 space-y-4">
													{(() => {
														const p = projects.find((pr) => pr.id === activeProject)
														if (!p) return null
														return (
															<Card>
																<CardHeader>
																	<CardTitle>{p.name}</CardTitle>
																	<CardDescription>
																		Status: <span className="capitalize">{p.status}</span>
																		{p.description ? ` · ${p.description}` : ''}
																	</CardDescription>
																</CardHeader>
																<CardContent className="text-sm text-muted-foreground space-y-1">
																	<p>Created: {new Date(p.createdAt).toLocaleString()}</p>
																	<p>Tags: {p.tags.length > 0 ? p.tags.join(', ') : 'none'}</p>
																</CardContent>
															</Card>
														)
													})()}
												</div>
											)}
											{activeProject && currentView === 'pr-chat' && (
												<div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6">
													<p className="text-sm">Omni-Chat — coming soon.</p>
												</div>
											)}
											{activeProject && currentView === 'pr-kanban' && (
												<div className="h-full p-6">
													<KanbanView projectId={activeProject} />
												</div>
											)}
											{activeProject && currentView === 'pr-mcp' && (
												<div className="p-6">
													<McpView />
												</div>
											)}
										</div>
									</div>
								</section>
							</>
						)}
					</main>
				</div>
			</ElectronSatelliteProvider>
		</ThemeProvider>
	)
}
