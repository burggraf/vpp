# Phase 6 — Polish

> **Goal:** Dashboard, real-time updates, error handling, deployment, documentation.

**Dependencies:** Phases 1-5 (all core functionality)

**Estimated effort:** 3-4 days

---

## 6.1 Dashboard

### Tasks
- [ ] `/` — Dashboard page
  - **Channels overview** — cards with name, status, episode count, schedule status
  - **Recent episodes** — table of last 10 episodes across all channels:
    - Title, channel, status, date
    - Quick actions (preview, download)
  - **Queue status** — current active episode, queue depth
  - **Stats:**
    - Total channels (active)
    - Total episodes (complete this month)
    - Total renders (this month)
    - Storage used (R2)
    - Most-used personality
    - Most-used media asset
  - **Quick actions:**
    - "New Episode" button
    - "New Channel" button
    - "Run Research" shortcut
  - **Scheduled upcoming** — next 5 scheduled episode creations

### Deliverables
- Dashboard with overview, stats, recent activity, queue status
- Quick action buttons
- Scheduled episodes preview

---

## 6.2 Real-Time Status Updates

### Tasks
- [ ] PB real-time subscriptions in frontend:
  ```typescript
  pb.collection('episodes').subscribe('*', (e) => {
    // Update episode status in UI
  });
  ```
  - Subscribe to: `episodes`, `blocks`, `research_results`, `scripts`
  - Update UI in real-time when status changes
- [ ] WebSocket or SSE for orchestrator progress updates:
  - Research progress
  - Script generation progress
  - Block generation progress
  - Render progress
  - Queue state changes
- [ ] Toast notifications for:
  - Episode stage completed
  - Render finished
  - Quality gate failed
  - Scheduled episode created
  - New episode queued
- [ ] Auto-refresh dashboard stats

### Deliverables
- Real-time status updates across all pages
- Toast notifications for key events
- No manual refresh needed

---

## 6.3 Error Handling + Retry Logic

### Tasks
- [ ] Global error boundary in React app
- [ ] API error handling:
  - Network errors → retry with backoff
  - 4xx errors → user-friendly message
  - 5xx errors → "server error, try again"
- [ ] Orchestrator error handling:
  - pi session crashes → restart session, notify user
  - Preview server crashes → restart, notify user
  - Render fails → save error log, allow retry
  - Research fails → save partial results, allow retry
- [ ] Retry buttons on failed operations:
  - "Retry Research" button
  - "Retry Script" button
  - "Retry Render" button
  - "Retry Preview" button
- [ ] Error logging:
  - Save error details to episode record
  - Error log endpoint: `GET /episodes/:id/errors`
- [ ] Graceful degradation:
  - If preview server down, show error + restart button
  - If orchestrator down, show offline mode message

### Deliverables
- Comprehensive error handling throughout app
- Retry logic for all pipeline stages
- User-friendly error messages
- Error logging for debugging

---

## 6.4 Nginx + Cloudflare Tunnel Deployment

### Tasks
- [ ] Finalize Nginx config for production:
  - HTTPS (via Cloudflare Tunnel or Let's Encrypt)
  - Rate limiting
  - Gzip compression
  - Static file caching
- [ ] Cloudflare Tunnel setup:
  - Install `cloudflared`
  - Configure tunnel: `cloudflared tunnel --url http://localhost:80`
  - DNS records pointing to tunnel
  - Access rules (if needed)
- [ ] Production environment setup:
  - Env vars on VPS
  - Process management (systemd or pm2 for orchestrator)
  - PB process management (systemd service)
  - Nginx as systemd service
  - Log rotation
- [ ] Health check endpoint for monitoring
- [ ] Deployment script or documentation

### Systemd services needed:
```
pocketbase.service    — PB binary
orchestrator.service  — orchestrator Node.js app
nginx.service         — reverse proxy
```

### Deliverables
- Production deployment working on VPS
- Cloudflare Tunnel exposing app to public URL
- All services managed by systemd
- HTTPS enabled

---

## 6.5 Documentation

### Tasks
- [ ] `README.md` — project overview, architecture, quick start
- [ ] `docs/` directory:
  - `setup.md` — VPS setup, dependencies, env vars
  - `architecture.md` — system overview, component interactions
  - `database.md` — schema documentation
  - `pipeline.md` — episode pipeline stages, quality gate
  - `templates.md` — how to create and use templates
  - `scheduling.md` — how to configure auto-generation
  - `media-sources.md` — configuring media source registry
  - `personality.md` — training and using personalities
  - `troubleshooting.md` — common issues and fixes
- [ ] API documentation — orchestrator endpoints (OpenAPI/Swagger optional)
- [ ] Inline code comments for complex logic
- [ ] `ENVIRONMENT.md` — all env vars documented

### Deliverables
- Complete documentation for setup, usage, and troubleshooting
- API docs for orchestrator
- Inline comments on complex code

---

## Acceptance Criteria

- [ ] Dashboard with stats, recent activity, queue status, quick actions
- [ ] Real-time status updates via PB subscriptions + orchestrator events
- [ ] Toast notifications for key events
- [ ] Error handling with retry logic for all pipeline stages
- [ ] Production deployment on VPS with Nginx + Cloudflare Tunnel
- [ ] All services managed by systemd
- [ ] HTTPS enabled
- [ ] Complete documentation

---

## Notes

- Phase 6 is the **production-ready** layer — polish, deployment, docs
- Dashboard ties everything together into a single view
- Real-time updates make the app feel alive
- Error handling is critical for unattended scheduled runs
- Deployment is the final step before the system is usable end-to-end
