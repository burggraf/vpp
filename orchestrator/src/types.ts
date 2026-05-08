// Shared types mirroring frontend + orchestrator-specific types

export interface StyleDNA {
  primary_font: string
  secondary_font: string
  color_palette: string[]
  title_position: string
  lower_third_style: string
  transition_type: string
  background_style: string
  logo_url: string
  intro_duration: number
  outro_duration: number
  resolution: string
  fps: number
  tts_voice?: string
  tts_speed?: number
  research_depth?: { queries: number; timeframe: string }
}

export interface Channel {
  id: string
  name: string
  slug: string
  description: string
  style_dna: StyleDNA
  intro_video: string
  outro_video: string
  system_prompt: string
  status: 'active' | 'paused' | 'archived'
  episode_count: number
  schedule: string
  schedule_enabled: boolean
  schedule_template: string
  schedule_auto_advance: boolean
  created: string
  updated: string
}

export interface Episode {
  id: string
  channel: string
  title: string
  slug: string
  number: number
  topic: string
  status: 'draft' | 'generating' | 'preview' | 'reviewing' | 'rendering' | 'complete' | 'failed'
  composition_path: string
  preview_url: string
  block_count: number
  total_duration: number
  feedback_log: FeedbackEntry[]
  video_file: string
  video_url: string
  thumbnail: string
  metadata: Record<string, unknown>
  created: string
  updated: string
}

export interface FeedbackEntry {
  iteration: number
  feedback: string
  timestamp: string
  agent_response: string
  target_block: string | null
}

export interface Personality {
  id: string
  name: string
  slug: string
  description: string
  voice_profile: VoiceProfile
  training_sources: string[]
  system_prompt: string
  sample_output: string
  status: 'active' | 'draft' | 'archived'
  created: string
  updated: string
}

export interface VoiceProfile {
  tone: string
  pacing: string
  vocabulary: string
  avoid: string[]
  catchphrases: string[]
  sentence_style: string
  humor_level: string
}

export interface ResearchResult {
  id: string
  episode: string
  query: string
  results: ResearchFinding[]
  summary: string
  sources: string[]
  status: 'pending' | 'in_progress' | 'complete' | 'failed'
  created: string
  updated: string
}

export interface ResearchFinding {
  topic: string
  summary: string
  url: string
  published: string
  relevance_score: number
  key_points: string[]
}

export interface Script {
  id: string
  episode: string
  personality: string
  research: string
  content: string
  segments: ScriptSegment[]
  word_count: number
  estimated_duration: number
  status: 'draft' | 'generated' | 'approved' | 'needs_revision'
  revision_notes: string
  created: string
  updated: string
}

export interface ScriptSegment {
  order: number
  text: string
  block_ref: string | null
  estimated_duration: number
  tone_note: string
}

// Orchestrator-specific types
export interface SessionContext {
  episodeId: string
  channelId?: string
  personalityId?: string
  researchId?: string
  type: 'research' | 'script' | 'personality_train' | 'personality_validate' | 'block'
}

export interface TTSSegment {
  segmentIndex: number
  text: string
  outputPath: string
  status: 'pending' | 'complete' | 'failed'
}

export interface ResearchRequest {
  query: string
  timeframe?: string
  depth?: { queries: number; timeframe: string }
}

export interface ScriptGenerationRequest {
  personalityId: string
  researchId?: string
  targetDuration?: number
}

export interface ScriptRevisionRequest {
  feedback: string
}
