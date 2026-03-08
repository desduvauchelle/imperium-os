import React from 'react'
import { NavLink } from 'react-router-dom'
import type { NavItem } from './AppSidebar.js'
import { DEFAULT_NAV_ITEMS } from './AppSidebar.js'

export interface BottomNavProps {
  readonly navItems?: NavItem[]
}

export function BottomNav({ navItems = DEFAULT_NAV_ITEMS }: BottomNavProps) {
  return (
    <nav
      data-testid="bottom-nav"
      className="shrink-0 border-t border-border bg-card flex items-center justify-around px-2 py-1 safe-area-inset-bottom"
    >
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          data-testid={`nav-${item.to.slice(1)}`}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-xs transition-colors min-w-[3rem] ${
              isActive
                ? 'text-accent-foreground font-medium'
                : 'text-muted-foreground'
            }`
          }
        >
          <span className="text-lg leading-none">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
