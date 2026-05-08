# Phase 2 — Research + Personality + TTS

> **Goal:** Web research pipeline, personality training system, script generation with voice, TTS narration via HyperFrames Kokoro.

**Dependencies:** Phase 1 (all collections, CRUD, auth, R2)

**Estimated effort:** 5-7 days

---

## 2.1 Orchestrator Service Scaffold

### Tasks
- [x] Create `orchestrator/` directory with Bun/Node.js project
- [x] Set up `package.json` with dependencies:
  - `@earendil-works/pi-coding-agent` (pi SDK)
  - `pocketbase` (PB admin client)
  - `express` or `hono` (HTTP API)
  - `node-cron` (later, for Phase 5 scheduler)
  - `zod` (validation)
  - `dotenv` (config)
- [x] Create config module — env vars, paths, PB URL, ports
- [x] Create PB admin client wrapper (server-side, uses admin token)
- [x] Create basic HTTP server with health check endpoint
- [x] Set up TypeScript config, build pipeline

### Directory structure
```
orchestrator/
├── src/
│   ├── index.ts           # Entry point + HTTP server
│   ├── config.ts          # Env vars, paths
│   ├── pocketbase.ts      # PB admin client
│   ├── agent.ts           # pi SDK session manager
│   ├── research.ts        # Research pipeline
│   ├── personality.ts     # Personality training + script gen
│   ├── tts.ts             # TTS via hyperframes
│   └── types.ts           # Shared types
├── package.json
└── tsconfig.json
```

### Deliverables
- Orchestrator running on `localhost:3001`
- Health check: `GET /health` → 200
- PB admin client connected
- Environment config loaded

---

## 2.2 pi SDK Integration

### Tasks
- [x] Install `@earendil-works/pi-coding-agent`
- [x] Create `createSession()` factory:
  - `AuthStorage.create()` + `ModelRegistry.create()`
  - `SessionManager.inMemory()`
  - Configurable model/provider via env vars
- [x] Create session manager — tracks active sessions per episode
- [x] Event subscription wrapper — stream tool calls, text, completion to API
- [x] Test session: `session.prompt("Hello")` → verify response

### Session types
```typescript
// Research session — web search tools enabled
createResearchSession(episodeId: string)

// Script session — personality context + research input
createScriptSession(episodeId: string, personalityId: string)

// Block session — Style DNA + script + media context
createBlockSession(episodeId: string, channelId: string)
```

### Deliverables
- pi SDK integrated and working
- Session factory creates sessions with correct tools
- Event streaming working
- Multiple session types supported

---

## 2.3 Research Pipeline

### Tasks
- [x] Create `research.ts` module
- [x] Implement research endpoint: `POST /episodes/:id/research`
  - Accept query string + optional timeframe override
  - Create `research_results` record (status: `in_progress`)
  - Spawn pi research session
  - Prompt template:
    ```
    Search the web for {topic} from the past {timeframe}.
    For each finding, extract:
    - Headline and summary
    - Key facts and data points
    - Source URL and publication date
    - Why this matters to {target_audience}
    Return structured JSON with relevance scores.
    ```
  - Parse response → save to `research_results.results` (JSON)
  - Update status to `complete` or `failed`
- [x] Create `GET /episodes/:id/research/:rid` endpoint
- [x] Create `GET /episodes/:id/research` — list all research for episode
- [x] Error handling + retry logic
- [x] Research depth config:
  - Read from channel `style_dna.research_depth`
  - Per-episode override in request body
  - Default: 5 queries, 1 week timeframe

### pi-watch Integration (optional — deferred)
- [x] Install `@artale/pi-watch` extension
- [x] Create video research endpoint: `POST /episodes/:id/research/video`
  - Accept YouTube/TikTok/Loom URL
  - Run pi-watch analysis
  - Save structured output to `research_results`
- [x] Groq API key config (optional, for transcription)

### Deliverables
- Research endpoint working — query → pi search → structured results → DB
- Research depth configurable per channel + per-episode override
- Research results viewable in frontend
- pi-watch optional integration working

---

## 2.4 Research Results UI

### Tasks
- [x] `/episodes/:id/research` page
  - Research query form (text input + timeframe selector)
  - "Run Research" button → calls orchestrator API
  - Results display:
    - Card per finding with headline, summary, source link, relevance score
    - Editable fields (user can fix summaries, add notes)
    - "Approve" button to mark research complete
  - Loading state during research
  - Error state with retry option
- [x] Research status badge in episode workspace
- [x] Link from episode workspace → research page

### Deliverables
- Full research UI with query, results browser, edit, approve
- Status tracking visible in episode workspace

---

## 2.5 Personality System

### Personality CRUD
- [x] `/personalities` — list page with card view
- [x] `/personalities/:slug` — detail page:
  - Voice profile display (formatted, not raw JSON)
  - Training sources list
  - System prompt (collapsible)
  - Sample output display
  - Edit button
- [x] Create personality form — name, description

### Personality Training Workflow
- [x] `/personalities/:slug/train` — training wizard:
  - **Step 1:** Upload training sources
    - Drag-drop text files (blog posts, articles, transcripts)
    - Or paste text directly
    - Show file list with character counts
    - Minimum 5 sources recommended, flag if <5
  - **Step 2:** Analyze
    - "Analyze" button → calls `POST /personalities/train`
    - Orchestrator spawns pi session with prompt:
      ```
      Analyze these writing samples for voice patterns:
      {source_texts}

      Extract:
      - Sentence length and structure patterns
      - Vocabulary choices, jargon, catchphrases
      - Tone (formality, humor, energy)
      - Rhetorical devices (questions, direct address)
      - What to avoid (AI-sounding phrases, clichés)

      Return:
      1. voice_profile JSON (tone, pacing, vocabulary, avoid, catchphrases, sentence_style, humor_level)
      2. system_prompt for script generation (full prompt that would make an AI write like this)
      ```
    - Save `voice_profile` + `system_prompt` to personality record
  - **Step 3:** Validate
    - "Generate Sample" button → calls `POST /personalities/:id/validate`
    - Pi generates a sample script using the personality
    - Display sample output side-by-side with source samples
    - User can approve or request adjustments
    - Iteration: user feedback → regenerate → repeat
  - **Step 4:** Save
    - Personality saved as `active`

### Deliverables
- Personality CRUD fully functional
- Training wizard with upload → analyze → validate → save flow
- Sample generation and iteration
- Corpus quality feedback (<5 sources warning)

---

## 2.6 Script Generation Pipeline

### Tasks
- [x] Create script generation endpoint: `POST /episodes/:id/script/generate`
  - Request body: `{ personalityId, researchId?, targetDuration? }`
  - Create `scripts` record (status: `draft`)
  - Spawn pi script session with:
    - Personality system_prompt
    - Voice profile
    - Research results (if provided)
    - Channel context (topic, style DNA)
  - Prompt template:
    ```
    You are writing as {personality_name}. Here is your voice profile:
    {voice_profile}

    Write a script for a video about {topic}.
    Use these research findings as factual basis:
    {research_results}

    Target duration: {duration} seconds (~{words} words at 150wpm).
    Break the script into segments, each mapping to a video block.

    Return JSON:
    {
      "content": "full script text",
      "segments": [
        {"order": 1, "text": "...", "estimated_duration": N, "tone_note": "..."}
      ]
    }
    ```
  - Parse response → save to `scripts` collection
  - Calculate word_count and estimated_duration
  - Update status to `generated`
- [x] Script revision endpoint: `POST /episodes/:id/script/revise`
  - Uses `session.steer()` for mid-stream correction
  - Or spawns new session with feedback + previous script as context
- [x] Script approval endpoint: `POST /episodes/:id/script/approve`

### Deliverables
- Script generation working — personality + research → segmented script → DB
- Script revision via feedback
- Approval workflow

---

## 2.7 Script Editor UI

### Tasks
- [x] `/episodes/:id/script` page
  - Personality selector dropdown (with preview of voice characteristics)
  - "Generate Script" button → calls orchestrator API
  - Script display:
    - Full text view (readable format)
    - Segment breakdown table (order, text, duration, tone note)
    - Word count + estimated duration display
  - Edit mode — user can edit segments directly
  - "Request Revision" — text input → sends feedback to orchestrator
  - "Approve" button → marks script as approved
  - Loading state during generation
- [x] Link from episode workspace → script page

### Deliverables
- Full script UI with generation, editing, revision, approval
- Personality selector with voice preview
- Segment breakdown with duration estimates

---

## 2.8 TTS Integration

### Tasks
- [x] Create `tts.ts` module
- [x] Implement TTS generation: `POST /episodes/:id/tts/generate`
  - Read channel `style_dna.tts_voice` and `tts_speed`
  - For each script segment:
    - Run `npx hyperframes tts "{segment.text}" --voice {voice} --speed {speed} --output {path}`
  - Save generated `.wav` file paths to script segments
  - Update episode status if needed
- [x] TTS preview endpoint: `POST /episodes/:id/tts/preview`
  - Generate TTS for first segment only
  - Return audio file URL for playback in frontend
- [x] Voice listing endpoint: `GET /tts/voices`
  - Runs `npx hyperframes tts --list`
  - Returns available voices

### Frontend
- [x] TTS controls in script page:
  - Voice selector (dropdown from available voices)
  - Speed slider (0.5 - 2.0)
  - "Preview TTS" button → plays audio for first segment
  - "Generate All" button → generates TTS for all segments
- [x] Audio playback UI in episode workspace

### Deliverables
- TTS generation working — script segments → `.wav` files via Kokoro
- TTS preview in frontend
- Voice/speed configuration per channel

---

## Acceptance Criteria

- [x] Orchestrator running with pi SDK integration
- [x] Research pipeline: query → search → structured results → DB → UI
- [x] Personality training: upload → analyze → validate → save → reuse
- [x] Script generation: personality + research → segmented script → DB
- [x] Script editor: generate, edit, revise, approve
- [x] TTS: generate narration audio, preview in frontend
- [x] End-to-end flow: create episode → research → script → TTS

---

## Notes

- Phase 2 is the **content creation** layer — research, voice, script, audio
- No visual composition yet (that's Phase 3)
- pi SDK sessions are the core — get session management solid
- TTS uses local Kokoro — no external API cost
- Personality training is one-time setup; script generation is per-episode
