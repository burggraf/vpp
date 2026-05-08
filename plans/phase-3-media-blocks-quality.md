# Phase 3 — Media + Block Generation + Quality Gate

> **Goal:** Media library with asset sourcing, script-to-media analysis, block composition generation, lint/asset quality gate.

**Dependencies:** Phase 2 (orchestrator, pi SDK, research, personalities, scripts, TTS)

**Estimated effort:** 6-8 days

---

## 3.1 Media Library CRUD + Catalog

### Tasks
- [ ] `/media-library` page
  - Grid view with thumbnails
  - Filters: media_type, category, tags
  - Search by name or tags
  - Sort: name, usage_count, created date
- [ ] `/media-library/:id` page
  - File preview (image, audio player, video player)
  - Metadata: name, type, category, tags, license, duration, dimensions
  - Usage history (which episodes used this asset)
  - Edit button
- [ ] Upload modal
  - Drag-drop zone
  - File type detection
  - Auto-tag based on type (e.g., `image` → auto-tag `image`)
  - Name, category, tags, license fields
  - Upload to PB → R2
  - Catalog entry created
- [ ] Bulk upload support
- [ ] Delete with confirmation (check usage_count first)

### Deliverables
- Full media library UI with browse, search, filter, upload, preview
- Files stored in R2 via PB

---

## 3.2 Media Source Registry (extensible)

### Tasks
- [ ] Create media source registry pattern in orchestrator:
  ```typescript
  interface MediaSource {
    id: string;
    name: string;
    type: 'ai-image' | 'stock-photo' | 'stock-video' | 'screen-capture' | 'upload';
    enabled: boolean;
    search(query: string, options: SearchOptions): Promise<MediaAsset[]>;
    download(assetId: string, path: string): Promise<string>;
  }
  ```
- [ ] **Upload source** — always enabled, handles manual uploads
- [ ] **Screen capture source** — puppeteer/Playwright screenshot of URL
- [ ] **Unsplash source** — free API, enabled by default
- [ ] **Pexels source** — free API, enabled by default
- [ ] **Pixabay source** — free API, enabled by default
- [ ] **AI image source** — Gemini API (default), extensible interface
- [ ] Registry stored as config (not hardcoded):
  ```json
  {
    "sources": [
      { "id": "unsplash", "type": "stock-photo", "enabled": true },
      { "id": "pexels", "type": "stock-photo", "enabled": true },
      { "id": "gemini", "type": "ai-image", "enabled": true },
      { "id": "screen-capture", "type": "screen-capture", "enabled": true }
    ]
  }
  ```
- [ ] Settings page to enable/disable sources

### API keys needed
- `UNSPLASH_ACCESS_KEY` (free tier)
- `PEXELS_API_KEY` (free tier)
- `PIXABAY_API_KEY` (free tier)
- `GEMINI_API_KEY` (for AI image generation)

### Deliverables
- Extensible media source registry
- 4 free stock sources + AI image + screen capture working
- Sources configurable via settings

---

## 3.3 Media Analysis Pipeline

### Tasks
- [ ] Create media analysis endpoint: `POST /episodes/:id/media/analyze`
  - Input: approved script segments
  - Orchestrator spawns pi session with prompt:
    ```
    Analyze this script and identify all media assets needed:
    {script_segments}

    For each segment, specify:
    - Required visuals (describe what image/video/graphic is needed)
    - Background music mood/style
    - Transitions between segments
    - Text overlays, lower thirds, captions

    Search the media library first for existing assets.
    Flag any assets that need to be created or sourced.

    Return JSON:
    {
      "segments": [
        {
          "segmentOrder": 1,
          "visualNeeds": "description of needed visual",
          "suggestedAssets": ["media-id-1", "media-id-2"],
          "newAssetsNeeded": ["description 1", "description 2"],
          "musicMood": "upbeat tech",
          "transitionType": "crossfade"
        }
      ],
      "globalNeeds": {
        "backgroundMusic": "free-licensed tech background music",
        "logoAnimation": "animated logo intro"
      }
    }
    ```
  - Save analysis to episode record
  - Returns structured media requirements
- [ ] Media library search integration — for each visual need, search library for matches
- [ ] Gap analysis — identify what's available vs. what needs sourcing

### Deliverables
- Script analysis → media requirements → library search → gap analysis

---

## 3.4 Asset Picker UI

### Tasks
- [ ] `/episodes/:id/media` page
  - Display media analysis results
  - For each segment:
    - Suggested assets from library (clickable cards)
    - "Find alternatives" → search enabled sources
    - Results grid with thumbnails, "select" button
    - New assets flagged as "needs sourcing"
  - "Generate missing" button → spawns pi to create needed assets
  - Background music selector (from music category in library + search sources)
  - Preview assets inline (click to see larger/play audio)
- [ ] Asset-to-block mapping display
  - Shows which assets are assigned to which blocks
  - Drag-and-drop or select-to-assign

### Deliverables
- Media analysis results displayed per segment
- Asset browsing from library + external sources
- Asset selection and assignment to blocks

---

## 3.5 Background Music Integration

### Tasks
- [ ] Curate free-licensed music library:
  - YouTube Audio Library (download common tracks)
  - Free Music Archive (download CC-licensed tracks)
  - Incompetech (download Kevin MacLeod tracks)
  - Store in `media_library` with type `music`, category `background-music`
  - Include license info and attribution requirements
- [ ] Music selector UI in media page
  - Browse available tracks
  - Preview playback
  - Filter by mood/genre/tempo
  - Assign to episode
- [ ] Music asset stored in episode's assets for composition

### Deliverables
- Pre-loaded background music library (free-licensed)
- Music preview and selection UI
- License tracking per track

---

## 3.6 Block Generation Pipeline

### Tasks
- [ ] Create block generation endpoint: `POST /episodes/:id/blocks/generate`
  - Orchestrator spawns pi session with:
    - Channel system_prompt (Style DNA)
    - Approved script with segments
    - TTS audio file paths
    - Selected media assets
    - Channel template (if available)
  - Prompt template:
    ```
    Create a hyperframes video composition for this episode.

    Channel style:
    {style_dna}

    Script segments:
    {script_segments}

    TTS audio files:
    {tts_files}

    Media assets:
    {selected_assets}

    Generate individual block composition files:
    - intro.html — channel intro bumper
    - title.html — episode title card  
    - content-N.html — one per content segment
    - outro.html — channel outro

    Each block must:
    - Use channel fonts and colors from Style DNA
    - Include GSAP animations (paused timeline, registered on window.__timelines)
    - Reference TTS audio via <audio> elements with correct timing
    - Reference media assets via src paths
    - Use data-composition-id, data-start, data-duration, data-track-index

    The episode index.html should reference blocks via data-composition-src.

    Return:
    - File paths for each generated composition
    - Block metadata (type, order, timing, variables)
    ```
  - Pi agent writes composition files to episode directory:
    ```
    compositions/{channel-slug}/{episode-id}/
    ├── index.html
    └── compositions/
        ├── intro.html
        ├── title.html
        ├── content-1.html
        ├── content-2.html
        └── outro.html
    ```
  - Create `blocks` records for each block:
    - `composition_src` → relative path to composition file
    - `order`, `start_time`, `duration`, `track_index`
    - `variables` → dynamic values
    - `assets` → referenced asset paths
  - Update episode `composition_path` and `block_count`

### Deliverables
- Block generation working — script + media + Style DNA → composition files + DB records
- Episode `index.html` assembled from block references

---

## 3.7 Block-to-Composition Assembly

### Tasks
- [ ] Create `assembleIndexHtml()` function in orchestrator
  - Reads all block records for an episode
  - Generates root `index.html` with:
    - `<div data-composition-id="root">` root element
    - `<div data-composition-src="compositions/intro.html">` for each block
    - Correct `data-start`, `data-duration`, `data-track-index` from block records
  - Includes GSAP CDN script tag
  - Registers master timeline
- [ ] Write `index.html` to episode composition directory
- [ ] Relative path resolution — ensure `data-composition-src` resolves correctly from episode dir
- [ ] Validate assembled HTML (basic structure check)

### Deliverables
- `index.html` correctly assembled from blocks
- All composition files in place, paths resolving

---

## 3.8 Quality Gate

### Tasks
- [ ] Create quality gate module: `quality.ts`
- [ ] Quality gate endpoint: `POST /episodes/:id/quality-gate`
  - Runs all checks, returns report:
    1. **`npx hyperframes lint`**
       - Run `npx hyperframes lint ./compositions/{channel}/{episode}`
       - Parse output → structured results
       - Errors = fail, warnings = pass with warnings
    2. **Asset validation**
       - Check all `data-composition-src` files exist
       - Check all referenced media files exist
       - Check all TTS `.wav` files exist
       - Check audio/video src URLs resolve (for external refs)
    3. **Duration validation**
       - Calculate total composition duration (last block end time)
       - Compare to script `estimated_duration`
       - Flag if >10% mismatch
    4. **TTS generation** (if not already done)
       - Run `npx hyperframes tts` for all segments
       - Generate `<audio>` elements in compositions
  - Save report to episode record
  - Return: `{ passed: boolean, errors: [], warnings: [] }`
- [ ] `GET /episodes/:id/quality-gate` — retrieve last report

### QualityGateReport UI component
- [ ] Display quality gate results in episode workspace
  - Pass/fail badge
  - Errors list (blocking)
  - Warnings list (non-blocking)
  - Duration comparison (script vs. composition)
  - "Re-run" button

### Deliverables
- Quality gate runs automatically after block generation
- Lint + asset + duration checks all working
- Report viewable in frontend
- Pass → proceed to preview; Fail → block progression

---

## 3.9 Queue Management

### Tasks
- [ ] Implement queue manager in orchestrator
  - Track active episode (one at a time)
  - Queue of pending episodes
  - Process queue when active episode completes/fails
  - Manual episodes can jump queue or enter at end
- [ ] Queue state API: `GET /queue`
  - Returns: `{ active: episode | null, queue: episode[], totalWaiting: number }`
- [ ] Episode status transitions:
  - When an episode enters `generating` → add to queue
  - When queue processes → update to `in_progress` internally
  - When stage completes → move to next stage or complete

### Deliverables
- Queue system working — one episode at a time
- Queue state visible via API and frontend
- Manual and scheduled episodes both enter queue

---

## Acceptance Criteria

- [ ] Media library fully functional with browse, search, upload
- [ ] Media source registry with 4+ sources (stock, AI, screen capture)
- [ ] Script analysis → media requirements working
- [ ] Asset picker UI with library + external source results
- [ ] Background music library pre-loaded with free-licensed tracks
- [ ] Block generation — script + media + Style DNA → hyperframes compositions
- [ ] `index.html` assembled from blocks with correct references
- [ ] Quality gate — lint + assets + duration → pass/fail report
- [ ] Queue system — one episode at a time, manual + scheduled

---

## Notes

- Phase 3 is the **visual composition** layer — media, blocks, assembly
- Quality gate is critical — prevents broken previews
- Media source registry must be extensible for future paid sources
- Block generation is the most complex pi SDK task — composition HTML is intricate
- Queue system ensures VPS doesn't get overloaded
