import React, { useState, useEffect } from 'react'
import { ThemeProvider, Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@imperium/ui-shared'
import type { ThemeMode, ProjectMetadata } from '@imperium/shared-types'
import { useTheme } from '@imperium/ui-shared'
import { OnboardingScreen } from './screens/OnboardingScreen.js'
import { PermissionsPanel } from './panels/PermissionsPanel.js'
import { CaffeinateToggle } from './panels/CaffeinateToggle.js'

import { CostingDashboard } from './panels/CostingDashboard.js'
import { KanbanPanel } from './panels/KanbanPanel.js'
import { TailscalePanel } from './panels/TailscalePanel.js'
import { SatelliteSettingsPanel } from './panels/SatelliteSettingsPanel.js'
import { McpStatusPanel } from './panels/McpStatusPanel.js'
import { FileLockPanel } from './panels/FileLockPanel.js'

// ============================================================================
// Theme Toggle - Demonstrates Light/Dark/Auto switching
// ============================================================================

function ThemeToggle() {
	const { theme, setTheme } = useTheme()
	const modes: ThemeMode[] = ['light', 'dark', 'auto']

	return (
		<div className="flex gap-2">
			{modes.map((mode) => (
				<Button
					key={mode}
					variant={theme === mode ? 'default' : 'outline'}
					size="sm"
					onClick={() => setTheme(mode)}
				>
					{mode.charAt(0).toUpperCase() + mode.slice(1)}
				</Button>
			))}
		</div>
	)
}

// ============================================================================
// App Component
// ============================================================================

export function App() {
	// 1. Initialize from localStorage
	const [onboardingDone, setOnboardingDoneState] = useState(() => {
		return localStorage.getItem('imperium:onboarding') === 'true'
	})

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
	const [currentView, setCurrentView] = useState<'overview' | 'tailscale' | 'settings' | 'pr-kanban' | 'pr-chat' | 'pr-costing' | 'pr-mcp' | 'welcome'>('overview')

	const [newProjectName, setNewProjectName] = useState('')
	const [isCreating, setIsCreating] = useState(false)

	useEffect(() => {
		if (onboardingDone) {
			window.electronApi.invoke('project:list', undefined).then((fetchedProjects) => {
				setProjects(fetchedProjects)
				if (fetchedProjects.length === 0) {
					setCurrentView('welcome')
				}
			}).catch(console.error)
		}
	}, [onboardingDone])

	const handleCreateProject = async (e?: React.FormEvent) => {
		if (e) e.preventDefault()
		if (!newProjectName.trim()) return

		setIsCreating(true)
		try {
			const project = await window.electronApi.invoke('project:create' as any, { name: newProjectName.trim() }) as unknown as ProjectMetadata
			setProjects(prev => [project, ...prev])
			setActiveProject(project.id)
			setCurrentView('pr-kanban')
			setNewProjectName('')
		} catch (error) {
			console.error("Failed to create project", error)
		} finally {
			setIsCreating(false)
		}
	}

	return (
		<ThemeProvider defaultTheme="dark">
			<div className="min-h-screen h-screen bg-background text-foreground flex flex-col overflow-hidden">
				{/* Global Transparent Draggable Header */}
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
							{/* Sidebar */}
							<aside className="w-64 bg-muted/20 border-r flex flex-col p-4 gap-1 overflow-y-auto">
								<h2 className="text-xl font-bold mb-4 px-2">Imperium OS</h2>

								<div className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projects</div>
								{projects.length === 0 && <p className="px-2 text-sm text-muted-foreground">No projects found.</p>}
								{projects.map(p => (
									<div key={p.id} className="mb-1">
										<Button
											variant={activeProject === p.id ? 'secondary' : 'ghost'}
											className={`w-full justify-start ${activeProject === p.id ? 'font-bold' : ''}`}
											onClick={() => {
												setActiveProject(p.id)
												if (!currentView.startsWith('pr-')) setCurrentView('pr-kanban')
											}}
										>
											{p.name}
										</Button>
									</div>
								))}

								<Button
									variant="outline"
									size="sm"
									className="mt-2 w-full justify-start border-dashed"
									onClick={() => { setActiveProject(null); setCurrentView('welcome') }}
								>
									+ Add Project
								</Button>

								<div className="mt-8 mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Settings</div>
								<Button variant={currentView === 'overview' ? 'secondary' : 'ghost'} className="justify-start w-full" onClick={() => { setActiveProject(null); setCurrentView('overview') }}>Overview</Button>
								<Button variant={currentView === 'tailscale' ? 'secondary' : 'ghost'} className="justify-start w-full" onClick={() => { setActiveProject(null); setCurrentView('tailscale') }}>Tailscale</Button>
								<Button variant={currentView === 'settings' ? 'secondary' : 'ghost'} className="justify-start w-full" onClick={() => { setActiveProject(null); setCurrentView('settings') }}>Satellite Config</Button>
							</aside>

							{/* Main Content Area */}
							<section className="flex-1 flex flex-col min-w-0">
								{/* Project Top Nav */}
								{activeProject && (
									<div className="flex-none h-14 border-b flex items-center px-6 gap-6 bg-background">
										<h2 className="text-lg font-semibold truncate max-w-[200px]">
											{projects.find(p => p.id === activeProject)?.name}
										</h2>
										<div className="flex flex-1 items-center gap-2">
											<Button size="sm" variant={currentView === 'pr-kanban' ? 'secondary' : 'ghost'} onClick={() => setCurrentView('pr-kanban')}>Kanban</Button>
											<Button size="sm" variant={currentView === 'pr-chat' ? 'secondary' : 'ghost'} onClick={() => setCurrentView('pr-chat')}>Chat</Button>
											<Button size="sm" variant={currentView === 'pr-costing' ? 'secondary' : 'ghost'} onClick={() => setCurrentView('pr-costing')}>Costing</Button>
											<Button size="sm" variant={currentView === 'pr-mcp' ? 'secondary' : 'ghost'} onClick={() => setCurrentView('pr-mcp')}>MCP & Locks</Button>
										</div>
									</div>
								)}

								<div className="flex-1 overflow-y-auto p-8">
									<div className="max-w-4xl mx-auto space-y-6">
										{currentView === 'overview' && (
											<>
												<Card>
													<CardHeader>
														<CardTitle>System Overview</CardTitle>
														<CardDescription>Multi-Platform Agentic OS — Desktop Master Node</CardDescription>
													</CardHeader>
													<CardContent className="space-y-6">
														<div>
															<h3 className="text-sm font-medium text-muted-foreground mb-2">Theme</h3>
															<ThemeToggle />
														</div>
													</CardContent>
												</Card>
												<PermissionsPanel />
												<CaffeinateToggle />
											</>
										)}

										{activeProject && currentView === 'pr-kanban' && <KanbanPanel projectId={activeProject} invoke={window.electronApi.invoke} />}
										{activeProject && currentView === 'pr-chat' && (
											<div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-muted-foreground">
												<p>Chat view placeholder.</p>
											</div>
										)}
										{activeProject && currentView === 'pr-costing' && <CostingDashboard invoke={window.electronApi.invoke} />}
										{activeProject && currentView === 'pr-mcp' && (
											<>
												<McpStatusPanel />
												<FileLockPanel />
											</>
										)}


										{!activeProject && currentView === 'tailscale' && <TailscalePanel />}
										{!activeProject && currentView === 'settings' && <SatelliteSettingsPanel />}

										{!activeProject && currentView === 'welcome' && (
											<Card className="max-w-md mx-auto mt-12 bg-card/50 backdrop-blur">
												<CardHeader>
													<CardTitle className="text-2xl text-center">Welcome to Imperium</CardTitle>
													<CardDescription className="text-center text-md">
														Let's get started by creating your first project.
													</CardDescription>
												</CardHeader>
												<CardContent>
													<form onSubmit={handleCreateProject} className="flex flex-col gap-4">
														<div className="space-y-2">
															<label htmlFor="projectName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
																Project Name
															</label>
															<input
																type="text"
																id="projectName"
																placeholder="e.g. My Website, Data Analysis, Client Alpha..."
																value={newProjectName}
																className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
																onChange={(e) => setNewProjectName(e.target.value)}
																autoFocus
															/>
														</div>
														<Button type="submit" className="w-full" disabled={!newProjectName.trim() || isCreating}>
															{isCreating ? 'Creating...' : 'Create Project'}
														</Button>
													</form>
												</CardContent>
											</Card>
										)}
									</div>
								</div>
							</section>
						</>
					)}
				</main>
			</div>
		</ThemeProvider>
	)
}
