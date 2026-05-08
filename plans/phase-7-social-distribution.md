# Phase 7 — Social Distribution (Future)

> **Goal:** Upload rendered videos to social platforms (YouTube first), generate thumbnails/descriptions, track analytics, manage OAuth tokens.

**Dependencies:** Phase 6 (rendering complete, R2 storage, polished UI)

**Estimated effort:** 8-12 days (Phase 7a: YouTube only)

---

## 7a. YouTube Integration (Start Here)

### Tasks
- [ ] Create `social.ts` module in orchestrator
- [ ] YouTube OAuth flow:
  - Register Google Cloud Project
  - Enable YouTube Data API v3
  - Configure OAuth consent screen
  - OAuth redirect endpoint in orchestrator
  - Store refresh token in PB (encrypted)
- [ ] New collection: `social_accounts`
  ```
  channel (relation → channels, required)
  platform (select: youtube/facebook/instagram/tiktok/x/linkedin, required)
  account_name (text, required)
  account_id (text, required)
  access_token (text, encrypted)
  refresh_token (text, encrypted)
  token_expires (date)
  status (select: connected/disconnected/expired, default: connected)
  ```
- [ ] YouTube upload endpoint: `POST /episodes/:id/publish/youtube`
  - Request body (optional overrides):
    ```json
    {
      "title": "Custom title (default: episode title)",
      "description": "Custom description (default: auto-generated)",
      "tags": ["tag1", "tag2"],
      "category": "Science & Technology",
      "privacy": "public | unlisted | private",
      "schedule": "2026-05-15T10:00:00Z (optional, for scheduled publish)"
    }
  ```
  - Download MP4 from R2
  - Upload to YouTube via Data API v3:
    ```
    POST https://www.googleapis.com/upload/youtube/v3/videos
    ```
  - Set title, description, tags, category, privacy
  - Upload thumbnail (from episode thumbnail)
  - Return YouTube video ID + URL
  - Save to episode `social_urls` field (new JSON field)
- [ ] Auto-generate description from episode metadata:
  - Episode title
  - Research summary
  - Channel branding
  - Links (subscribe, previous episodes, social)
- [ ] Thumbnail upload — use episode thumbnail or generate variant
- [ ] Publish status tracking:
  - Episode gains `publish_status` field:
    ```json
    {
      "youtube": { "status": "published | failed | scheduled", "videoId": "...", "url": "..." }
    }
  ```

### UI
- [ ] "Publish" button on completed episode detail
- [ ] Publish modal:
  - Platform selector (YouTube for now)
  - Account selector (if multiple accounts)
  - Title/description/tags editor
  - Privacy selector
  - Schedule option
  - "Publish" button
- [ ] Publish status display:
  - YouTube icon + "Published" badge
  - Link to video
  - "View Analytics" button (later)

### Deliverables
- YouTube OAuth flow working
- Video upload to YouTube with metadata
- Thumbnail upload
- Auto-generated descriptions
- Publish UI with status tracking

---

## 7b. Facebook Integration

### Tasks
- [ ] Facebook Graph API setup
  - Facebook Developer account
  - App creation
  - Video upload permissions
- [ ] Facebook OAuth flow
  - Store tokens in `social_accounts`
- [ ] Facebook upload endpoint: `POST /episodes/:id/publish/facebook`
  - Upload to Page or personal profile
  - Set title, description
  - Upload thumbnail
- [ ] UI for Facebook publishing (extend publish modal)

### Deliverables
- Facebook video upload working
- OAuth flow + token storage
- Publish UI extended for Facebook

---

## 7c. Instagram Reels Integration

### Tasks
- [ ] Instagram Graph API setup
  - Instagram Business account required
  - Content Publishing API
- [ ] Instagram OAuth flow
  - Store tokens in `social_accounts`
- [ ] Instagram upload endpoint: `POST /episodes/:id/publish/instagram`
  - Reels format (9:16 aspect ratio — may need resize)
  - Caption, hashtags
  - Cover frame
- [ ] Video format conversion if needed (16:9 → 9:16)
- [ ] UI for Instagram publishing

### Deliverables
- Instagram Reels upload working
- Aspect ratio conversion if needed
- Publish UI extended for Instagram

---

## 7d. TikTok, X, LinkedIn Integration

### Tasks
- [ ] TikTok Content Posting API
- [ ] X/Twitter Media Upload API
- [ ] LinkedIn UGC API
- [ ] Each follows same pattern: OAuth → upload → metadata → status tracking

### Deliverables
- All 6 platforms supported
- Unified publish modal with platform-specific options

---

## 7e. Thumbnail Generation + A/B Variants

### Tasks
- [ ] Thumbnail generation options:
  - First frame of video
  - Midpoint frame
  - Custom frame (user selects timestamp)
  - AI-generated thumbnail (from episode topic)
- [ ] Thumbnail variants:
  - Generate 3-5 variants
  - User selects which to use per platform
- [ ] Platform-specific thumbnail sizing:
  - YouTube: 1280x720 (16:9)
  - Facebook: 1280x720 (16:9)
  - Instagram: 1080x1920 (9:16) for Reels cover
  - TikTok: 1080x1920 (9:16)
  - X: 1600x900 (16:9)
  - LinkedIn: 1200x627

### Deliverables
- Thumbnail generation with multiple options
- Platform-specific sizing
- A/B variant selection

---

## 7f. Basic Analytics Tracking

### Tasks
- [ ] New collection: `analytics`
  ```
  episode (relation → episodes, required)
  platform (select, required)
  views (number, default: 0)
  likes (number, default: 0)
  comments (number, default: 0)
  shares (number, default: 0)
  watch_time (number, default: 0)  // seconds
  last_synced (date)
  ```
- [ ] Analytics sync endpoints:
  - YouTube Analytics API → pull views, watch time, engagement
  - Facebook Insights → pull views, reactions
  - Each platform has different API + metrics
- [ ] Scheduled analytics sync (daily via cron)
- [ ] Analytics display:
  - Episode detail → "Analytics" tab
  - Dashboard → analytics summary
  - Per-platform breakdown

### Deliverables
- Analytics tracking per episode per platform
- Daily sync via cron
- Analytics display in UI

---

## 7g. OAuth Token Management

### Tasks
- [ ] Token refresh logic:
  - Check token expiry before each upload
  - Auto-refresh using refresh token
  - Notify user if refresh fails (re-auth needed)
- [ ] Token encryption at rest
- [ ] Token revocation handling
- [ ] Multi-account support per platform
- [ ] OAuth connection UI:
  - "Connect YouTube Account" button
  - OAuth redirect flow
  - Account name display after connection
  - "Disconnect" button

### Deliverables
- OAuth token management working
- Auto-refresh + error handling
- Multi-account support
- Connection UI

---

## Acceptance Criteria (Phase 7a minimum)

- [ ] YouTube OAuth flow working
- [ ] Video upload to YouTube with title, description, tags, thumbnail
- [ ] Auto-generated descriptions from episode metadata
- [ ] Publish UI with platform selector and metadata editing
- [ ] Publish status tracking on episode record
- [ ] `social_accounts` collection with OAuth tokens

---

## Notes

- Phase 7 is **distribution** — getting videos out to platforms
- YouTube first (most common use case, best API documentation)
- Other platforms follow same OAuth → upload → track pattern
- Analytics is the last piece — requires periodic API calls
- Token management is critical — expired tokens break automation
