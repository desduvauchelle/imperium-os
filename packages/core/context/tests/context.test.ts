import { describe, expect, test } from 'bun:test'
import { ContextAssembler, DEFAULT_CONTEXT_CONFIG } from '../src/index.js'
import { createProjectId } from '@imperium/shared-types'

describe('ContextAssembler', () => {
  test('instantiates with default config', () => {
    const assembler = new ContextAssembler()
    expect(assembler.config).toEqual(DEFAULT_CONTEXT_CONFIG)
  })

  test('accepts partial config override', () => {
    const assembler = new ContextAssembler({ fileTreeDepth: 5 })
    expect(assembler.config.fileTreeDepth).toBe(5)
    expect(assembler.config.slidingWindow).toEqual(DEFAULT_CONTEXT_CONFIG.slidingWindow)
  })

  test('assembleContext throws not-implemented', async () => {
    const assembler = new ContextAssembler()
    const projectId = createProjectId('proj-1')
    await expect(assembler.assembleContext(projectId)).rejects.toThrow('Not implemented')
  })

  test('getFileTree throws not-implemented', async () => {
    const assembler = new ContextAssembler()
    await expect(assembler.getFileTree('/some/path')).rejects.toThrow('Not implemented')
  })
})
