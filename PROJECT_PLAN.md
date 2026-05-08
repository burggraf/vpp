# Video Generation Management System

> Manage hyperframes video production at scale — channels, episodes, blocks, agent-driven generation, preview, and rendering.

**Created:** 2026-05-08

---

## Vision

Pi + hyperframes works great for individual video generation. This system adds a management layer on top:

- **Channels** = consistent brand/style containers (fonts, colors, intros, outros, formats)
- **Episodes** = individual video instances belonging to a channel
- **Blocks** = composition-level building blocks (clips, scenes, transitions) within each episode — tracked in DB
- **Agent-driven generation** = pi SDK drives hyperframes composition production
- **Preview + iterate** = live preview, chat-based feedback, then render final MP4
- **Queue-based workflow** — one generation, one preview, one render at a time

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend / DB** | PocketBase 0.38.0 |
| **Frontend** | React + Vite (client-side only, no SSR) |
| **Styling** | Tailwind CSS v3 |
| **UI Components** | shadcn/ui |
| **Video Engine** | hyperframes + ffmpeg + chrome-headless-shell |
| **AI Agent** | pi SDK (`@earendil-works/pi-coding-agent`) embedded in orchestrator |
| **Preview** | hyperframes dev server proxied through frontend `<iframe>` or `<hyperframes-player>` |
| **Storage** | PocketBase file fields → R2-backed (final videos, thumbnails, assets) |
| **Hosting** | Ubuntu VPS |

---

## Why VPS over Tauri

- Headless chrome rendering — no display needed
- CRON automation — generate while laptop closed
- Access from any browser/device
- Centralized storage, no local env drift

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Ubuntu VPS                                 │
│                                             │
│  ┌──────────────┐    ┌───────────────────┐  │
│  │  PocketBase  │◄──►│  React + Vite     │  │
│  │  0.38.0      │    │  (client-only)    │  │
│  │  (port 8090) │    │  (port 5173)      │  │
│  └──────┬───────┘    └─────────┬─────────┘  │
│         │                      │            │
│         │  REST API            │  REST API  │
│         ▼                      ▼            │
│  ┌──────────────────────────────────────┐   │
│  │         Nginx (reverse proxy)        │   │
│  │         + Cloudflare Tunnel          │   │
│  └──────────────────┬───────────────────┘   │
│                     │                        │
│  ┌──────────────────▼───────────────────┐   │
│  │  Orchestrator (Node.js / Bun)        │   │
│  │  - pi SDK (embedded agent session)   │   │
│  │  - hyperframes dev server (single)   │   │
│  │  - render pipeline                   │   │
│  │  - queue manager                     │   │
│  │  (port 3001)                          │   │
│  └──────┬───────────────────────────┬───┘   │
│         │                           │        │
│  ┌──────▼───────┐          ┌───────▼──────┐ │
│  │  pi SDK      │          │  hyperframes │ │
│  │  session     │          │  dev server  │ │
│  │  (code gen)  │          │  (preview)   │ │
│  └──────────────┘          └──────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  Render → PB storage → R2             │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## Database Schema (PocketBase Collections)

### `channels`
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | text | yes | Channel display name |
| `slug` | text | yes | URL-safe identifier |
| `description` | text | no | |
| `style_dna` | json | yes | Style definition (see below) |
| `intro_video` | file | no | Intro asset |
| `outro_video` | file | no | Outro asset |
| `system_prompt` | text | yes | Brand/style instructions for pi agent |
| `status` | select | yes | `active` / `paused` / `archived` |
| `episode_count` | number | no | Cached counter |
| `schedule` | text | no | Cron expression for auto-generation (null = manual only) |
| `schedule_enabled` | bool | no | Whether auto-generation is active |
| `schedule_template` | relation | no | → episode_templates (template for auto-generated episodes) |
| `schedule_auto_advance` | bool | no | Auto-proceed through pipeline or stop at preview |
| `created` | date | auto | |
| `updated` | date | auto | |

### `episodes`
| Field | Type | Required | Notes |
|---|---|---|---|
| `channel` | relation | yes | → channels |
| `title` | text | yes | Episode title |
| `slug` | text | yes | URL-safe identifier |
| `number` | number | no | Episode number |
| `topic` | text | no | Topic/prompt for generation |
| `status` | select | yes | `draft` / `generating` / `preview` / `reviewing` / `rendering` / `complete` / `failed` |
| `composition_path` | text | no | Path to episode's hyperframes `index.html` |
| `preview_url` | text | no | Live preview iframe URL |
| `block_count` | number | no | Cached block count |
| `total_duration` | number | no | Sum of block durations (seconds) |
| `feedback_log` | json | no | Array of feedback iterations (see below) |
| `video_file` | file | no | Final rendered MP4 (PB → R2) |
| `video_url` | text | no | R2 / public URL |
| `thumbnail` | file | no | Generated thumbnail |
| `metadata` | json | no | Resolution, duration, fps, etc |
| `created` | date | auto | |
| `updated` | date | auto | |

### `blocks`
| Field | Type | Required | Notes |
|---|---|---|---|
| `episode` | relation | yes | → episodes |
| `block_type` | select | yes | `intro` / `title` / `content` / `lower_third` / `transition` / `outro` / `caption` |
| `order` | number | yes | Render order within episode |
| `script` | text | no | Script/copy text for this block |
| `composition_src` | text | no | Relative path to hyperframes composition file |
| `start_time` | number | no | Start time in seconds within composition |
| `duration` | number | no | Duration in seconds |
| `track_index` | number | no | Layer/track index in hyperframes |
| `variables` | json | no | Dynamic composition variables (e.g. `{"title": "Hello"}`) |
| `assets` | json | no | Referenced asset paths (images, audio, video) |
| `status` | select | yes | `pending` / `generated` / `approved` / `needs_revision` |
| `created` | date | auto | |
| `updated` | date | auto | |

**Hierarchy:** `channels` → `episodes` → `blocks` (relational, not embedded)

### `personalities`
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | text | yes | Personality display name |
| `slug` | text | yes | URL-safe identifier |
| `description` | text | no | What this voice represents |
| `voice_profile` | json | yes | Voice characteristics (see below) |
| `training_sources` | json | no | Array of source file paths/URLs (blog posts, transcripts) |
| `system_prompt` | text | yes | Full personality system prompt for script generation |
| `sample_output` | text | no | Example script in this voice (for validation) |
| `status` | select | yes | `active` / `draft` / `archived` |
| `created` | date | auto | |
| `updated` | date | auto | |

### `research_results`
| Field | Type | Required | Notes |
|---|---|---|---|
| `episode` | relation | yes | → episodes (which episode this research is for) |
| `query` | text | yes | Original search query/prompt |
| `results` | json | yes | Structured research data (see below) |
| `summary` | text | no | AI-generated summary of findings |
| `sources` | json | no | Array of source URLs used |
| `status` | select | yes | `pending` / `in_progress` / `complete` / `failed` |
| `created` | date | auto | |
| `updated` | date | auto | |

### `scripts`
| Field | Type | Required | Notes |
|---|---|---|---|
| `episode` | relation | yes | → episodes |
| `personality` | relation | no | → personalities (voice used) |
| `research` | relation | no | → research_results (data basis) |
| `content` | text | yes | Full script text |
| `segments` | json | yes | Script broken into timed segments (see below) |
| `word_count` | number | no | |
| `estimated_duration` | number | no | Estimated spoken duration (seconds) |
| `status` | select | yes | `draft` / `generated` / `approved` / `needs_revision` |
| `revision_notes` | text | no | Feedback on script revisions |
| `created` | date | auto | |
| `updated` | date | auto | |

### `media_library`
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | text | yes | Display name |
| `slug` | text | yes | URL-safe identifier |
| `media_type` | select | yes | `image` / `video` / `audio` / `music` / `sfx` / `font` / `graphic` |
| `category` | text | no | Grouping tag (e.g. `background-music`, `bumper`, `title-graphic`) |
| `tags` | json | no | Array of search tags |
| `file` | file | yes | The media file |
| `file_url` | text | no | R2/public URL |
| `duration` | number | no | Duration in seconds (for audio/video) |
| `dimensions` | json | no | `{ width, height }` for images/video |
| `license` | text | no | License/attribution info |
| `usage_count` | number | no | How many episodes used in |
| `description` | text | no | What this asset is, how to use it |
| `created` | date | auto | |
| `updated` | date | auto | |

---

### `voice_profile` (embedded JSON in `personalities`)
```json
{
  "tone": "conversational, slightly sarcastic, enthusiastic about tech",
  "pacing": "fast, energetic",
  "vocabulary": "developer-focused, uses terms like 'ship it', 'prod', 'DX'",
  "avoid": ["corporate jargon", "overly formal language", "AI-sounding phrases"],
  "catchphrases": ["let's dive in", "here's the thing"],
  "sentence_style": "short, punchy sentences. rhetorical questions. direct address (\"you\").",
  "humor_level": "light, self-deprecating tech humor"
}
```

### `research_results.results` (embedded JSON in `research_results`)
```json
[
  {
    "topic": "OpenAI o3 model release",
    "summary": "OpenAI announced o3 with new reasoning capabilities...",
    "url": "https://example.com/article",
    "published": "2026-05-07",
    "relevance_score": 0.95,
    "key_points": ["point 1", "point 2", "point 3"]
  }
]
```

### `scripts.segments` (embedded JSON in `scripts`)
```json
[
  {
    "order": 1,
    "text": "Hey everyone, welcome back to the channel. Today we're talking about...",
    "block_ref": null,
    "estimated_duration": 8,
    "tone_note": "casual intro"
  },
  {
    "order": 2,
    "text": "First up, OpenAI just dropped o3 and it's a big deal...",
    "block_ref": "block-id",
    "estimated_duration": 45,
    "tone_note": "enthusiastic"
  }
]
```

---

### `style_dna` (embedded JSON in `channels`)
```json
{
  "primary_font": "Inter",
  "secondary_font": "JetBrains Mono",
  "color_palette": ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
  "title_position": "center",
  "lower_third_style": "minimal",
  "transition_type": "crossfade",
  "background_style": "gradient",
  "logo_url": "/assets/logo.png",
  "intro_duration": 3,
  "outro_duration": 5,
  "resolution": "1920x1080",
  "fps": 30
}
```

### `style_dna` (embedded JSON in `channels`) — extended
```json
{
  "primary_font": "Inter",
  "secondary_font": "JetBrains Mono",
  "color_palette": ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
  "title_position": "center",
  "lower_third_style": "minimal",
  "transition_type": "crossfade",
  "background_style": "gradient",
  "logo_url": "/assets/logo.png",
  "intro_duration": 3,
  "outro_duration": 5,
  "resolution": "1920x1080",
  "fps": 30,
  "tts_voice": "am_adam",
  "tts_speed": 1.0,
  "research_depth": { "queries": 5, "timeframe": "1 week" }
}
```

### `feedback_log` (embedded JSON in `episodes`)
```json
[
  {
    "iteration": 1,
    "feedback": "Make the title bigger and change the background to blue",
    "timestamp": "2026-05-08T12:00:00Z",
    "agent_response": "Updated title size to 64px, changed bg color",
    "target_block": "block-id-or-null"
  }
]
```

---

## Episode Templates

A template is a saved, approved episode that becomes the starting point for new episodes.

**How it works:**
1. User creates and refines an episode (research → script → media → blocks → preview → approve)
2. User clicks "Save as Template" — the episode's structure becomes a reusable template
3. Template captures:
   - Block structure (types, order, timing relationships)
   - Composition files (intro, title, outro, content block layout)
   - Channel Style DNA reference
   - Optional: personality, media library references (background music, etc.)
4. New episodes can be created from a template — structure pre-built, only topic/research/script changes

**Multiple templates per channel:**
- `regular` — weekly episode format
- `monthly-recap` — longer format, more segments, different structure
- `special-event` — unique format for launches, announcements
- Templates stored in `episode_templates` collection

### `episode_templates` (new collection)
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | text | yes | Template display name |
| `slug` | text | yes | URL-safe identifier |
| `channel` | relation | yes | → channels |
| `source_episode` | relation | no | → episodes (origin episode, null = hand-built) |
| `description` | text | no | What this template is for |
| `block_structure` | json | yes | Template block layout (types, order, timing) |
| `composition_files` | json | yes | Paths to template composition files |
| `default_personality` | relation | no | → personalities (suggested voice) |
| `default_research_depth` | json | no | Override channel default for episodes from this template |
| `default_duration` | number | no | Target duration in seconds |
| `variables` | json | no | Template variables to fill per episode (e.g. `{episode_title}`, `{topic}`) |
| `usage_count` | number | no | How many episodes created from this template |
| `status` | select | yes | `active` / `archived` |
| `created` | date | auto | |
| `updated` | date | auto | |

---

## Scheduled Episode Generation

VPS enables automation via CRON-style scheduling.

**Schedule config per channel:**
- `schedule` field in `channels` collection (cron expression or preset)
- `enabled` toggle (some channels manual-only)
- `template` reference (which template to use for auto-generated episodes)
- `auto_advance` — whether to auto-proceed through pipeline stages or stop at preview for approval

**Queue integration:**
- Scheduler creates episode records in `draft` status at scheduled times
- Queue manager processes them sequentially (one at a time)
- If a scheduled time arrives and an episode is already being processed, the new one queues
- User can always create manual episodes that jump ahead or enter the queue

**Scheduler design:**
- Lightweight cron service within orchestrator (no separate scheduler needed)
- Uses `node-cron` or similar
- On tick: creates episode from template → enqueues → status updates flow naturally through pipeline
- Configurable per channel: "every Monday at 9am, auto-generate from 'regular' template, stop at preview"

---

## Quality Gate (Before Preview)

After block generation, before the user sees the preview:

1. **`npx hyperframes lint`** — structural validation
   - Missing GSAP scripts, invalid attributes, composition ID mismatches
   - Errors block progression; warnings shown but don't block
2. **Asset validation** — all `data-composition-src` files exist
   - All referenced images, audio, video files resolve
   - Media URLs accessible (for external references)
3. **Duration validation** — script estimated duration vs. actual composition duration
   - Flag if mismatch > 10%
4. **TTS generation** — generate narration audio from script
   - `npx hyperframes tts` with channel's default voice
   - Audio files placed in episode assets directory
   - `<audio>` elements added to composition blocks
5. **Lint results saved** to episode record for debugging

If quality gate passes → preview server starts automatically.
If it fails → episode status set to `failed`, user notified with lint report.

---

## TTS / Narration (via HyperFrames)

HyperFrames has built-in TTS via Kokoro-82M local model — free, no API needed.

**Capabilities:**
- `npx hyperframes tts "text"` — generate speech from text
- `npx hyperframes tts script.txt` — read from file
- `--voice <name>` — select voice (list via `npx hyperframes tts --list`)
- `--speed <factor>` — control pace (0.8 slow, 1.1 fast)
- `--output narration.wav` — save to specific file

**Integration in pipeline:**
- Channel defines a `tts_voice` in Style DNA (e.g., `am_adam`)
- After script approval, orchestrator runs `npx hyperframes tts` per script segment
- Generated `.wav` files placed in episode assets directory
- `<audio>` elements added to composition blocks with correct timing
- Audio mixed with background music during render via `processCompositionAudio()`

**Transcription (optional):**
- `npx hyperframes transcribe audio.mp3` — local whisper.cpp
- Used for transcribing source video transcripts for personality training

---

## Full Episode Pipeline

The episode creation pipeline has 5 stages before preview/render:

```
Research → Script (personality) → TTS → Media Gathering → Block Generation → Quality Gate → Preview → Render
   │            │                     │           │                    │               │             │         │
   ▼            ▼                     ▼           ▼                    ▼               ▼             ▼         ▼
 research_   scripts              TTS audio    media_library        blocks        lint +        preview   final
 results     (voice + data)       generated    (cataloged assets)   (compositions) validate     player    MP4
```

**Scheduled flow** (auto-generated episodes):
```
Scheduler (cron) → create episode from template → enqueue → full pipeline → stop at preview (or auto-advance)
```

### Stage 1: Research
**Purpose:** Gather current, relevant data as the factual basis for the episode.

- User provides a research query (e.g., "AI developer news from the past week")
- Orchestrator spawns pi session with web search capabilities
- Pi searches, reads, compiles structured findings
- Results saved to `research_results` collection with sources, summaries, key points
- Research is reviewable/editable before proceeding to script

**Research prompt template:**
```
Search the web for {topic} from the past {timeframe}.
For each finding, extract:
- Headline and summary
- Key facts and data points
- Source URL and publication date
- Why this matters to {target_audience}
Return structured JSON with relevance scores.
```

### Stage 2: Script Generation (with Personality)
**Purpose:** Write the episode script in a specific voice, using research data.

- User selects a personality (or creates a new one)
- Orchestrator spawns pi session with:
  - Personality's `system_prompt` (voice profile, tone, style)
  - Research results as factual input
  - Channel context (topic, target length)
- Pi generates script text with natural voice (not generic AI)
- Script saved to `scripts` collection, broken into timed segments
- Each segment maps to a future block in the composition
- Script is reviewable/editable — user can request rewrites in chat

**Personality training workflow:**
1. User feeds training sources (blog posts, transcripts, articles)
2. Pi analyzes the sources for voice patterns:
   - Sentence length, structure, rhythm
   - Vocabulary choices, catchphrases, filler words
   - Tone, humor, formality level
   - Rhetorical devices (questions, direct address, etc.)
3. Pi generates a `voice_profile` JSON + `system_prompt`
4. User reviews, edits, validates with sample output
5. Personality saved and reusable across episodes

**Script prompt template:**
```
You are writing as {personality_name}. Here is your voice profile:
{voice_profile}

Write a script for a video about {topic}.
Use these research findings as factual basis:
{research_results}

Target duration: {duration} seconds.
Break the script into segments, each mapping to a video block.
```

### Stage 3: TTS Narration
**Purpose:** Generate voiceover audio from the approved script.

- Channel defines `tts_voice` in Style DNA (e.g., `am_adam`)
- Orchestrator runs `npx hyperframes tts` per script segment or full script
- Generated `.wav` files placed in episode assets directory
- `<audio>` elements prepared for composition blocks
- TTS speed adjustable per channel (`--speed 1.0`)
- User can preview TTS output before proceeding

### Stage 4: Media Gathering & Creation
**Purpose:** Collect all visual, audio, and graphic assets needed for the episode.

- Orchestrator analyzes the script for media needs:
  - What visuals support each segment?
  - What background music fits the tone?
  - What transitions, graphics, bumpers are needed?
- Two asset sources:
  1. **Media Library** — reuse existing cataloged assets (background music, bumpers, logos, title graphics)
  2. **AI-generated** — pi generates/creates new assets (images, graphics, TTS narration)
- All assets cataloged in `media_library` with tags, categories, usage tracking
- Asset-to-block mapping: each block references its needed assets

**Media gathering prompt template:**
```
Analyze this script and identify all media assets needed:
{script_segments}

For each segment, specify:
- Required visuals (images, video clips, graphics)
- Background music mood/style
- Transitions between segments
- Text overlays, lower thirds, captions

Search the media library for existing assets first.
Flag any assets that need to be created or sourced.
```

### Stage 6: Block Generation
**Purpose:** Assemble script + media + style into hyperframes compositions.

- Orchestrator spawns pi session with:
  - Channel's `system_prompt` (Style DNA)
  - Approved script with segments
  - Selected media assets
  - Channel template (base composition structure)
- Pi generates individual block composition files:
  - `intro.html` — channel intro bumper
  - `title.html` — episode title card
  - `content-N.html` — one per content segment
  - `outro.html` — channel outro
- Each block includes:
  - Script text as on-screen text or voiceover timing
  - TTS audio references (`<audio>` elements with correct timing)
  - Media references (images, video, audio)
  - Styling from channel Style DNA
  - GSAP animations, transitions
- Episode `index.html` assembled with `data-composition-src` references
- Blocks saved to `blocks` collection with composition paths, timing, variables

### Stage 7: Quality Gate
**Purpose:** Validate composition before preview.

1. `npx hyperframes lint` — structural validation (missing GSAP, invalid attributes, composition ID mismatches)
2. Asset validation — all `data-composition-src` files exist, media URLs resolve
3. Duration validation — script estimated duration vs. actual composition duration (flag if >10% mismatch)
4. Lint results saved to episode record
5. If pass → preview server starts; if fail → episode marked `failed` with lint report

### Stage 8: Preview + Feedback
**Purpose:** Review, iterate, and approve the final composition.

- Orchestrator starts hyperframes dev server (single instance)
- Frontend loads preview via `<iframe>` or `<hyperframes-player>`
- User watches, provides feedback via chat interface
- `session.steer()` sends corrections to pi session
- Pi updates affected block compositions
- Hot-reload reflects changes in preview
- Feedback logged with block targeting

### Stage 9: Render
**Purpose:** Produce final MP4.

- User clicks "Render Final"
- Orchestrator runs `npx hyperframes render`
- MP4 saved, uploaded to R2 via PocketBase storage
- Episode marked `complete`
- Media library `usage_count` incremented for referenced assets

---

## Queue Discipline
- One active episode at a time — one generation, one preview, one render
- Episode status tracks queue position; orchestrator processes top of queue
- Each pipeline stage is sequential within an episode
- User can review/approve at each stage before proceeding

---

## Orchestrator Design

Lightweight Node.js/Bun service (`orchestrator/`). Responsibilities:

- **Agent Management** — embedded pi SDK (`createAgentSession`)
  - Per-episode agent sessions with `SessionManager.inMemory()`
  - `session.prompt()` for generation, `session.steer()` for feedback
  - Event subscription for streaming tool calls, text deltas, completion
- **Queue Management** — single active episode, queue-based processing
- **Dev Server Management** — start/stop hyperframes preview (single instance)
  - Dynamic port allocation, tracked in orchestrator state
  - Health checks to detect dead servers
- **Render Pipeline** — execute `npx hyperframes render`, handle output
- **PocketBase Sync** — update episode/block status, URLs, metadata via PB REST API
- **Asset Management** — move rendered files to PB → R2

### Orchestrator API (internal)

```
# Research
POST /episodes/:id/research        — trigger research (query → results)
GET  /episodes/:id/research/:rid   — get research results

# Personality
POST /personalities/train           — analyze sources, generate voice profile + prompt
POST /personalities/:id/validate    — generate sample output for review

# Script
POST /episodes/:id/script/generate  — generate script (personality + research → script)
POST /episodes/:id/script/revise    — request script revision via steer

# Media
POST /episodes/:id/media/analyze    — analyze script for media needs
POST /episodes/:id/media/gather     — search library + generate new assets
GET  /media-library                 — list/search cataloged assets
POST /media-library/upload          — upload + catalog new asset

# Blocks
POST /episodes/:id/blocks/generate  — generate block compositions
POST /episodes/:id/blocks/revise    — revise specific blocks via steer

# Preview
POST /episodes/:id/preview/start    — start preview server (returns URL)
DELETE /episodes/:id/preview        — stop preview server
POST /episodes/:id/feedback         — submit feedback iteration (steer)

# Templates
POST /channels/:id/templates/save   — save episode as template
POST /channels/:id/templates/:id/use — create episode from template
GET  /channels/:id/templates        — list channel templates

# Scheduling
POST /channels/:id/schedule         — set/update schedule
POST /channels/:id/schedule/toggle  — enable/disable schedule
GET  /scheduler/next                — next scheduled episode times

# Quality Gate
POST /episodes/:id/quality-gate     — run lint + asset validation
GET  /episodes/:id/quality-gate     — get last quality gate results

# TTS
POST /episodes/:id/tts/generate     — generate narration audio
POST /episodes/:id/tts/preview      — preview TTS voice + speed

# Render
POST /episodes/:id/render           — trigger final render
GET  /episodes/:id/status           — check current status
GET  /queue                         — check queue state

# Channels
GET  /channels/:id/templates        — list channel template compositions
```

---

## Frontend (React + Vite + Tailwind v3 + shadcn/ui)

### Pages

| Route | Purpose |
|---|---|
| `/` | Dashboard — overview of channels, recent episodes, queue status |
| `/channels` | Channel list — create, edit, archive channels |
| `/channels/:slug` | Channel detail — episodes list, style editor, system prompt, schedule |
| `/channels/:slug/schedule` | Channel schedule — cron builder, toggle, next-run display |
| `/channels/:slug/templates` | Channel templates — list, preview, create from template |
| `/channels/:slug/new` | New episode wizard — choose template or start blank |
| `/personalities` | Personality library — create, train, manage voices |
| `/personalities/:slug` | Personality detail — voice profile, training sources, sample output |
| `/personalities/:slug/train` | Personality training wizard — upload sources, analyze, validate |
| `/media-library` | Media catalog — browse, search, upload, tag assets |
| `/media-library/:id` | Media detail — preview, metadata, usage history |
| `/episodes/:id` | Episode workspace — pipeline stages, preview, chat feedback, render |
| `/episodes/:id/research` | Research stage — query, results browser, edit findings |
| `/episodes/:id/script` | Script stage — view/edit script, personality selector, revision chat |
| `/episodes/:id/media` | Media stage — asset suggestions, library browser, upload |
| `/episodes/:id/blocks` | Block editor — view/edit individual block compositions |
| `/episodes/:id/edit` | Episode metadata editor |
| `/settings` | App settings — R2 config, pi agent config, paths |

### Key Components

- **ChannelCard** — channel summary with style preview swatches
- **EpisodeCard** — episode status badge, pipeline stage indicator, actions
- **TemplateCard** — template preview, usage count, "create episode" action
- **PipelineStepper** — visual stepper showing research → script → media → TTS → blocks → quality gate → preview → render
- **ResearchResults** — browsable research findings with source links, edit capability
- **ScriptEditor** — script viewer/editor with segment breakdown, duration estimates
- **PersonalitySelector** — dropdown + preview of voice characteristics
- **VoiceProfileViewer** — display personality traits, tone, vocabulary, sample output
- **MediaGrid** — browsable/searchable media library with thumbnails, filters
- **MediaCard** — individual asset preview, metadata, usage count
- **AssetPicker** — modal for selecting media assets from library for a block
- **BlockList** — ordered list of episode blocks with status badges
- **BlockCard** — individual block details (type, script, duration, composition, assets)
- **PreviewPlayer** — `<iframe>` or `<hyperframes-player>` wrapper with controls
- **FeedbackPanel** — chat-like feedback history + input (steer-based)
- **StatusBadge** — color-coded lifecycle stage
- **StyleDNAEditor** — form for editing channel style tokens
- **SystemPromptEditor** — textarea with template variable hints
- **RenderProgress** — progress indicator for render jobs
- **QueueStatus** — shows current queue position and active episode
- **ScheduleBuilder** — cron expression builder with human-readable preview
- **QualityGateReport** — lint results, asset validation, duration check display

### PocketBase Integration

- Use `pocketbase` JS SDK
- Client-side only — direct REST calls to PB
- Real-time subscriptions for episode/block status updates
- Auth via PB admin or API tokens

---

## Preview System (Remote VPS)

### Approach: Nginx Path-Based Proxy

```
Nginx config:

/app           → React Vite build
/api/*         → PocketBase
/preview/*     → hyperframes dev server (single active instance)
/orchestrator  → Orchestrator API
```

- Single hyperframes dev server at a time (queue-based)
- Nginx proxies `/preview` to the active backend port
- Frontend iframe/player src = `/preview`
- Cloudflare Tunnel exposes everything to public URL

---

## Directory Structure

```
vpp/
├── pb/                          # PocketBase data + binary
│   ├── pocketbase               # PB binary
│   └── pb_data/                 # PB data directory
├── orchestrator/                # Node.js/Bun orchestrator service
│   ├── src/
│   │   ├── index.ts             # Entry point + queue manager
│   │   ├── agent.ts             # pi SDK session manager
│   │   ├── research.ts          # research stage (web search → structured results)
│   │   ├── personality.ts       # personality training + script generation
│   │   ├── media.ts             # media analysis, library search, asset generation
│   │   ├── tts.ts               # TTS narration (Kokoro via hyperframes)
│   │   ├── quality.ts           # lint + asset validation gate
│   │   ├── scheduler.ts         # cron-based auto-generation
│   │   ├── preview.ts           # hyperframes dev server manager
│   │   ├── render.ts            # render pipeline
│   │   ├── blocks.ts            # block generation + assembly
│   │   ├── templates.ts         # episode template save/load
│   │   ├── pocketbase.ts        # PB client
│   │   └── config.ts            # Configuration
│   ├── package.json
│   └── tsconfig.json
├── frontend/                    # React + Vite + Tailwind + shadcn
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Channels.tsx
│   │   │   ├── ChannelDetail.tsx
│   │   │   ├── ChannelSchedule.tsx
│   │   │   ├── ChannelTemplates.tsx
│   │   │   ├── NewEpisode.tsx
│   │   │   ├── EpisodeWorkspace.tsx
│   │   │   ├── BlockEditor.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   │   └── pocketbase.ts    # PB SDK client
│   │   └── styles/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
├── compositions/                # hyperframes compositions
│   └── :channel-slug/
│       └── :episode-id/
│           ├── index.html           # Episode root composition
│           └── compositions/        # Block composition files
│               ├── intro.html
│               ├── title.html
│               ├── content.html
│               └── outro.html
├── renders/                     # rendered MP4 output (before R2 upload)
├── assets/                      # channel-level shared assets (intros, outros, logos)
├── nginx/                       # Nginx configuration
│   └── vpp.conf
└── PROJECT_PLAN.md              # This file
```

---

## Key Technical Decisions

### pi Agent Communication
- **Decision:** pi SDK (`@earendil-works/pi-coding-agent`)
  - `createAgentSession()` with `AuthStorage`, `ModelRegistry`, `SessionManager`
  - `session.prompt()` for generation, `session.steer()` for mid-stream corrections
  - Event subscription for real-time progress feedback
  - No subprocess framing needed; direct TypeScript integration
  - **Multiple session types:** research session, script session, block session (each with different tools/prompts)

### Research Pipeline
- **Web search:** pi uses `web_search` tool (Perplexity/Exa/Gemini) for current data
- **Structured output:** results saved as JSON with source URLs, summaries, key points, relevance scores
- **Review gate:** user reviews/approves research before script generation proceeds
- **Reusability:** research results persisted in DB, linkable to future episodes

### Video Research (pi-watch — optional)
- **`@artale/pi-watch`** — pi extension for video analysis
- **Use cases:** competitive analysis, style breakdown, content research
  - Input: YouTube/TikTok/Loom URL or local video file
  - Process: download → extract frames → transcribe/captions → LLM analyzes
  - Output: structured breakdown (key moments, style notes, visual patterns)
- **Cost:** YouTube = free (captions), others ~$0.01 (Groq Whisper transcription)
- **Research workflow:** user provides competitor video URL → pi-watch analyzes → results saved to `research_results` alongside web search findings
- **Integration:** optional pi extension, installed via `npm install @artale/pi-watch`

### Personality Training
- **Source material:** blog posts, video transcripts, articles uploaded as text files
- **Training method:** pi analyzes sources → generates `voice_profile` JSON + `system_prompt`
- **Validation:** generate sample script, user reviews/edits, iterate until voice matches
- **Storage:** personality saved to `personalities` collection, reusable across episodes
- **Prompt engineering:** personality `system_prompt` prepended to script generation prompts alongside channel style DNA

### Media Asset Sourcing (extensible registry)
- **AI image generation** — Gemini (default), pluggable: DALL-E, Midjourney, Flux, etc.
- **Stock photo/video APIs** — Unsplash, Pexels, Pixabay (free, enabled by default). Extensible for paid sources later.
- **Screen captures** — pi captures screenshots of websites, GitHub repos, product pages
- **User uploads** — manual drag-drop upload
- **All sources configurable** — data-driven registry with enable/disable per source
- **Media Library** — catalog-driven, all assets tagged, categorized, searchable
- **Reuse-first** — search library before generating/sourcing new assets
- **Usage tracking** — `usage_count` incremented per episode use
- **Categories** — `background-music`, `bumper`, `title-graphic`, `logo`, `transition`, `sfx`, `font`, `image`, `video`
- **Upload workflow** — drag-drop → auto-tag → preview → save to library
- **Storage** — files in PocketBase → R2; metadata in DB

### Background Music
- **Source:** free-licensed music libraries only (YouTube Audio Library, Free Music Archive, Incompetech, etc.)
- **Licensing tracking** — each music asset stores license type, attribution requirements
- **No paid subscriptions** in Phase 1-6

### Preview Server Strategy
- One hyperframes dev server at a time (queue-based)
- Dynamic port allocation, tracked in orchestrator state
- Nginx reverse proxy for clean URL structure
- Auto-shutdown when episode moves past preview stage

### Asset Storage
- PocketBase file fields for active assets (thumbnails, intros, outros)
- R2-backed PocketBase storage for final rendered videos
- Local VPS disk for active composition files

### Block Composition Assembly
- Blocks stored in DB with `composition_src` paths
- Episode `index.html` assembled from block `data-composition-src` references
- Pi agent generates/updates individual block composition files
- Hyperframes resolves `data-composition-src` relative to episode directory

### Security
- Nginx auth for preview endpoints (prevent unauthorized access)
- PocketBase auth rules for API access
- Cloudflare Tunnel with access rules (optional)

---

## Milestones

### Phase 1 — Foundation
- [ ] PocketBase 0.38.0 setup with collections (channels, episodes, blocks, personalities, research_results, scripts, media_library, episode_templates)
- [ ] React + Vite + Tailwind v3 + shadcn/ui scaffold
- [ ] Basic CRUD for channels, episodes, blocks, templates (hierarchical)
- [ ] PocketBase auth + access rules
- [ ] R2-backed storage configuration
- [ ] Channel schedule fields (cron, enabled, template, auto_advance)

### Phase 2 — Research + Personality + TTS
- [ ] Research pipeline (pi session → web search → structured results → `research_results`)
- [ ] pi-watch integration (`@artale/pi-watch` — optional video analysis for competitive research)
- [ ] Research depth config — channel default (queries/timeframe) + per-episode override
- [ ] Research results UI (browse, edit, approve)
- [ ] Personality collection CRUD
- [ ] Personality training workflow (upload 10-15 blog posts/articles → pi analyzes → generate voice profile)
- [ ] Corpus quality feedback — flag if too thin (<5 sources)
- [ ] Personality validation (sample script generation)
- [ ] Script generation pipeline (personality + research → script → `scripts` collection)
- [ ] Script editor UI with segment breakdown
- [ ] TTS integration (`npx hyperframes tts` — Kokoro-82M local model, free)
- [ ] TTS voice config in channel Style DNA
- [ ] TTS audio generation + `<audio>` element injection into compositions

### Phase 3 — Media + Block Generation + Quality Gate
- [ ] Media library CRUD + catalog system
- [ ] Media source registry (Gemini AI images, Unsplash/Pexels/Pixabay free stock, screen capture, uploads)
- [ ] Media analysis pipeline (script → asset requirements)
- [ ] Media library search + asset picker UI
- [ ] Asset upload + cataloging workflow
- [ ] Background music library integration (free-licensed sources)
- [ ] Block generation pipeline (script + media + style DNA → compositions)
- [ ] Block-to-composition assembly (`index.html` from `data-composition-src` refs)
- [ ] Quality gate: `npx hyperframes lint` + asset validation + duration check + TTS audio generation
- [ ] Queue management (one active episode at a time)

### Phase 4 — Preview + Feedback + Templates
- [ ] Hyperframes dev server (single instance, queue-based)
- [ ] Nginx reverse proxy to preview endpoint
- [ ] Preview `<iframe>` or `<hyperframes-player>` in episode workspace
- [ ] Chat-based feedback loop (`session.steer()` → agent updates blocks → hot reload)
- [ ] Feedback iteration logging with block targeting
- [ ] Pipeline stepper UI component
- [ ] Episode template system (save as template, create from template)
- [ ] Template UI — list, preview, select for new episode

### Phase 5 — Rendering + Storage + Scheduling
- [ ] Render pipeline (`npx hyperframes render`)
- [ ] MP4 upload to PocketBase → R2
- [ ] Thumbnail generation
- [ ] Episode completion workflow
- [ ] Scheduler service (`node-cron` — per-channel cron, queue integration)
- [ ] Schedule UI — cron builder, toggle, next-run display
- [ ] Auto-advance through pipeline stages for scheduled episodes

### Phase 6 — Polish
- [ ] Dashboard with stats
- [ ] Real-time status updates (PB real-time subscriptions)
- [ ] Error handling + retry logic
- [ ] Nginx + Cloudflare Tunnel deployment
- [ ] Documentation

### Phase 7 — Social Distribution (Future)
- [ ] **YouTube** (Data API v3) — video, title, description, tags, thumbnail — **start here**
- [ ] Facebook video upload (Graph API)
- [ ] Instagram Reels upload (Graph API)
- [ ] TikTok video upload (Content Posting API)
- [ ] X/Twitter video upload (Media Upload API)
- [ ] LinkedIn video upload (UGC API)
- [ ] Thumbnail generation + A/B variants
- [ ] Auto-generated descriptions from episode metadata
- [ ] Basic analytics tracking (views, engagement per platform)
- [ ] OAuth token management per channel per platform

---

## Open Questions

_No open questions — all resolved during planning session._

---

## Environment Variables

```env
# PocketBase
PB_URL=http://localhost:8090
PB_ADMIN_EMAIL=admin@vpp.local
PB_ADMIN_PASSWORD=****

# Orchestrator
ORCHESTRATOR_PORT=3001
HYPERFRAMES_PORT=4000              # Single preview server port
COMPOSITIONS_DIR=./compositions
RENDERS_DIR=./renders

# Cloudflare R2 (PB storage backend)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=

# Groq API (optional — for pi-watch transcription)
GROQ_API_KEY=

# Cloudflare Tunnel (optional)
CF_TUNNEL_TOKEN=
```
