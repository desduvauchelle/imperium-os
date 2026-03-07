import { describe, expect, test } from 'bun:test'
import { TailscaleBridge } from '../src/index.js'
import type { SpawnFn } from '../src/index.js'

// ============================================================================
// Mock spawn helpers
// ============================================================================

function mockSpawn(
  overrides: Partial<Record<string, { exitCode: number; stdout: string; stderr: string }>> = {},
): SpawnFn {
  return async (cmd: string[]) => {
    const key = cmd.join(' ')

    // Check for overrides by key prefix match
    for (const [pattern, result] of Object.entries(overrides)) {
      if (key.includes(pattern)) {
        return result!
      }
    }

    // Default: which tailscale → found
    if (key.includes('which')) {
      return { exitCode: 0, stdout: '/usr/local/bin/tailscale', stderr: '' }
    }

    return { exitCode: 1, stdout: '', stderr: 'unknown command' }
  }
}

const MOCK_STATUS_JSON = JSON.stringify({
  BackendState: 'Running',
  Version: '1.56.0',
  Self: {
    HostName: 'imperium-master',
    TailscaleIPs: ['100.64.0.1', 'fd7a:115c:a1e0::1'],
    Online: true,
    DNSName: 'imperium-master.tail1234.ts.net.',
  },
  Peer: {
    'peer-1': {
      ID: 'peer-1',
      HostName: 'satellite-1',
      TailscaleIPs: ['100.64.0.2', 'fd7a:115c:a1e0::2'],
      OS: 'macOS',
      Online: true,
      LastSeen: '2025-01-01T00:00:00Z',
      ExitNode: false,
      Tags: ['tag:server'],
    },
    'peer-2': {
      ID: 'peer-2',
      HostName: 'satellite-2',
      TailscaleIPs: ['100.64.0.3'],
      OS: 'linux',
      Online: false,
      ExitNode: false,
    },
  },
  MagicDNSSuffix: 'tail1234.ts.net',
})

// ============================================================================
// Tests
// ============================================================================

describe('TailscaleBridge', () => {
  test('isAvailable returns true when CLI found', async () => {
    const bridge = new TailscaleBridge({}, mockSpawn())
    expect(await bridge.isAvailable()).toBe(true)
  })

  test('isAvailable returns false when CLI not found', async () => {
    const spawn: SpawnFn = async () => ({ exitCode: 1, stdout: '', stderr: '' })
    const bridge = new TailscaleBridge({}, spawn)
    expect(await bridge.isAvailable()).toBe(false)
  })

  test('isAvailable returns false on spawn error', async () => {
    const spawn: SpawnFn = async () => { throw new Error('bang') }
    const bridge = new TailscaleBridge({}, spawn)
    expect(await bridge.isAvailable()).toBe(false)
  })

  test('getStatus parses CLI output correctly', async () => {
    const bridge = new TailscaleBridge(
      {},
      mockSpawn({
        'status --json': { exitCode: 0, stdout: MOCK_STATUS_JSON, stderr: '' },
      }),
    )

    const result = await bridge.getStatus()
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.backendState).toBe('Running')
    expect(result.value.version).toBe('1.56.0')
    expect(result.value.self.hostname).toBe('imperium-master')
    expect(result.value.self.ipv4).toBe('100.64.0.1')
    expect(result.value.self.ipv6).toBe('fd7a:115c:a1e0::1')
    expect(result.value.self.tailnet).toBe('tail1234.ts.net')
    expect(result.value.self.online).toBe(true)
  })

  test('getStatus parses peers', async () => {
    const bridge = new TailscaleBridge(
      {},
      mockSpawn({
        'status --json': { exitCode: 0, stdout: MOCK_STATUS_JSON, stderr: '' },
      }),
    )

    const result = await bridge.getStatus()
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.peers).toHaveLength(2)

    const peer1 = result.value.peers.find((p) => p.hostname === 'satellite-1')
    expect(peer1).toBeDefined()
    expect(peer1!.ipv4).toBe('100.64.0.2')
    expect(peer1!.ipv6).toBe('fd7a:115c:a1e0::2')
    expect(peer1!.os).toBe('macOS')
    expect(peer1!.online).toBe(true)
    expect(peer1!.tags).toEqual(['tag:server'])

    const peer2 = result.value.peers.find((p) => p.hostname === 'satellite-2')
    expect(peer2).toBeDefined()
    expect(peer2!.online).toBe(false)
    expect(peer2!.ipv6).toBeUndefined()
    expect(peer2!.tags).toBeUndefined()
  })

  test('getStatus returns error on non-zero exit', async () => {
    const bridge = new TailscaleBridge(
      {},
      mockSpawn({
        'status --json': { exitCode: 1, stdout: '', stderr: 'not logged in' },
      }),
    )

    const result = await bridge.getStatus()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('not logged in')
  })

  test('getStatus returns error on JSON parse failure', async () => {
    const bridge = new TailscaleBridge(
      {},
      mockSpawn({
        'status --json': { exitCode: 0, stdout: 'not json', stderr: '' },
      }),
    )

    const result = await bridge.getStatus()
    expect(result.ok).toBe(false)
  })

  test('listPeers returns peers array', async () => {
    const bridge = new TailscaleBridge(
      {},
      mockSpawn({
        'status --json': { exitCode: 0, stdout: MOCK_STATUS_JSON, stderr: '' },
      }),
    )

    const result = await bridge.listPeers()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toHaveLength(2)
  })

  test('up succeeds on zero exit code', async () => {
    const bridge = new TailscaleBridge(
      {},
      mockSpawn({
        'tailscale up': { exitCode: 0, stdout: '', stderr: '' },
      }),
    )

    const result = await bridge.up()
    expect(result.ok).toBe(true)
  })

  test('up returns error on non-zero exit', async () => {
    const bridge = new TailscaleBridge(
      {},
      mockSpawn({
        'tailscale up': { exitCode: 1, stdout: '', stderr: 'auth needed' },
      }),
    )

    const result = await bridge.up()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('auth needed')
  })

  test('down succeeds on zero exit code', async () => {
    const bridge = new TailscaleBridge(
      {},
      mockSpawn({
        'tailscale down': { exitCode: 0, stdout: '', stderr: '' },
      }),
    )

    const result = await bridge.down()
    expect(result.ok).toBe(true)
  })

  test('down returns error on non-zero exit', async () => {
    const bridge = new TailscaleBridge(
      {},
      mockSpawn({
        'tailscale down': { exitCode: 1, stdout: '', stderr: 'already down' },
      }),
    )

    const result = await bridge.down()
    expect(result.ok).toBe(false)
  })

  test('ping parses latency from output', async () => {
    const bridge = new TailscaleBridge(
      {},
      mockSpawn({
        'tailscale ping': {
          exitCode: 0,
          stdout: 'pong from satellite-1 (100.64.0.2) via DERP(nyc) in 12.5ms',
          stderr: '',
        },
      }),
    )

    const result = await bridge.ping('satellite-1')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.latencyMs).toBe(12.5)
  })

  test('ping returns error on failure', async () => {
    const bridge = new TailscaleBridge(
      {},
      mockSpawn({
        'tailscale ping': { exitCode: 1, stdout: '', stderr: 'timeout' },
      }),
    )

    const result = await bridge.ping('unknown-host')
    expect(result.ok).toBe(false)
  })

  test('custom binary config', async () => {
    const cmds: string[][] = []
    const spawn: SpawnFn = async (cmd) => {
      cmds.push(cmd)
      return { exitCode: 0, stdout: '/custom/tailscale', stderr: '' }
    }

    const bridge = new TailscaleBridge({ binary: '/custom/tailscale' }, spawn)
    await bridge.isAvailable()
    await bridge.up()

    // isAvailable uses 'which'
    expect(cmds[0]).toEqual(['which', '/custom/tailscale'])
    // up uses the binary directly
    expect(cmds[1]).toEqual(['/custom/tailscale', 'up'])
  })

  test('getStatus handles empty peers', async () => {
    const emptyStatus = JSON.stringify({
      BackendState: 'Running',
      Version: '1.56.0',
      Self: {
        HostName: 'solo-node',
        TailscaleIPs: ['100.64.0.1'],
        Online: true,
      },
      MagicDNSSuffix: 'example.ts.net',
    })

    const bridge = new TailscaleBridge(
      {},
      mockSpawn({
        'status --json': { exitCode: 0, stdout: emptyStatus, stderr: '' },
      }),
    )

    const result = await bridge.getStatus()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.peers).toHaveLength(0)
    expect(result.value.self.hostname).toBe('solo-node')
  })

  test('getStatus handles missing Self', async () => {
    const minimalStatus = JSON.stringify({
      BackendState: 'Stopped',
      Version: '1.56.0',
    })

    const bridge = new TailscaleBridge(
      {},
      mockSpawn({
        'status --json': { exitCode: 0, stdout: minimalStatus, stderr: '' },
      }),
    )

    const result = await bridge.getStatus()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.backendState).toBe('Stopped')
    expect(result.value.self.hostname).toBe('unknown')
    expect(result.value.peers).toHaveLength(0)
  })
})
