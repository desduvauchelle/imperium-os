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

## Quick Start

To install all dependencies, build the workspace, and run the Electron app in development mode, simply run:

```bash
git clone https://github.com/your-org/imperium-os.git
cd imperium-os
bun run start
```

---

## Install

```bash
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
bun run --cwd apps/electron build    # Electron renderer (Vite)
bun run --cwd apps/web      build    # Web SPA (Vite)
bun run --cwd apps/mobile   build    # Mobile web bundle (Vite)
```

---

## Run — Development

### Desktop (Electron Master)

The recommended way is to use `bun run start` for the first run, or `bun run dev` for subsequent sessions with Hot Module Replacement (HMR).

Alternatively, you can run the renderer and main process separately:

Open two terminals:

```bash
# Terminal 1 — Vite renderer dev server (HMR on http://localhost:5173)
bun run --cwd apps/electron dev

# Terminal 2 — Electron main process (loads the renderer)
bun run --cwd apps/electron electron:dev
```

### Web Satellite

```bash
bun run --cwd apps/web dev          # http://localhost:5174
```

On first load the app shows a **"Connect to Master"** modal. Enter the Master's IP (e.g. `http://192.168.1.x:9100`) and the shared token shown in the Electron **Satellite Settings** panel.

### Mobile Satellite (Capacitor)

```bash
# Build the web bundle first
bun run --cwd apps/mobile build

# Sync to native projects
bun run --cwd apps/mobile cap:sync

# Run on device / simulator
bun run --cwd apps/mobile cap:run:ios
bun run --cwd apps/mobile cap:run:android
```

---

## Test

```bash
# All packages and apps (parallel, via Turborepo)
bun run test

# Single package
bun run --cwd packages/core/notifications test
bun run --cwd apps/electron               test
bun run --cwd apps/web                    test
bun run --cwd apps/mobile                 test
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
bun run --cwd apps/electron electron:build
```

| Platform | Output |
|----------|--------|
| macOS | `.dmg` (installer) + `.zip` (auto-update) |
| Windows | `.exe` NSIS installer |
| Linux | `.AppImage` |

> **Code signing:** Set `CSC_LINK` / `CSC_KEY_PASSWORD` (macOS) or `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` (Windows) environment variables before building. See [electron-builder code signing docs](https://www.electron.build/code-signing).

---

## Distributing the App

Once you have built the application using the packaging command above, you can find the distributables in the `apps/electron/release` folder.
You can send the `.dmg` (for macOS) or `.exe` (for Windows) to users for installation.

## Installation & Troubleshooting

Because the application might be unsigned by default, users installing the app might encounter OS-level security warnings.

### macOS Gatekeeper Warning

When attempting to open an unsigned `.app` on macOS, it may display a warning that the app is damaged or from an unidentified developer.

**To bypass this:**
1. Right-click (or Control-click) the application in Finder.
2. Select **Open**.
3. In the dialog that appears, click **Open** again.

Alternatively, if Gatekeeper completely blocks it with a "damaged" error, the user can remove the quarantine attribute via terminal:

```bash
xattr -cr /Applications/Imperium.app
```
(Adjust the path if the app is placed elsewhere).

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
