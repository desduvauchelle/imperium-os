import React from 'react'
import { Button } from '../components/button.js'
import { useTheme } from '../providers/theme-provider.js'
import type { ThemeMode } from '@imperium/shared-types'

const MODES: ThemeMode[] = ['light', 'dark', 'auto']

export function ThemeToggle() {
	const { theme, setTheme } = useTheme()
	return (
		<div className="flex gap-1">
			{MODES.map((mode) => (
				<Button
					key={mode}
					variant={theme === mode ? 'default' : 'outline'}
					size="sm"
					onClick={() => setTheme(mode)}
					data-testid={`theme-${mode}`}
				>
					{mode.charAt(0).toUpperCase() + mode.slice(1)}
				</Button>
			))}
		</div>
	)
}
