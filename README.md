# Imperium OS

**Imperium** is a multi-platform, agentic operating system built as a Turborepo monorepo. The **Master** node runs on macOS as an Electron desktop app and exposes a REST + WebSocket gateway (the **Satellite Server**) on port `9100`. **Satellite** clients — a Vite SPA and a Capacitor mobile app — connect to the Master over the local network or via Tailscale.

[![CI](https://github.com/your-org/imperium-os/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/imperium-os/actions/workflows/ci.yml)
[![Release](https://github.com/your-org/imperium-os/actions/workflows/release.yml/badge.svg)](https://github.com/your-org/imperium-os/actions/workflows/release.yml)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Bun](https://bun.sh) | ≥ 1.2.0 | Runtime, package manager, test runner |
| [Node.js](https://nodejs.org) | ≥ 20.0.0 | Required by Electron and some build tools |
| [Xcode](https://developer.apple.com/xcode/) | latest | macOS/iOS builds (macOS only) |
| [Android Studio](https://developer.android.com/studio) | latest | Android builds (optional) |

Install Bun if you don't have it:

```bash
curl -fsSL https://bun.sh/install | bash
```

---

## Install

```bash
git clone https://github.com/your-org/imperium-os.git
cd imperium-os
bun install
```

This installs all workspace dependencies in one pass via Bun's workspace resolver.

---

## Build

Build every package and app (respects Turborepo dependency order):

```bash
bun run build
```

Build a single app:

```bash
bun --cwd apps/electron run build    # Electron renderer (Vite)
bun --cwd apps/web      run build    # Web SPA (Vite)
bun --cwd apps/mobile   run build    # Mobile web bundle (Vite)
```

---

## Run — Development

### Desktop (Electron Master)

Open two terminals:

```bash
# Terminal 1 — Vite renderer dev server (HMR on http://localhost:5173)
bun --cwd apps/electron run dev

# Terminal 2 — Electron main process (loads the renderer)
bun --cwd apps/electron run electron:dev
```

### Web Satellite

```bash
bun --cwd apps/web run dev          # http://localhost:5174
```

On first load the app shows a **"Connect to Master"** modal. Enter the Master's IP (e.g. `http://192.168.1.x:9100`) and the shared token shown in the Electron **Satellite Settings** panel.

### Mobile Satellite (Capacitor)

```bash
# Build the web bundle first
bun --cwd apps/mobile run build

# Sync to native projects
bun --cwd apps/mobile run cap:sync

# Run on device / simulator
bun --cwd apps/mobile run cap:run:ios
bun --cwd apps/mobile run cap:run:android
```

---

## Test

```bash
# All packages and apps (parallel, via Turborepo)
bun run test

# Single package
bun --cwd packages/core/notifications bun test
bun --cwd apps/electron               run test
bun --cwd apps/web                    run test
bun --cwd apps/mobile                 run test
```

---

## Typecheck & Lint

```bash
bun run typecheck   # tsc --noEmit across all packages
bun run lint        # Biome check across all packages
```

---

## Package (Desktop Release Build)

Produces a signed/unsigned distributable in `apps/electron/release/`:

```bash
bun --cwd apps/electron run electron:build
```

| Platform | Output |
|----------|--------|
| macOS | `.dmg` (installer) + `.zip` (auto-update) |
| Windows | `.exe` NSIS installer |
| Linux | `.AppImage` |

> **Code signing:** Set `CSC_LINK` / `CSC_KEY_PASSWORD` (macOS) or `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` (Windows) environment variables before building. See [electron-builder code signing docs](https://www.electron.build/code-signing).

---

## Monorepo Structure

```
/imperium-os
├── apps/
│   ├── electron/          # Master — Electron desktop app + SatelliteServer
│   ├── web/               # Satellite — Vite SPA (port 5174)
│   └── mobile/            # Satellite — Capacitor iOS/Android wrapper
├── packages/
│   ├── core/
│   │   ├── engine/        # Reasoning, tool-calling, agent state machine
│   │   ├── context/       # RAG + file tree + memory snapshots
│   │   ├── notifications/ # SatelliteServer (REST + WebSocket, port 9100)
│   │   ├── onboarding/    # CLI dependency & auth checkers
│   │   ├── permissions/   # Mad Max / Praetorian / Imperator profiles
│   │   ├── os-power/      # macOS caffeinate / sleep prevention
│   │   ├── costing/       # Usage tracking & pricing engine
│   │   ├── tailscale/     # Tailscale CLI bridge
│   │   └── satellite-client/ # Browser-safe SatelliteClient (fetch + WS)
│   ├── mcp-internal/
│   │   ├── media/         # Image generation (DALL-E, Imagen, Stable Diffusion)
│   │   ├── comm/          # Discord, Telegram, WhatsApp, Email
│   │   └── fs/            # MCP-compliant file system with locking
│   ├── ui-shared/         # shadcn/ui components + Tailwind + SatelliteProvider
│   └── shared-types/      # Single source of truth for all TypeScript interfaces
└── projects/              # Local-first storage (JSON / Markdown)
```

---

## Satellite Server

The Master exposes an HTTP + WebSocket gateway at `http://<master-ip>:9100`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | `GET` | Liveness probe — returns `{ ok: true, version, uptime }` |
| `/api/:channel` | `POST` | Invoke any allowed IPC channel; body `{ payload }`, header `x-imperium-token` |
| `/ws?token=<token>` | `WS` | Push channel — receives `SatellitePushEvent` broadcasts |

Token management lives in **Electron → Satellite Settings panel**: view the current token, rotate it at any time.

---

## Development Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ | Foundation — monorepo, shared theme, strict TypeScript |
| 2 | ✅ | Core & Context — context assembly, CLI onboarding, memory snapshots |
| 3 | ✅ | Permissions & OS Logic — guardrail profiles, macOS sleep prevention, suspension |
| 4 | ✅ | Internal MCPs — MCP-FS locking, MCP-Comm social integrations |
| 5 | ✅ | Networking & Desktop UI — Tailscale, Kanban, Costing Dashboard |
| 6 | ✅ | Satellite Expansion — Web/Mobile clients, REST + WebSocket gateway |

---

## License

MIT
