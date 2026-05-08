# Phase 1 — Foundation

> **Goal:** PocketBase database, React frontend scaffold, basic CRUD for all core collections, auth, R2 storage config.

**Dependencies:** None (first phase)

**Estimated effort:** 3-5 days

---

## 1.1 PocketBase Setup

### Tasks
- [x] Download PocketBase 0.38.0 binary to `pb/` directory
- [x] Initialize PB data directory (`pb/pb_data/`)
- [ ] Configure R2 as S3 storage backend in PB settings _(manual — needs R2 credentials)_
- [x] Set admin credentials (env vars: `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`)
- [x] Create PocketBase migration script or seed file for all collections

### Collections to create

#### `channels`
```
name (text, required, unique)
slug (text, required, unique, auto-generated from name)
description (text)
style_dna (json, required) — default: see PROJECT_PLAN.md style_dna spec
intro_video (file)
outro_video (file)
system_prompt (text, required)
status (select: active/paused/archived, default: active)
episode_count (number, default: 0)
schedule (text, nullable)
schedule_enabled (bool, default: false)
schedule_template (relation → episode_templates, nullable)
schedule_auto_advance (bool, default: false)
```

#### `episodes`
```
channel (relation → channels, required)
title (text, required)
slug (text, required, auto-generated)
number (number, nullable)
topic (text)
status (select: draft/generating/preview/reviewing/rendering/complete/failed, default: draft)
composition_path (text)
preview_url (text)
block_count (number, default: 0)
total_duration (number, default: 0)
feedback_log (json, default: [])
video_file (file)
video_url (text)
thumbnail (file)
metadata (json, default: {})
```

#### `blocks`
```
episode (relation → episodes, required)
block_type (select: intro/title/content/lower_third/transition/outro/caption, required)
order (number, required)
script (text)
composition_src (text)
start_time (number)
duration (number)
track_index (number)
variables (json, default: {})
assets (json, default: {})
status (select: pending/generated/approved/needs_revision, default: pending)
```

#### `personalities`
```
name (text, required, unique)
slug (text, required, unique, auto-generated)
description (text)
voice_profile (json, required)
training_sources (json, default: [])
system_prompt (text, required)
sample_output (text)
status (select: active/draft/archived, default: draft)
```

#### `research_results`
```
episode (relation → episodes, required)
query (text, required)
results (json, required)
summary (text)
sources (json, default: [])
status (select: pending/in_progress/complete/failed, default: pending)
```

#### `scripts`
```
episode (relation → episodes, required)
personality (relation → personalities, nullable)
research (relation → research_results, nullable)
content (text, required)
segments (json, required)
word_count (number)
estimated_duration (number)
status (select: draft/generated/approved/needs_revision, default: draft)
revision_notes (text)
```

#### `media_library`
```
name (text, required, unique)
slug (text, required, unique, auto-generated)
media_type (select: image/video/audio/music/sfx/font/graphic, required)
category (text)
tags (json, default: [])
file (file, required)
file_url (text)
duration (number)
dimensions (json)
license (text)
usage_count (number, default: 0)
description (text)
```

#### `episode_templates`
```
name (text, required)
slug (text, required, unique, auto-generated)
channel (relation → channels, required)
source_episode (relation → episodes, nullable)
description (text)
block_structure (json, required)
composition_files (json, required)
default_personality (relation → personalities, nullable)
default_research_depth (json, nullable)
default_duration (number)
variables (json, default: {})
usage_count (number, default: 0)
status (select: active/archived, default: active)
```

### Access rules (PB)
- All collections: authenticated users can CRUD
- Public read: none (behind auth)
- API token for orchestrator server-side access

### Deliverables
- PB running on `localhost:8090`
- All 8 collections created with correct schema
- R2 storage configured
- Seed data: 1 sample channel, 1 sample personality, 2 sample media items

---

## 1.2 Frontend Scaffold

### Tasks
- [x] `pnpm create vite@latest frontend -- --template react-ts`
- [x] Install dependencies:
  - `tailwindcss@3 postcss autoprefixer`
  - `@radix-ui/*` (shadcn/ui base)
  - `clsx tailwind-merge`
  - `pocketbase` (JS SDK)
  - `react-router-dom`
  - `lucide-react` (icons)
  - `class-variance-authority`
- [x] Initialize Tailwind config (`npx tailwindcss init -p`)
- [x] Initialize shadcn/ui components (Button, Input, Textarea, Badge, Card, Dialog, Select, Label, Table)
- [x] Set up React Router with route structure
- [x] Create PB client wrapper (`frontend/src/lib/pocketbase.ts`)
- [x] Create auth context/provider
- [x] Set up layout shell (sidebar + main content area)
- [x] Add basic navigation

### Route structure
```
/                          → Dashboard (placeholder)
/channels                  → ChannelList
/channels/:slug            → ChannelDetail
/channels/:slug/schedule   → ChannelSchedule (stub)
/channels/:slug/templates  → ChannelTemplates (stub)
/channels/:slug/new        → NewEpisode (stub)
/episodes/:id              → EpisodeWorkspace (stub)
/personalities             → PersonalityList (stub)
/media-library             → MediaLibrary (stub)
/settings                  → Settings (stub)
```

### Deliverables
- Vite dev server running on `localhost:5173`
- Tailwind v3 configured and working
- shadcn/ui base components available
- PB SDK integrated with auth flow
- Navigation sidebar with all routes (most pages are stubs)

---

## 1.3 Basic CRUD UIs

### Channel CRUD
- [x] Channel list page — table with name, status, episode count
- [x] Create channel form — name, description, system_prompt, StyleDNAEditor
- [x] Edit channel — same form, pre-filled
- [x] Archive/unarchive toggle
- [x] Style DNA editor — structured form (StyleDNAEditor component)

### Episode CRUD
- [x] Episode list (within channel detail) — table with title, status, number
- [x] Episode workspace — shows status badge, metadata, pipeline stepper
- [x] Status badge component with color coding

### Block CRUD
- [x] Block list within episode workspace — ordered table
- [x] Create block form — type selector, order, script textarea
- [x] Edit block via dialog
- [x] Reorder blocks (up/down arrows)

### Personality CRUD (stub)
- [x] Personality list page _(stub — full CRUD in Phase 2)_

### Media Library CRUD (stub)
- [x] Media grid view _(stub — full CRUD in Phase 3)_

### Template CRUD (stub)
- [x] Template list _(stub — full CRUD in Phase 4)_

### Deliverables
- [x] Fully functional CRUD for channels, episodes, blocks
- [x] Stub pages for personalities, media library, templates
- [x] All forms with validation
- [x] Data persisted to PocketBase

---

## 1.4 Auth + Access Rules

### Tasks
- [x] PB auth setup — email/password login
- [x] Login page UI (LoginPage.tsx)
- [x] Auth guard on all routes (AuthGuard.tsx — redirects to /login if unauthenticated)
- [x] PB access rules configured:
  - [x] All collections: authenticated users can read/write
  - [x] Orchestrator uses PB admin token (server-side)
- [x] Session persistence (PB SDK autoRefresh enabled)
- [x] Logout functionality

### Deliverables
- [x] Login/logout flow working
- [x] All routes protected
- [x] API token configured for orchestrator

---

## 1.5 R2 Storage Configuration

### Tasks
- [ ] Configure PB S3 storage backend with R2 credentials _(manual — needs R2 creds)_
- [ ] Test file upload → verify files land in R2 _(manual)_
- [ ] Verify public URL generation _(manual)_
- [x] Document R2 setup steps — `docs/R2_SETUP.md`

### Deliverables
- [ ] File uploads working end-to-end _(manual setup needed)_
- [x] Setup documentation for R2

---

## 1.6 Dev Scripts + Deployment

### Tasks

#### Local Dev Scripts
- [x] `scripts/dev.sh` — PocketBase + Vite, colored banner, signal trap
- [x] `scripts/dev-pb.sh` — PocketBase only
- [x] `scripts/dev-frontend.sh` — Vite frontend only
- [x] Root `package.json` scripts (pnpm-based)

#### Remote Server Prerequisites Checklist

- [x] `scripts/setup-server.sh` — covers: Node.js, Bun, FFmpeg, chrome-headless-shell, Nginx, PB systemd service, pi CLI, hyperframes, Cloudflare Tunnel, .env, directories

#### Deployment Scripts
- [x] `scripts/deploy.sh` — builds, rsync, PB binary, nginx, remote deps, health check
- [x] `scripts/deploy-checklist.md` — manual first-time deploy steps

### Deliverables
- [x] `scripts/dev.sh` starts full dev environment with one command
- [x] `scripts/setup-server.sh` checklist covers all remote prerequisites
- [x] `scripts/deploy.sh` builds and deploys to remote server
- [x] Root-level `package.json` scripts for common tasks
- [x] First-time deploy checklist documented

---

## 1.7 Git Repository Setup

### Tasks
- [x] Create local `.gitignore`
- [x] Initialize local repo — initial commit
- [x] Create remote repo via GitHub CLI — `github.com/burggraf/vpp` (public)
- [x] Push initial commit — main + develop pushed to origin
- [x] Create initial branch structure: `main` + `develop`
- [x] Add `CONTRIBUTING.md` with branch naming convention

### Deliverables
- [x] Local git repo initialized with proper `.gitignore`
- [x] Remote GitHub repo `vpp` created — `github.com/burggraf/vpp` (public)
- [x] Branch structure set up (main, develop) — both pushed
- [x] Contributing guidelines documented

---

## Acceptance Criteria

- [x] PB binary downloaded, init-collections.js + seed-data.js created (8 collections defined)
- [ ] PB collections initialized _(manual: `./pb/pocketbase serve && node pb/init-collections.js`)_
- [ ] R2 storage configured _(manual — needs Cloudflare R2 credentials)_
- [x] React app with all routes, navigation, auth (login page, auth guard)
- [x] Full CRUD for channels, episodes, blocks working
- [x] Stub pages for personalities, media library, templates
- [ ] File uploads → R2 working _(manual setup needed)_
- [x] Seed data script ready
- [x] `scripts/dev.sh` starts full dev environment
- [x] `scripts/setup-server.sh` covers all remote prerequisites
- [x] `scripts/deploy.sh` builds and deploys to remote
- [x] GitHub repo `vpp` created and pushed — `github.com/burggraf/vpp`

---

## Notes

- Phase 1 is **data layer + scaffolding** — no AI, no generation, no preview
- Focus on getting the database and UI structure solid
- Most pipeline pages are stubs — they just need to exist and show data
- Orchestrator not started yet (Phase 2+)
