# VPP — Phase Plan Index

> Master index for all implementation phase subplans.

**Project:** Video Generation Management System
**Created:** 2026-05-08
**Master Plan:** `PROJECT_PLAN.md`

---

## Phase Overview

| Phase | Name | Focus | Effort | Status |
|-------|------|-------|--------|--------|
| [Phase 1](phase-1-foundation.md) | Foundation | DB, frontend scaffold, CRUD, auth, R2 | 3-5 days | 🟡 Done (R2 + GitHub push need manual setup) |
| [Phase 2](phase-2-research-personality-tts.md) | Research + Personality + TTS | Web research, voice training, script gen, TTS | 5-7 days | ⬜ Not started |
| [Phase 3](phase-3-media-blocks-quality.md) | Media + Blocks + Quality | Asset sourcing, composition gen, lint gate | 6-8 days | ⬜ Not started |
| [Phase 4](phase-4-preview-feedback-templates.md) | Preview + Feedback + Templates | Live preview, chat feedback, save/load templates | 4-6 days | ⬜ Not started |
| [Phase 5](phase-5-render-storage-schedule.md) | Render + Storage + Schedule | MP4 render, R2 upload, CRON automation | 4-5 days | ⬜ Not started |
| [Phase 6](phase-6-polish.md) | Polish | Dashboard, real-time, errors, deploy, docs | 3-4 days | ⬜ Not started |
| [Phase 7](phase-7-social-distribution.md) | Social Distribution | YouTube upload, thumbnails, analytics (future) | 8-12 days | ⬜ Not started |

**Total estimated effort (Phases 1-6):** 25-35 days

---

## Dependencies

```
Phase 1 (Foundation)
    ↓
Phase 2 (Research + Personality + TTS)
    ↓
Phase 3 (Media + Blocks + Quality)
    ↓
Phase 4 (Preview + Feedback + Templates)
    ↓
Phase 5 (Render + Storage + Schedule)
    ↓
Phase 6 (Polish)
    ↓
Phase 7 (Social Distribution — Future)
```

Each phase builds on the previous. Cannot skip phases.

---

## What Each Phase Delivers

### Phase 1 — "Data Layer"
- PocketBase with 8 collections
- React app with full CRUD for channels, episodes, blocks
- Auth, R2 storage, seed data

### Phase 2 — "Content Creation"
- Research pipeline (web search → structured results)
- Personality training (upload → analyze → validate)
- Script generation with voice
- TTS narration (Kokoro, free)

### Phase 3 — "Visual Composition"
- Media library with 4+ asset sources
- Script-to-media analysis
- Block composition generation
- Quality gate (lint + assets + duration)

### Phase 4 — "Interaction"
- Live preview with hot-reload
- Chat-based feedback loop
- Episode templates (save/load)
- Pipeline stepper UI

### Phase 5 — "Production"
- MP4 render pipeline
- R2 upload, thumbnails
- CRON-based auto-generation
- Schedule UI

### Phase 6 — "Production-Ready"
- Dashboard with stats
- Real-time updates
- Error handling + retry
- VPS deployment + docs

### Phase 7 — "Distribution" (Future)
- YouTube upload (Phase 7a)
- Facebook, Instagram, TikTok, X, LinkedIn
- Analytics tracking
- OAuth management

---

## Key Decision Points

1. **After Phase 1:** Validate DB schema and CRUD before investing in AI pipeline
2. **After Phase 2:** Test research + script quality with real content
3. **After Phase 3:** First full composition (no preview yet) — validate block generation
4. **After Phase 4:** First full end-to-end flow (research → script → preview → feedback → approve)
5. **After Phase 5:** First automated scheduled episode
6. **After Phase 6:** System is production-ready on VPS

---

## File Structure

```
vpp/
├── PROJECT_PLAN.md          # Master plan (this file references below)
├── plans/
│   ├── phase-1-foundation.md
│   ├── phase-2-research-personality-tts.md
│   ├── phase-3-media-blocks-quality.md
│   ├── phase-4-preview-feedback-templates.md
│   ├── phase-5-render-storage-schedule.md
│   ├── phase-6-polish.md
│   └── phase-7-social-distribution.md
```

---

## How to Use

1. Read `PROJECT_PLAN.md` for full system architecture
2. Read the relevant phase plan for detailed implementation steps
3. Each phase plan has:
   - Dependencies
   - Task checklists
   - Deliverables
   - Acceptance criteria
4. Mark tasks complete as you go
5. Don't start a phase until previous phase acceptance criteria are met
