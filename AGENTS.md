# VPP — Video Generation Management System

> Manage hyperframes video production at scale — channels, episodes, blocks, agent-driven generation, preview, and rendering.

## Package Manager

**Use `pnpm`, not `npm`.** All frontend deps, installs, scripts use pnpm. Orchestrator uses bun.

## Starting Point

**`plans/README.md`** — Master index for all implementation phase subplans. Read this first, then drill into the relevant phase plan.

**`PROJECT_PLAN.md`** — Full system architecture, database schema, pipeline design, technical decisions. Reference for context.

## Project Structure

```
vpp/
├── PROJECT_PLAN.md          # Master architecture document
├── plans/
│   ├── README.md            # ← START HERE — phase index + dependency graph
│   ├── phase-1-foundation.md
│   ├── phase-2-research-personality-tts.md
│   ├── phase-3-media-blocks-quality.md
│   ├── phase-4-preview-feedback-templates.md
│   ├── phase-5-render-storage-schedule.md
│   ├── phase-6-polish.md
│   └── phase-7-social-distribution.md
├── pb/                      # PocketBase binary + data
├── orchestrator/            # Node.js/Bun backend service
├── frontend/                # React + Vite + Tailwind v3 + shadcn/ui
├── compositions/            # hyperframes compositions (per channel/episode)
└── renders/                 # rendered MP4 output
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend / DB** | PocketBase 0.38.0 |
| **Frontend** | React + Vite (client-side only, no SSR) |
| **Styling** | Tailwind CSS v3 |
| **UI Components** | shadcn/ui |
| **Video Engine** | hyperframes + ffmpeg + chrome-headless-shell |
| **AI Agent** | pi SDK (`@earendil-works/pi-coding-agent`) |
| **Storage** | PocketBase file fields → R2-backed |
| **Hosting** | Ubuntu VPS |

## PocketBase Local Docs

PocketBase session docs available here for reference:

```
/Users/markb/dev/pb-llm/docs/session_2026-05-08_07-25-51.770/
```

Key files:
- `pocketbase_docs_core.md` — core PocketBase API, collections, auth, hooks
- `summary_core.txt` — summary of PB capabilities and patterns

Use these docs when working on PocketBase collection setup, access rules, auth, file storage, or API integration.

## Phase Order

Phases are strictly sequential — each builds on the previous:

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 (future)
```

Do not skip phases. Acceptance criteria must be met before moving to the next phase.

## Key Constraints

- **Queue-based** — one generation, one preview, one render at a time
- **Client-side frontend** — no SSR, no server-side rendering code
- **PocketBase only backend** — all data in PB collections, orchestrator is a service layer
- **pi SDK** — use `@earendil-works/pi-coding-agent` directly, not subprocess/RPC
- **HyperFrames** — use built-in TTS (`npx hyperframes tts`), not external TTS APIs
