import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CostTag, formatCost } from '../src/components/cost-tag.js'

describe('CostTag', () => {
  it('renders model name and cost', () => {
    render(<CostTag model="Claude 3.5" costUsd={0.002} />)
    expect(screen.getByTestId('cost-tag-model')).toHaveTextContent('Claude 3.5')
    expect(screen.getByTestId('cost-tag-cost')).toHaveTextContent('$0.002')
  })

  it('renders with very small cost', () => {
    render(<CostTag model="GPT-4o mini" costUsd={0.0001} />)
    expect(screen.getByTestId('cost-tag-cost')).toHaveTextContent('$0.0001')
  })

  it('renders with larger cost', () => {
    render(<CostTag model="GPT-4" costUsd={1.5} />)
    expect(screen.getByTestId('cost-tag-cost')).toHaveTextContent('$1.50')
  })

  it('includes the bullet separator', () => {
    const { container } = render(<CostTag model="Test" costUsd={0.01} />)
    expect(container.textContent).toContain('•')
  })

  it('accepts custom className', () => {
    const { container } = render(<CostTag model="Test" costUsd={0.01} className="extra" />)
    expect(container.firstElementChild?.className).toContain('extra')
  })
})

describe('formatCost', () => {
  it('formats tiny costs to 4 decimals', () => {
    expect(formatCost(0.0001)).toBe('$0.0001')
    expect(formatCost(0.0005)).toBe('$0.0005')
  })

  it('formats small costs to 3 decimals', () => {
    expect(formatCost(0.002)).toBe('$0.002')
    expect(formatCost(0.123)).toBe('$0.123')
  })

  it('formats costs >= $1 to 2 decimals', () => {
    expect(formatCost(1.0)).toBe('$1.00')
    expect(formatCost(15.5)).toBe('$15.50')
  })
})
