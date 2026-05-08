// PocketBase collection types matching the schema

export interface Channel {
  id: string
  collectionId: string
  collectionName: string
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
  research_depth?: {
    queries: number
    timeframe: string
  }
}

export interface Episode {
  id: string
  collectionId: string
  collectionName: string
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
  metadata: EpisodeMetadata
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

export interface EpisodeMetadata {
  resolution?: string
  duration?: number
  fps?: number
}

export interface Block {
  id: string
  collectionId: string
  collectionName: string
  episode: string
  block_type: 'intro' | 'title' | 'content' | 'lower_third' | 'transition' | 'outro' | 'caption'
  order: number
  script: string
  composition_src: string
  start_time: number
  duration: number
  track_index: number
  variables: Record<string, unknown>
  assets: string[]
  status: 'pending' | 'generated' | 'approved' | 'needs_revision'
  created: string
  updated: string
}

export interface Personality {
  id: string
  collectionId: string
  collectionName: string
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
  collectionId: string
  collectionName: string
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
  collectionId: string
  collectionName: string
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

export interface MediaLibrary {
  id: string
  collectionId: string
  collectionName: string
  name: string
  slug: string
  media_type: 'image' | 'video' | 'audio' | 'music' | 'sfx' | 'font' | 'graphic'
  category: string
  tags: string[]
  file: string
  file_url: string
  duration: number
  dimensions: { width: number; height: number }
  license: string
  usage_count: number
  description: string
  created: string
  updated: string
}

export interface EpisodeTemplate {
  id: string
  collectionId: string
  collectionName: string
  name: string
  slug: string
  channel: string
  source_episode: string
  description: string
  block_structure: Record<string, unknown>[]
  composition_files: string[]
  default_personality: string
  default_research_depth: { queries: number; timeframe: string }
  default_duration: number
  variables: Record<string, string>
  usage_count: number
  status: 'active' | 'archived'
  created: string
  updated: string
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  verified: boolean
}

// API response envelope
export interface PocketBaseResponse<T> {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
  items: T[]
}
