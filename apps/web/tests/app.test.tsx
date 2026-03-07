import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from '../src/App.js'

describe('Web App', () => {
  it('renders satellite title', () => {
    render(<App />)
    expect(screen.getByText('Imperium Satellite')).toBeInTheDocument()
  })

  it('shows master offline badge', () => {
    render(<App />)
    expect(screen.getByText('Master Offline')).toBeInTheDocument()
  })

  it('renders theme toggle buttons', () => {
    render(<App />)
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('Auto')).toBeInTheDocument()
  })
})
