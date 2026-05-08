# Phase 5 — Rendering + Storage + Scheduling

> **Goal:** Render pipeline (MP4 output), R2 upload, thumbnail generation, CRON-based auto-generation, schedule UI.

**Dependencies:** Phase 4 (preview, feedback, templates, quality gate)

**Estimated effort:** 4-5 days

---

## 5.1 Render Pipeline

### Tasks
- [ ] Create render endpoint: `POST /episodes/:id/render`
  - Validate episode status is `reviewing` or `approved`
  - Update status to `rendering`
  - Execute render:
    ```bash
    cd compositions/{channel}/{episode} && npx hyperframes render --output {outputPath}
    ```
  - Or use `@hyperframes/engine` programmatic API:
    ```typescript
    import { createCaptureSession, initializeSession, captureFrame, closeCaptureSession } from '@hyperframes/engine';
    import { encodeFramesFromDir, muxVideoWithAudio } from '@hyperframes/engine';
    ```
  - Monitor render progress (frame capture → encoding)
  - Stream progress to frontend (optional)
  - On success:
    - MP4 file at `renders/{episode-id}.mp4`
    - Update episode `status: complete`
    - Increment `usage_count` on referenced media library items
    - Calculate metadata (duration, resolution, fps, file size)
  - On failure:
    - Update episode `status: failed`
    - Save error message
    - Notify user
- [ ] Render progress tracking
  - Poll or WebSocket for progress updates
  - "Frame 150/300", "Encoding MP4..."
- [ ] Render retry — re-run failed renders

### RenderConfig options (from episode/channel):
```typescript
{
  fps: 30,           // from channel style_dna.fps
  quality: 'standard', // 'draft' | 'standard' | 'high'
  format: 'mp4',     // always mp4 for episodes
  useGpu: false,     // from config
}
```

### Deliverables
- Render pipeline working — composition → MP4
- Progress tracking visible in frontend
- Error handling + retry
- Media usage counts incremented

---

## 5.2 MP4 Upload to R2

### Tasks
- [ ] After render completes, upload MP4 to PocketBase file field:
  ```typescript
  const formData = new FormData();
  formData.append('video_file', fs.createReadStream(outputPath));
  await pb.collection('episodes').update(episodeId, formData);
  ```
- [ ] PB automatically uploads to R2 (S3 backend configured in Phase 1)
- [ ] Retrieve public URL from PB:
  ```typescript
  const videoUrl = pb.files.getRecordFileUrl(record, 'video_file');
  ```
- [ ] Save URL to episode `video_url` field
- [ ] Clean up local MP4 after successful upload (optional — configurable)
- [ ] Handle upload failure (retry, keep local file)

### Deliverables
- MP4 uploaded to R2 via PB
- Public URL stored on episode record
- Local file cleanup after upload

---

## 5.3 Thumbnail Generation

### Tasks
- [ ] Generate thumbnail from rendered MP4:
  ```bash
  ffmpeg -i {mp4Path} -vf "thumbnail,scale=1280:720" -frames:v 1 {thumbnailPath}
  ```
  - Or capture first frame:
  ```bash
  ffmpeg -i {mp4Path} -ss 00:00:01 -vframes 1 {thumbnailPath}
  ```
- [ ] Upload thumbnail to PB:
  ```typescript
  formData.append('thumbnail', fs.createReadStream(thumbnailPath));
  ```
- [ ] Store thumbnail URL on episode record
- [ ] Thumbnail display in episode cards, dashboard, etc.
- [ ] Optional: generate multiple thumbnails (first frame, midpoint, user-selected)

### Deliverables
- Thumbnail generated from MP4
- Thumbnail uploaded to R2 via PB
- Thumbnail displayed in UI

---

## 5.4 Episode Completion Workflow

### Tasks
- [ ] Finalize episode status:
  - `status: complete`
  - `video_url` set
  - `thumbnail` set
  - `metadata` populated (duration, resolution, fps, file size)
  - `updated` timestamp
- [ ] Post-completion actions:
  - Increment channel `episode_count`
  - Increment media library `usage_count` for all referenced assets
  - Log completion event
- [ ] Episode detail page — completed state:
  - Video player (from R2 URL)
  - Thumbnail display
  - Metadata (duration, resolution, file size)
  - "Download" button
  - "Share" button (copy URL)
  - "Publish" button (Phase 7 — social distribution)
- [ ] Episode list — completed episodes show video thumbnail preview

### Deliverables
- Episode marked complete with all metadata
- Post-completion side effects (counters incremented)
- Completed episode UI with video player

---

## 5.5 Scheduler Service

### Tasks
- [ ] Create `scheduler.ts` module in orchestrator
- [ ] Install `node-cron`: `npm install node-cron`
- [ ] Scheduler initialization:
  - On orchestrator startup, load all channels with `schedule_enabled: true`
  - Register cron jobs per channel
  ```typescript
  import cron from 'node-cron';

  for (const channel of scheduledChannels) {
    cron.schedule(channel.schedule, async () => {
      await createScheduledEpisode(channel);
    });
  }
  ```
- [ ] `createScheduledEpisode(channel)`:
  - Look up channel's `schedule_template`
  - Create new episode from template:
    - Copy template block structure
    - Copy composition files
    - Auto-generate title (e.g., "Episode #{number}")
    - Auto-increment episode number
  - Enqueue for processing
  - If `schedule_auto_advance: true`:
    - Auto-proceed through pipeline stages
    - Stop at preview for approval (or complete if fully automated)
  - If `schedule_auto_advance: false`:
    - Stop at first stage requiring user input
- [ ] Scheduler management API:
  - `GET /scheduler/next` — returns next scheduled run times per channel
  - `POST /scheduler/reload` — reload schedules (after config changes)
- [ ] Dynamic schedule updates:
  - Listen for channel updates (PB webhook or poll)
  - Remove old cron, add new cron when schedule changes
  - Handle schedule disable/enable

### Deliverables
- Scheduler running — cron jobs per channel
- Scheduled episodes auto-created from templates
- Queue integration — scheduled episodes enter queue
- Dynamic schedule management

---

## 5.6 Schedule UI

### Tasks
- [ ] `/channels/:slug/schedule` page
  - **Schedule toggle** — on/off switch for auto-generation
  - **Template selector** — which template to use
  - **Cron builder** — UI for building cron expressions:
    - Presets: "Daily", "Weekly (Monday)", "Bi-weekly", "Monthly"
    - Custom: minute, hour, day of week, day of month selectors
    - Human-readable preview: "Every Monday at 9:00 AM"
    - Validation of cron expression
  - **Auto-advance toggle** — auto-proceed through stages vs. stop at preview
  - **Next run display** — shows when next episode will be created
  - **Schedule history** — list of auto-generated episodes
  - **Save/Cancel** buttons
- [ ] Schedule status badge on channel card (scheduled vs. manual)
- [ ] Channel detail — show schedule summary

### Deliverables
- Schedule UI with cron builder, toggle, template selector
- Human-readable cron preview
- Next run time display
- Schedule history

---

## 5.7 Auto-Advance Through Pipeline

### Tasks
- [ ] Auto-advance logic for scheduled episodes:
  - If `schedule_auto_advance: true`:
    - Episode auto-proceeds through stages:
      1. Research (auto-run with channel default query)
      2. Script (auto-generate with default personality)
      3. TTS (auto-generate)
      4. Media (auto-analyze + auto-select from library)
      5. Blocks (auto-generate)
      6. Quality Gate (auto-run)
      7. Preview (auto-start)
      8. Render (auto-trigger OR stop at preview for approval)
    - Each stage completes → next stage starts automatically
    - No user interaction needed
  - If `schedule_auto_advance: false`:
    - Episode created in `draft` status
    - User must manually trigger each stage
- [ ] Auto-generated research query — use channel topic or template default
- [ ] Auto-generated script — use default personality from template
- [ ] Error handling — if any stage fails, stop and notify user
- [ ] Notification system (Phase 6) for auto-generated episodes needing review

### Deliverables
- Auto-advance working for scheduled episodes
- Configurable stop point (preview vs. complete)
- Error handling with user notification

---

## Acceptance Criteria

- [ ] Render pipeline: composition → MP4 with progress tracking
- [ ] MP4 uploaded to R2 via PB, public URL stored
- [ ] Thumbnail generated and uploaded
- [ ] Episode marked complete with all metadata
- [ ] Scheduler running — cron jobs create episodes from templates
- [ ] Schedule UI — cron builder, toggle, template selector, next run display
- [ ] Auto-advance working — scheduled episodes flow through pipeline automatically
- [ ] End-to-end scheduled flow: cron → create → research → script → blocks → render

---

## Notes

- Phase 5 is the **production** layer — rendering, storage, automation
- Render is the most resource-intensive step (chrome-headless-shell + ffmpeg)
- R2 keeps VPS disk clean — MP4s uploaded, local files cleaned
- Scheduler is the key VPS advantage — generate videos while laptop is closed
- Auto-advance is powerful but needs careful error handling
