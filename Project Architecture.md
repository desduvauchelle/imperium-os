# **Imperium: Multi-Platform Agentic OS**

## **1\. High-Level Architecture**

To support Electron, Web, and Mobile, **Imperium** uses a **Monorepo (Turborepo)** strategy. The logic is decoupled into a headless core, while the UI is built with a shared component library. **Bun** is used as the primary runtime, package manager, and test runner across all packages.

* **Desktop (Imperium Master):** The primary node where the Brain, MCPs, and CLIs reside. Optimized for **macOS-first** deployment.
* **Web/Mobile (Imperium Satellite):** Future-proof remote interfaces that connect back to the Master node via the API/Tailscale bridge. (Mobile is post-MVP).

## **2\. Monorepo Structure (TypeScript Strict \+ Bun)**

/imperium-root
├── /packages
│   ├── /core               \# The "Brain" (Framework Agnostic, Bun-native)
│   │   ├── /engine         \# Reasoning, Tool-Calling, Chaining logic
│   │   ├── /context        \# Context Assembly (RAG \+ File Tree \+ Summarization)
│   │   ├── /notifications  \# WebSocket Server (Master-to-Satellite)
│   │   ├── /onboarding     \# CLI Dependency & Auth Checkers
│   │   ├── /permissions    \# Guardrail & Whitelist logic for MCPs
│   │   ├── /os-power       \# macOS Power Management (Caffeinate/Sleep prevention)
│   │   └── /costing        \# Usage tracking & pricing engine
│   ├── /mcp-internal       \# Native MCP Servers
│   │   ├── /media          \# Image Gen (DALL-E, Imagen, Local SD)
│   │   ├── /comm           \# Discord, Telegram, WhatsApp, Email
│   │   └── /fs             \# MCP-compliant File System operations (with Locking)
│   ├── /ui-shared          \# shadcn/ui components \+ Tailwind (Themed)
│   └── /shared-types       \# Source of Truth for TS Interfaces
├── /apps
│   ├── /electron           \# Main process & Desktop-specific IPC
│   ├── /web                \# Next.js/Vite (Planned Satellite Interface)
│   └── /mobile             \# Capacitor wrapper (Planned Satellite Interface)
└── /projects               \# Local-first storage (JSON/Markdown)
├── bun.lockb               \# Bun lockfile
└── turbo.json

## **3\. CLI Bridge & Onboarding Loop**

Imperium interacts with provider CLIs via a terminal process (spawn).

* **Auto-Onboarding:** Upon launch, the app scans for required CLIs (Gemini, Anthropic, etc.). If missing, it triggers an auto-install script and prompts for auth.
* **CLI Interaction Logic:** Decision-making is governed by the **Comfort Level Profiles**:
  * **Mad Max (Allow All):** No restrictions. The AI operates with total freedom. No safety prompts or verification required.
  * **Praetorian (Restricted/Verified):** The balanced "Safeguarding" rank. Tools are verified before execution; valuable data operations require implicit "trusted" status.
  * **Imperator (Ultimate Lockdown):** Total authority over every bit. Orders are absolute, but execution is under strict lock and key. No high-risk action occurs without explicit manual authorization.
* **Auth Handling:** For browser-based OAuth, the Master node pipes the Auth URL to the active UI.

## **4\. Context Assembly & Memory Management**

To maintain awareness while being extremely mindful of token optimization:

* **Hierarchical Memory:** \* **SQL Archive:** Full, raw chat history is stored locally in SQLite for long-term reference.
  * **Context Snapshots:** When a chat exceeds X tokens, it is summarized into a "Memory Block" stored in /projects/\[project-id\]/memory.
  * **Sliding Window:** Only the last 7–10 raw messages are kept in the active LLM context, supplemented by the relevant Memory Blocks.
* **The "Map" Strategy:** The AI is provided with a 3-level deep file tree skeleton to understand the project structure before requesting specific file contents.

## **5\. Async Suspension & macOS Persistence**

* **Non-Blocking Interrupts:** If an agent requires high-risk action, it enters a SUSPENDED state with a sound-enabled Toast notification.
* **macOS "Caffeinated" Mode:** \* Built-in option to prevent the Mac from sleeping while Imperium is active (even if the screen is off).
  * Automatically restarts on system reboot to ensure background agents (cron jobs) stay alive.
* **Context Preservation:** Agent state is serialized to the project folder, allowing for resumption even after app restarts.

## **6\. Project Queuing & File Locking**

* **Exclusive Access:** The MCP-FS includes a locking mechanism to prevent human-AI file conflicts.
* **Task Queuing:** Direct chat requests for file changes are converted into Kanban tasks.
* **Status Updates:** Agents post real-time comments and emoji reactions (✅, 🏗️) to task cards.

## **7\. Visual Interface & Theming**

* **Universal Theme Engine:** Support for **Light**, **Dark**, and **System/Auto** theme switching from the initial launch.
* **Costing Dashboard:** Visual usage bar showing current model spend vs. rate limits.
* **Discreet Tags:** Every interaction displays a subtle label with model name and calculated cost (e.g., Claude 3.5 • $0.002).

## **8\. Multi-User & Tailscale P2P Sync**

* **Secure Co-working:** Securely invite others to project folders via Tailscale. Configurable in the config and users can easily add
* **Connectivity:** Satellites show a "Master Offline" state if the primary Imperium node is unavailable.

## **9\. Development Roadmap**

* **Phase 1: Foundation.** Monorepo setup with **Bun**, shared **shadcn** theme (Light/Dark/Auto), and strict TS interfaces.
* **Phase 2: Core & Context.** Context Assembly Layer, CLI Onboarding, and hierarchical Memory Snapshotting.
* **Phase 3: Permissions & OS Logic.** Implementation of the **Mad Max/Praetorian/Imperator** profile logic, macOS Sleep prevention, and SUSPENDED state logic.
* **Phase 4: Internal MCPs.** MCP-FS with Locking and MCP-Comm for social integrations.
* **Phase 5: Networking & Desktop UI.** Tailscale P2P, interactive Kanban, and the Costing Dashboard.
* **Phase 6: Satellite Expansion (Post-MVP).** Web/Mobile interfaces connecting to the Master Desktop.
