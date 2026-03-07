import * as React from 'react'
import { cn } from '../lib/utils.js'

// ============================================================================
// SpendBar — Visual usage bar showing cost vs. budget
// ============================================================================

export interface SpendBarProps {
  /** Current total spend in USD */
  readonly currentSpend: number
  /** Budget limit in USD */
  readonly budgetLimit: number
  /** Optional label */
  readonly label?: string | undefined
  /** Optional additional CSS classes */
  readonly className?: string | undefined
}

function formatUsd(value: number): string {
  if (value < 1) return `$${value.toFixed(3)}`
  return `$${value.toFixed(2)}`
}

export function SpendBar({ currentSpend, budgetLimit, label, className }: SpendBarProps) {
  const percentage = budgetLimit > 0 ? Math.min((currentSpend / budgetLimit) * 100, 100) : 0
  const isOverBudget = currentSpend > budgetLimit
  const isWarning = percentage >= 80 && !isOverBudget

  return (
    <div className={cn('space-y-1', className)} data-testid="spend-bar">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground" data-testid="spend-bar-label">
          {label ?? 'Spend'}
        </span>
        <span
          className={cn(
            'font-medium',
            isOverBudget && 'text-destructive',
            isWarning && 'text-yellow-600 dark:text-yellow-400',
          )}
          data-testid="spend-bar-value"
        >
          {formatUsd(currentSpend)} / {formatUsd(budgetLimit)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary" data-testid="spend-bar-track">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isOverBudget
              ? 'bg-destructive'
              : isWarning
                ? 'bg-yellow-500'
                : 'bg-primary',
          )}
          style={{ width: `${percentage}%` }}
          data-testid="spend-bar-fill"
        />
      </div>
    </div>
  )
}

export { formatUsd }
