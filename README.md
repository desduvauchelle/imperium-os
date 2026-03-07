# Imperium OS

**Imperium** is a multi-platform, agentic operating system built using a monorepo architecture. It is designed to operate across desktop (primary macOS-focused master node), web, and mobile platforms (satellites) with a headless core and shared UI components. Bun is the primary runtime, package manager, and test runner.

---

## 🚀 High-Level Goals

- **Agentic Brain**: A modular core that handles reasoning, tool-calling, and chaining logic.
- **Context Awareness**: Assembles context via RAG (retrieval-augmented generation), file tree analysis, and summarization.
- **Cross-Platform UI**: Shared component library for Electron, Web, and future mobile interfaces.
- **Safe Command Execution**: Profiles (Mad Max, Praetorian, Imperator) govern tool usage and guardrails.
- **Hierarchical Memory**: Token-optimized memory snapshots, sliding windows, and local SQL archives.
- **Robust Onboarding**: Auto-detects/installs CLI dependencies and handles authentication flows.
- **macOS Integration**: Power management, non-blocking suspensions, and system persistence.
- **Secure Multi-User Sync**: Tailscale-based P2P collaboration with offline detection.

---

## 🛠 Monorepo Structure

```
/imperium-root
├── /packages
│   ├── /core               # The "Brain" (Framework Agnostic, Bun-native)
│   │   ├── /engine         # Reasoning, Tool-Calling, Chaining logic
│   │   ├── /context        # Context Assembly (RAG + File Tree + Summarization)
│   │   ├── /notifications  # WebSocket Server (Master-to-Satellite)
│   │   ├── /onboarding     # CLI Dependency & Auth Checkers
│   │   ├── /permissions    # Guardrail & Whitelist logic for MCPs
│   │   ├── /os-power       # macOS Power Management (Caffeinate/Sleep prevention)
│   │   └── /costing        # Usage tracking & pricing engine
│   ├── /mcp-internal       # Native MCP Servers
│   │   ├── /media          # Image Gen (DALL-E, Imagen, Local SD)
│   │   ├── /comm           # Discord, Telegram, WhatsApp, Email
│   │   └── /fs             # MCP-compliant File System operations (with Locking)
│   ├── /ui-shared          # shadcn/ui components + Tailwind (Themed)
│   └── /shared-types       # Source of Truth for TS Interfaces
├── /apps
│   ├── /electron           # Main process & Desktop-specific IPC
│   ├── /web                # Next.js/Vite (Planned Satellite Interface)
│   └── /mobile             # Capacitor wrapper (Planned Satellite Interface)
└── /projects               # Local-first storage (JSON/Markdown)
```

---

## 🔄 Development Roadmap

1. **Phase 1: Foundation.** Monorepo setup with Bun, shared theme, and strict TS interfaces.
2. **Phase 2: Core & Context.** Context Assembly Layer, CLI Onboarding, and hierarchical Memory Snapshotting.
3. **Phase 3: Permissions & OS Logic.** Implement profile guardrails, macOS sleep prevention, and suspension logic.
4. **Phase 4: Internal MCPs.** MCP-FS with locking and MCP-Comm for social integrations.
5. **Phase 5: Networking & Desktop UI.** Tailscale P2P, interactive Kanban, and the Costing Dashboard.
6. **Phase 6: Satellite Expansion.** Web/Mobile interfaces connecting to the Master Desktop.

---

## 📦 Getting Started

1. Ensure [Bun](https://bun.sh) is installed and on your PATH.
2. Clone the repository and run `bun install` at the root.
3. Use `bun run` in package directories or the root with Turborepo commands (`turbo run dev`, `turbo run test`, etc.).

---

## 📝 Notes

- The project is tailored for macOS-first development but architectures for cross-platform support.
- Configuration and build scripts rely on Bun; adapt if switching runtime.

---

## 📄 License

Specify license information here (e.g., MIT).
