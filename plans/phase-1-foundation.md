# Phase 1 — Foundation

> **Goal:** PocketBase database, React frontend scaffold, basic CRUD for all core collections, auth, R2 storage config.

**Dependencies:** None (first phase)

**Estimated effort:** 3-5 days

---

## 1.1 PocketBase Setup

### Tasks
- [ ] Download PocketBase 0.38.0 binary to `pb/` directory
- [ ] Initialize PB data directory (`pb/pb_data/`)
- [ ] Configure R2 as S3 storage backend in PB settings
- [ ] Set admin credentials (env vars: `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`)
- [ ] Create PocketBase migration script or seed file for all collections

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
- [ ] `npm create vite@latest frontend -- --template react-ts`
- [ ] Install dependencies:
  - `tailwindcss@3 postcss autoprefixer`
  - `@radix-ui/*` (shadcn/ui base)
  - `clsx tailwind-merge`
  - `pocketbase` (JS SDK)
  - `react-router-dom`
  - `lucide-react` (icons)
  - `class-variance-authority`
- [ ] Initialize Tailwind config (`npx tailwindcss init -p`)
- [ ] Initialize shadcn/ui (`npx shadcn@latest init`)
- [ ] Set up React Router with route structure
- [ ] Create PB client wrapper (`frontend/src/lib/pocketbase.ts`)
- [ ] Create auth context/provider
- [ ] Set up layout shell (sidebar + main content area)
- [ ] Add basic navigation

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
- [ ] Channel list page — table with name, status, episode count
- [ ] Create channel form — name, description, system_prompt textarea, style_dna JSON editor
- [ ] Edit channel — same form, pre-filled
- [ ] Archive/delete with confirmation
- [ ] Style DNA editor — structured form (not raw JSON) for fonts, colors, durations

### Episode CRUD
- [ ] Episode list (within channel detail) — table with title, status, number
- [ ] Create episode form — title, topic, optional template selector
- [ ] Episode detail stub — shows status badge, basic metadata
- [ ] Status badge component with color coding

### Block CRUD
- [ ] Block list within episode detail — ordered table
- [ ] Create block form — type selector, order, script textarea
- [ ] Edit block inline
- [ ] Reorder blocks (drag or up/down arrows)

### Personality CRUD (stub)
- [ ] Personality list page
- [ ] Create/edit personality form — name, description, voice_profile JSON editor, system_prompt

### Media Library CRUD (stub)
- [ ] Media grid view — thumbnails, filters by type/category
- [ ] Upload modal — drag-drop file, name, type, category, tags
- [ ] Media detail — preview, metadata, usage count

### Template CRUD (stub)
- [ ] Template list within channel
- [ ] Create template form (placeholder — actual save-as-template comes in Phase 4)

### Deliverables
- Fully functional CRUD for channels, episodes, blocks
- Working personality and media library CRUD
- All forms with validation
- Data persisted to PocketBase

---

## 1.4 Auth + Access Rules

### Tasks
- [ ] PB auth setup — email/password login
- [ ] Login page UI
- [ ] Auth guard on all routes (redirect to /login if unauthenticated)
- [ ] PB access rules configured:
  - All collections: authenticated users can read/write
  - Orchestrator uses PB admin token (server-side)
- [ ] Session persistence (PB SDK handles this)
- [ ] Logout functionality

### Deliverables
- Login/logout flow working
- All routes protected
- API token configured for orchestrator

---

## 1.5 R2 Storage Configuration

### Tasks
- [ ] Configure PB S3 storage backend with R2 credentials
- [ ] Test file upload → verify files land in R2
- [ ] Verify public URL generation
- [ ] Document R2 setup steps (bucket creation, API keys, CORS config)

### Deliverables
- File uploads working end-to-end
- Files stored in R2, accessible via public URLs
- Setup documentation for R2

---

## 1.6 Dev Scripts + Deployment

### Tasks

#### Local Dev Scripts
- [ ] `scripts/dev.sh` — starts all services in dev mode:
  - PocketBase on port 8090
  - Vite dev server on port 5173
  - Orchestrator on port 3001 (once Phase 2 starts)
  - All processes managed concurrently (e.g., `concurrently` or background processes)
  - Watches for file changes, auto-restarts as needed
  - Shows a startup banner with all service URLs
- [ ] `scripts/dev-pb.sh` — starts PocketBase only (for quick iteration)
- [ ] `scripts/dev-frontend.sh` — starts Vite frontend only
- [ ] `package.json` root-level scripts:
  ```json
  {
    "scripts": {
      "dev": "./scripts/dev.sh",
      "dev:pb": "./scripts/dev-pb.sh",
      "dev:frontend": "./scripts/dev-frontend.sh",
      "dev:orchestrator": "cd orchestrator && bun run dev",
      "build:frontend": "cd frontend && npm run build",
      "build:orchestrator": "cd orchestrator && bun run build",
      "lint": "cd frontend && npm run lint && cd ../orchestrator && bun run lint",
      "typecheck": "cd frontend && npx tsc --noEmit && cd ../orchestrator && bun run typecheck"
    }
  }
  ```

#### Remote Server Prerequisites Checklist

Create `scripts/setup-server.sh` — automated checklist for fresh Ubuntu VPS:

- [ ] **System packages:**
  - [ ] Node.js 20+ (via nvm or NodeSource)
  - [ ] Bun (latest stable)
  - [ ] FFmpeg (`apt install ffmpeg`)
  - [ ] Chrome-headless-shell (hyperframes dependency)
  - [ ] Nginx (`apt install nginx`)
  - [ ] Git
  - [ ] curl, wget
  - [ ] unzip
- [ ] **PocketBase:**
  - [ ] Download PocketBase 0.38.0 binary to `/opt/pocketbase/pocketbase`
  - [ ] Create systemd service (`pocketbase.service`)
  - [ ] Create data directory `/opt/pocketbase/pb_data/`
  - [ ] Set permissions
  - [ ] Enable + start service
- [ ] **pi agent coder:**
  - [ ] Install pi globally: `npm install -g @earendil-works/pi-coding-agent`
  - [ ] Run `pi --version` to verify
  - [ ] Configure provider/model (subscription or API key)
  - [ ] Test: `pi -p "Hello"` (verify agent responds)
- [ ] **hyperframes:**
  - [ ] Install globally or available via npx: `npm install -g hyperframes` (or ensure npx works)
  - [ ] Test TTS: `npx hyperframes tts "test" --list` (verify Kokoro model available)
  - [ ] Test render deps: `npx hyperframes lint` on a test composition
- [ ] **Cloudflare Tunnel (optional but recommended):**
  - [ ] Install `cloudflared`
  - [ ] Authenticate: `cloudflared tunnel login`
  - [ ] Create tunnel: `cloudflared tunnel create vpp`
  - [ ] Configure DNS records
  - [ ] Test tunnel connectivity
- [ ] **Nginx:**
  - [ ] Install config from `nginx/vpp.conf`
  - [ ] Enable site, test config (`nginx -t`)
  - [ ] Start/reload nginx
- [ ] **Environment:**
  - [ ] Create `.env` file at project root with all env vars (see PROJECT_PLAN.md)
  - [ ] Set proper file permissions on `.env` (600)
  - [ ] Verify all services can read env vars
- [ ] **Storage directories:**
  - [ ] `mkdir -p compositions renders assets pb/pb_data`
  - [ ] Set ownership/permissions for all directories

#### Deployment Scripts
- [ ] `scripts/deploy.sh` — deploys app to remote server:
  - [ ] Builds frontend (`npm run build:frontend`)
  - [ ] Builds orchestrator (`npm run build:orchestrator`)
  - [ ] Copies built files to remote server (rsync or scp)
  - [ ] Copies PocketBase binary if needed
  - [ ] Copies Nginx config
  - [ ] Restarts services on remote (systemctl restart)
  - [ ] Verifies deployment (health check)
- [ ] `scripts/deploy-checklist.md` — manual checklist for first-time deploy:
  - [ ] SSH to remote server
  - [ ] Run setup-server.sh
  - [ ] Clone repo (or rsync files)
  - [ ] Install dependencies (`cd frontend && npm install`, `cd orchestrator && bun install`)
  - [ ] Configure `.env` on remote
  - [ ] Run deploy.sh
  - [ ] Verify all services running
  - [ ] Test app via browser

### Deliverables
- `scripts/dev.sh` starts full dev environment with one command
- `scripts/setup-server.sh` checklist covers all remote prerequisites
- `scripts/deploy.sh` builds and deploys to remote server
- Root-level `package.json` scripts for common tasks
- First-time deploy checklist documented

---

## 1.7 Git Repository Setup

### Tasks
- [ ] Create local `.gitignore`:
  ```
  node_modules/
  dist/
  .env
  pb/pb_data/
  renders/
  compositions/
  assets/
  *.mp4
  *.wav
  .turbo
  coverage/
  ```
- [ ] Initialize local repo:
  ```bash
  git init
  git add .
  git commit -m "chore: initial commit — VPP project scaffold"
  ```
- [ ] Create remote repo via GitHub CLI:
  ```bash
  gh repo create vpp --private --source=. --remote=origin
  ```
  - Repo name: `vpp`
  - Visibility: private
  - Set `origin` remote
- [ ] Push initial commit:
  ```bash
  git push -u origin main
  ```
- [ ] Create initial branch structure:
  - `main` — production branch (protected)
  - `develop` — integration branch
  - `feature/phase-1-foundation` — current work branch
- [ ] Set up branch protection rules for `main` (optional):
  - Require pull requests
  - Require status checks
- [ ] Add `CONTRIBUTING.md` with branch naming convention:
  - `feature/phase-N-description`
  - `fix/description`
  - `chore/description`

### Deliverables
- Local git repo initialized with proper `.gitignore`
- Remote GitHub repo `vpp` created (private) via `gh repo create`
- Initial commit pushed to `main`
- Branch structure set up (main, develop, feature branch)
- Contributing guidelines documented

---

## Acceptance Criteria

- [ ] PB running with all 8 collections, correct schema, R2 storage
- [ ] React app with all routes, navigation, auth
- [ ] Full CRUD for channels, episodes, blocks working
- [ ] Personality and media library CRUD functional
- [ ] File uploads → R2 working
- [ ] Seed data loaded (1 channel, 1 personality, 2 media items)
- [ ] `scripts/dev.sh` starts full dev environment
- [ ] `scripts/setup-server.sh` covers all remote prerequisites
- [ ] `scripts/deploy.sh` builds and deploys to remote
- [ ] GitHub repo `vpp` created and pushed

---

## Notes

- Phase 1 is **data layer + scaffolding** — no AI, no generation, no preview
- Focus on getting the database and UI structure solid
- Most pipeline pages are stubs — they just need to exist and show data
- Orchestrator not started yet (Phase 2+)
