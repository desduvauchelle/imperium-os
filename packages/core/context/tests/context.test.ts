import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { ContextAssembler, DEFAULT_CONTEXT_CONFIG } from '../src/index.js'
import { createProjectId, isOk, isErr } from '@imperium/shared-types'
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('ContextAssembler', () => {
  // ========== Config tests ==========

  test('instantiates with default config', () => {
    const assembler = new ContextAssembler()
    expect(assembler.config).toEqual(DEFAULT_CONTEXT_CONFIG)
  })

  test('accepts partial config override', () => {
    const assembler = new ContextAssembler(undefined, { fileTreeDepth: 5 })
    expect(assembler.config.fileTreeDepth).toBe(5)
    expect(assembler.config.slidingWindow).toEqual(DEFAULT_CONTEXT_CONFIG.slidingWindow)
  })

  // ========== getFileTree tests ==========

  describe('getFileTree', () => {
    let tempDir: string

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'imperium-test-'))
      // Create a test directory structure:
      // tempDir/
      //   src/
      //     index.ts
      //     utils/
      //       helpers.ts
      //   package.json
      //   node_modules/    (should be ignored)
      //     foo.js
      await mkdir(join(tempDir, 'src', 'utils'), { recursive: true })
      await mkdir(join(tempDir, 'node_modules'), { recursive: true })
      await writeFile(join(tempDir, 'src', 'index.ts'), 'export {}')
      await writeFile(join(tempDir, 'src', 'utils', 'helpers.ts'), 'export {}')
      await writeFile(join(tempDir, 'package.json'), '{}')
      await writeFile(join(tempDir, 'node_modules', 'foo.js'), '')
    })

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true })
    })

    test('produces ASCII tree output', async () => {
      const assembler = new ContextAssembler()
      const result = await assembler.getFileTree(tempDir)

      expect(isOk(result)).toBe(true)
      if (result.ok) {
        expect(result.value).toContain('src/')
        expect(result.value).toContain('index.ts')
        expect(result.value).toContain('package.json')
      }
    })

    test('ignores node_modules', async () => {
      const assembler = new ContextAssembler()
      const result = await assembler.getFileTree(tempDir)

      expect(isOk(result)).toBe(true)
      if (result.ok) {
        expect(result.value).not.toContain('node_modules')
        expect(result.value).not.toContain('foo.js')
      }
    })

    test('respects maxDepth', async () => {
      const assembler = new ContextAssembler(undefined, { fileTreeDepth: 1 })
      const result = await assembler.getFileTree(tempDir, 1)

      expect(isOk(result)).toBe(true)
      if (result.ok) {
        expect(result.value).toContain('src/')
        // Should NOT recurse into src to show utils/
        expect(result.value).not.toContain('helpers.ts')
      }
    })

    test('shows nested files at depth 3', async () => {
      const assembler = new ContextAssembler()
      const result = await assembler.getFileTree(tempDir, 3)

      expect(isOk(result)).toBe(true)
      if (result.ok) {
        expect(result.value).toContain('helpers.ts')
      }
    })

    test('directories appear before files', async () => {
      const assembler = new ContextAssembler()
      const result = await assembler.getFileTree(tempDir)

      expect(isOk(result)).toBe(true)
      if (result.ok) {
        const srcIndex = result.value.indexOf('src/')
        const pkgIndex = result.value.indexOf('package.json')
        expect(srcIndex).toBeLessThan(pkgIndex)
      }
    })

    test('handles non-existent path gracefully', async () => {
      const assembler = new ContextAssembler()
      const result = await assembler.getFileTree('/nonexistent/path/xyz')

      expect(isOk(result)).toBe(true)
      if (result.ok) {
        // Empty tree — no entries
        expect(result.value).toBe('')
      }
    })
  })

  // ========== assembleContext tests ==========

  describe('assembleContext', () => {
    let tempDir: string

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'imperium-ctx-'))
      await mkdir(join(tempDir, 'src'), { recursive: true })
      await writeFile(join(tempDir, 'src', 'main.ts'), 'console.log("hello")')
    })

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true })
    })

    test('assembleContext without memory manager returns file tree only', async () => {
      const assembler = new ContextAssembler()
      const projectId = createProjectId('proj-1')
      const result = await assembler.assembleContext(projectId, tempDir)

      expect(isOk(result)).toBe(true)
      if (result.ok) {
        expect(result.value.projectId).toBe(projectId)
        expect(result.value.fileTreeSkeleton).toContain('src/')
        expect(result.value.fileTreeSkeleton).toContain('main.ts')
        expect(result.value.memoryBlocks).toHaveLength(0)
        expect(result.value.recentMessages).toHaveLength(0)
      }
    })

    test('assembleContext with includeMemoryBlocks=false skips memory', async () => {
      const assembler = new ContextAssembler(undefined, { includeMemoryBlocks: false })
      const projectId = createProjectId('proj-2')
      const result = await assembler.assembleContext(projectId, tempDir)

      expect(isOk(result)).toBe(true)
      if (result.ok) {
        expect(result.value.memoryBlocks).toHaveLength(0)
        expect(result.value.fileTreeSkeleton).toContain('src/')
      }
    })
  })
})
