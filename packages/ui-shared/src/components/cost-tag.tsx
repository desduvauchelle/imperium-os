import * as React from 'react'
import type { CostEntry } from '@imperium/shared-types'
import { Badge } from './badge.js'

// ============================================================================
// Cost Tag - Discreet label showing model name + cost
// ============================================================================

export interface CostTagProps {
  /** The model name to display */
  readonly model: string
  /** The cost in USD */
  readonly costUsd: number
  /** Optional additional CSS classes */
  readonly className?: string | undefined
}

/** Format a USD cost to a readable string */
function formatCost(costUsd: number): string {
  if (costUsd < 0.001) {
    return `$${costUsd.toFixed(4)}`
  }
  if (costUsd < 1) {
    return `$${costUsd.toFixed(3)}`
  }
  return `$${costUsd.toFixed(2)}`
}

/**
 * Discreet tag showing model name and calculated cost.
 * Example: "Claude 3.5 • $0.002"
 */
export function CostTag({ model, costUsd, className }: CostTagProps) {
  return (
    <Badge variant="outline" className={className}>
      <span data-testid="cost-tag-model">{model}</span>
      <span className="mx-1 opacity-50">•</span>
      <span data-testid="cost-tag-cost">{formatCost(costUsd)}</span>
    </Badge>
  )
}

/** Create CostTag props from a CostEntry */
export function costTagPropsFromEntry(entry: CostEntry): CostTagProps {
  return {
    model: entry.model,
    costUsd: entry.costUsd,
  }
}

export { formatCost }
