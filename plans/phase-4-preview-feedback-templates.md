# Phase 4 — Preview + Feedback + Templates

> **Goal:** Live preview with chat feedback loop, episode template system (save-as-template, create-from-template).

**Dependencies:** Phase 3 (blocks, compositions, quality gate, queue)

**Estimated effort:** 4-6 days

---

## 4.1 HyperFrames Preview Server

### Tasks
- [ ] Create `preview.ts` module in orchestrator
- [ ] Implement preview start: `POST /episodes/:id/preview/start`
  - Check quality gate passed (block progression)
  - Start hyperframes dev server for episode directory:
    ```bash
    cd compositions/{channel}/{episode} && npx hyperframes preview --port {HYPERFRAMES_PORT}
    ```
  - Or use `@hyperframes/engine` `createFileServer()` programmatically:
    ```typescript
    import { createFileServer } from '@hyperframes/engine';
    const server = await createFileServer({ root: episodeDir, port: HYPERFRAMES_PORT });
    ```
  - Store server instance + port in orchestrator state
  - Return preview URL
  - Stop any previously active preview server
- [ ] Implement preview stop: `DELETE /episodes/:id/preview`
  - Kill dev server process
  - Clear orchestrator state
- [ ] Health check — periodic ping to dev server to detect crashes
- [ ] Auto-shutdown when episode moves past preview stage

### Deliverables
- Preview server starts/stops per episode
- Single active preview at a time (queue-based)
- Health check + auto-shutdown

---

## 4.2 Nginx Reverse Proxy

### Tasks
- [ ] Create Nginx config (`nginx/vpp.conf`):
  ```nginx
  server {
      listen 80;
      server_name your-domain.com;

      # React frontend
      location / {
          proxy_pass http://localhost:5173;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
      }

      # PocketBase API
      location /api/ {
          proxy_pass http://localhost:8090/;
          proxy_set_header Host $host;
      }

      # HyperFrames preview
      location /preview/ {
          proxy_pass http://localhost:4000/;
          proxy_set_header Host $host;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
      }

      # Orchestrator API
      location /orchestrator/ {
          proxy_pass http://localhost:3001/;
          proxy_set_header Host $host;
      }
  }
  ```
- [ ] Configure Nginx on VPS (or local dev for testing)
- [ ] Test all proxy routes:
  - `/` → React app
  - `/api/` → PocketBase
  - `/preview/` → HyperFrames dev server
  - `/orchestrator/` → orchestrator API
- [ ] WebSocket support for preview hot-reload (upgrade headers)

### Deliverables
- Nginx proxy working locally
- All routes correctly proxied
- WebSocket upgrade for preview hot-reload

---

## 4.3 Preview Player in Frontend

### Tasks
- [ ] PreviewPlayer component:
  - Option A: `<iframe src="/preview/" />`
    - Simple, works out of the box
    - No direct control over playback
  - Option B: `<hyperframes-player>` web component
    - Import `@hyperframes/player`
    - Set `src="/preview/index.html"`
    - Access `player.play()`, `player.pause()`, `player.seek(time)`
    - Events: `ready`, `timeupdate`, `play`, `pause`, `ended`
  - **Start with iframe** (Phase 4), upgrade to `<hyperframes-player>` later if needed
- [ ] Episode workspace layout:
  - Left: preview player (large area)
  - Right: feedback panel (chat interface)
  - Bottom: pipeline stepper + status
- [ ] Playback controls (iframe mode):
  - Just a reload button (refresh iframe)
  - Hot-reload should update content automatically
- [ ] Loading state while preview server starts
- [ ] Error state if preview server unavailable

### Deliverables
- Preview player embedded in episode workspace
- Live hot-reload visible when composition files change
- Clean layout with preview + feedback side-by-side

---

## 4.4 Chat-Based Feedback Loop

### Tasks
- [ ] FeedbackPanel component:
  - Chat-like interface (messages stacked, newest at bottom)
  - User input at bottom
  - Message history loaded from episode `feedback_log`
  - Each message shows:
    - User feedback text
    - Agent response (if completed)
    - Timestamp
    - Target block (if specific block was targeted)
- [ ] Submit feedback endpoint: `POST /episodes/:id/feedback`
  - Request body: `{ message: string, targetBlockId?: string }`
  - Orchestrator sends `session.steer()` to active block session:
    ```typescript
    await session.steer(`User feedback: ${message}${targetBlockId ? ` (target block: ${targetBlockId})` : ''}`);
    ```
  - Or spawns new session with feedback + current composition as context
  - Pi agent updates composition files
  - Hot-reload reflects changes in preview
  - Agent response saved to `feedback_log`
  - Episode status stays in `reviewing`
- [ ] Real-time feedback progress:
  - Show "Agent is working..." indicator
  - Stream tool call updates (optional)
  - Show when agent completes and hot-reload fires
- [ ] Block targeting:
  - User can select a specific block from dropdown
  - Feedback applies to that block only
  - Or leave blank for episode-wide changes

### Deliverables
- Chat-based feedback working — type request → agent updates → hot-reload
- Feedback history persisted and displayed
- Block targeting for specific changes
- Real-time progress indicators

---

## 4.5 Pipeline Stepper UI

### Tasks
- [ ] PipelineStepper component:
  - Visual stepper with 8 stages:
    1. Research
    2. Script
    3. TTS
    4. Media
    5. Blocks
    6. Quality Gate
    7. Preview
    8. Render
  - Each stage shows:
    - Icon (check for complete, spinner for active, circle for pending, X for failed)
    - Label
    - Click to navigate to stage page
  - Active stage highlighted
  - Current episode status mapped to pipeline stage
- [ ] Integration into episode workspace header
- [ ] Stage navigation — click stage → navigate to corresponding page

### Deliverables
- Pipeline stepper visible in episode workspace
- Stage status accurately reflected
- Click-to-navigate working

---

## 4.6 Episode Template System

### Save as Template

### Tasks
- [ ] Create `templates.ts` module in orchestrator
- [ ] Save-as-template endpoint: `POST /channels/:id/templates/save`
  - Request body: `{ episodeId, name, description? }`
  - Validate episode is in `complete` status
  - Capture template data:
    - `block_structure` — block types, order, timing from episode blocks
    - `composition_files` — copy composition files to template directory
    - `default_personality` — from episode's script personality
    - `default_research_depth` — from episode's research config
    - `default_duration` — from episode total duration
    - `variables` — extract template variables (e.g., `{episode_title}`, `{topic}`)
  - Create `episode_templates` record
  - Copy composition files to `compositions/templates/{template-slug}/`
  - Increment channel `episode_count` (not applicable here, but track template usage)

### Create from Template

### Tasks
- [ ] Create-from-template endpoint: `POST /channels/:id/templates/:templateId/use`
  - Request body: `{ title, topic?, number? }`
  - Create new episode from template:
    - Copy template block structure → create `blocks` records
    - Copy template composition files → episode composition directory
    - Pre-fill episode `topic` if provided
    - Set `status: draft`
  - Create composition directory for new episode
  - Copy template files:
    ```
    compositions/templates/{template-slug}/ → compositions/{channel-slug}/{new-episode-id}/
    ```
  - Return new episode ID

### Template UI

### Tasks
- [ ] `/channels/:slug/templates` page
  - Template list — cards with name, description, usage count
  - Preview button — shows template structure (block layout)
  - "Create Episode" button → opens new episode wizard with template pre-selected
  - "Save as Template" button (from completed episode detail)
- [ ] Template preview modal — shows block structure, timing, composition files
- [ ] New episode wizard — template selector as first step:
  - "Start from template" → shows available templates
  - "Start blank" → empty episode
  - Template selection pre-fills episode structure

### Deliverables
- Save completed episode as template
- Create new episode from template (structure pre-built)
- Template list and preview UI
- New episode wizard with template selection

---

## 4.7 Feedback Iteration Logging

### Tasks
- [ ] Extend feedback logging with:
  - `iteration` number (auto-incremented)
  - `target_block` reference (block ID or null)
  - `timestamp`
  - `feedback` (user message)
  - `agent_response` (pi agent's response text)
  - `composition_changes` (files modified — optional, from pi tool calls)
- [ ] Display in FeedbackPanel as chat history
- [ ] Export feedback log (optional — for debugging)

### Deliverables
- Rich feedback logging with iteration tracking
- Chat UI showing full feedback history
- Block targeting visible in history

---

## Acceptance Criteria

- [ ] Preview server starts/stops correctly, hot-reload works
- [ ] Nginx proxy routing all services correctly
- [ ] Preview player embedded in episode workspace
- [ ] Chat-based feedback — type → agent updates → hot-reload in <30s
- [ ] Pipeline stepper with accurate stage tracking
- [ ] Save episode as template, create episode from template
- [ ] Template UI — list, preview, select for new episode
- [ ] Feedback logging with iteration history and block targeting

---

## Notes

- Phase 4 is the **interaction** layer — preview, feedback, templates
- Preview hot-reload is key — user sees changes in real-time
- Chat feedback is the primary iteration mechanism
- Templates enable rapid episode creation after the first one is dialed in
- This is where the system starts feeling "magical" — watch, tweak, approve
