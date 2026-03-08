import type {
	Result,
	TailscaleBackendState,
	TailscalePeer,
	TailscaleSelf,
	TailscaleStatus,
} from "@imperium/shared-types";
import { err, ok } from "@imperium/shared-types";

// ============================================================================
// Tailscale Bridge — P2P networking via CLI spawn
// ============================================================================

/** Injectable spawn function for testing */
export type SpawnFn = (
	cmd: string[],
) => Promise<{ exitCode: number; stdout: string; stderr: string }>;

/** Default spawn using Bun.spawn */
async function defaultSpawn(
	cmd: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	const exitCode = await proc.exited;
	return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
}

export interface TailscaleBridgeConfig {
	readonly binary: string;
}

export const DEFAULT_TAILSCALE_CONFIG: TailscaleBridgeConfig = {
	binary: "tailscale",
};

/**
 * Raw status JSON shape from `tailscale status --json`.
 * Only the subset of fields we care about.
 */
interface RawTailscaleStatus {
	readonly BackendState?: string;
	readonly Version?: string;
	readonly Self?: {
		readonly HostName?: string;
		readonly TailscaleIPs?: readonly string[];
		readonly Online?: boolean;
		readonly DNSName?: string;
	};
	readonly Peer?: Readonly<
		Record<
			string,
			{
				readonly ID?: string;
				readonly HostName?: string;
				readonly TailscaleIPs?: readonly string[];
				readonly OS?: string;
				readonly Online?: boolean;
				readonly LastSeen?: string;
				readonly ExitNode?: boolean;
				readonly Tags?: readonly string[];
			}
		>
	>;
	readonly MagicDNSSuffix?: string;
}

export class TailscaleBridge {
	readonly config: TailscaleBridgeConfig;
	private readonly spawn: SpawnFn;

	constructor(config: Partial<TailscaleBridgeConfig> = {}, spawn?: SpawnFn) {
		this.config = { ...DEFAULT_TAILSCALE_CONFIG, ...config };
		this.spawn = spawn ?? defaultSpawn;
	}

	/** Check if tailscale CLI is available */
	async isAvailable(): Promise<boolean> {
		try {
			const result = await this.spawn(["which", this.config.binary]);
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	/** Get current Tailscale status */
	async getStatus(): Promise<Result<TailscaleStatus>> {
		try {
			const result = await this.spawn([this.config.binary, "status", "--json"]);
			if (result.exitCode !== 0) {
				return err(new Error(`tailscale status failed: ${result.stderr}`));
			}

			const raw = JSON.parse(result.stdout) as RawTailscaleStatus;
			return ok(parseStatus(raw));
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to get tailscale status: ${String(error)}`),
			);
		}
	}

	/** List all peers */
	async listPeers(): Promise<Result<readonly TailscalePeer[]>> {
		const statusResult = await this.getStatus();
		if (!statusResult.ok) return statusResult;

		return ok(statusResult.value.peers);
	}

	/** Bring Tailscale up (connect) */
	async up(): Promise<Result<void>> {
		try {
			const result = await this.spawn([this.config.binary, "up"]);
			if (result.exitCode !== 0) {
				return err(new Error(`tailscale up failed: ${result.stderr}`));
			}
			return ok(undefined);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to start tailscale: ${String(error)}`),
			);
		}
	}

	/** Bring Tailscale down (disconnect) */
	async down(): Promise<Result<void>> {
		try {
			const result = await this.spawn([this.config.binary, "down"]);
			if (result.exitCode !== 0) {
				return err(new Error(`tailscale down failed: ${result.stderr}`));
			}
			return ok(undefined);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to stop tailscale: ${String(error)}`),
			);
		}
	}

	/** Ping a peer by hostname or IP */
	async ping(target: string): Promise<Result<{ latencyMs: number }>> {
		try {
			const result = await this.spawn([
				this.config.binary,
				"ping",
				"--c",
				"1",
				target,
			]);
			if (result.exitCode !== 0) {
				return err(new Error(`tailscale ping failed: ${result.stderr}`));
			}

			// Parse latency from output like "pong from ... in 12ms via ..."
			const match = /in (\d+(?:\.\d+)?)ms/.exec(result.stdout);
			const latencyMs = match ? Number.parseFloat(match[1] ?? "0") : 0;
			return ok({ latencyMs });
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to ping: ${String(error)}`),
			);
		}
	}
}

// ============================================================================
// Parsing Helpers
// ============================================================================

function parseStatus(raw: RawTailscaleStatus): TailscaleStatus {
	const selfIps = raw.Self?.TailscaleIPs ?? [];
	const tailnet = raw.MagicDNSSuffix ?? "";

	const self: TailscaleSelf = {
		hostname: raw.Self?.HostName ?? "unknown",
		ipv4: (selfIps[0] as string | undefined) ?? "",
		...(selfIps[1] ? { ipv6: selfIps[1] } : {}),
		tailnet,
		online: raw.Self?.Online ?? false,
	};

	const peers: TailscalePeer[] = [];
	if (raw.Peer) {
		for (const [id, peer] of Object.entries(raw.Peer)) {
			const peerIps = peer.TailscaleIPs ?? [];
			peers.push({
				id,
				hostname: peer.HostName ?? "unknown",
				ipv4: (peerIps[0] as string | undefined) ?? "",
				...(peerIps[1] ? { ipv6: peerIps[1] } : {}),
				os: peer.OS ?? "unknown",
				online: peer.Online ?? false,
				...(peer.LastSeen ? { lastSeen: peer.LastSeen } : {}),
				exitNode: peer.ExitNode ?? false,
				...(peer.Tags && peer.Tags.length > 0 ? { tags: peer.Tags } : {}),
			});
		}
	}

	return {
		backendState: (raw.BackendState ?? "NoState") as TailscaleBackendState,
		self,
		peers,
		version: raw.Version ?? "unknown",
	};
}
