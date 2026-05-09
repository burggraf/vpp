const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL || 'http://127.0.0.1:3001'

async function orchestratorFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${ORCHESTRATOR_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || data.message || `HTTP ${res.status}`)
  }

  return res.json()
}

// Research
export async function startResearch(episodeId: string, query: string, timeframe?: string) {
  return orchestratorFetch(`/api/episodes/${episodeId}/research`, {
    method: 'POST',
    body: JSON.stringify({ query, timeframe }),
  })
}

export async function getResearchResults(episodeId: string) {
  return orchestratorFetch(`/api/episodes/${episodeId}/research`)
}

export async function getResearchResult(episodeId: string, researchId: string) {
  return orchestratorFetch(`/api/episodes/${episodeId}/research/${researchId}`)
}

export async function updateResearch(id: string, data: Record<string, unknown>) {
  return orchestratorFetch(`/api/research/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// Personality
export async function listPersonalities() {
  return orchestratorFetch('/api/personalities')
}

export async function getPersonalityBySlug(slug: string) {
  return orchestratorFetch(`/api/personalities/${slug}`)
}

export async function createPersonality(data: { name: string; slug: string; description?: string }) {
  return orchestratorFetch('/api/personalities', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updatePersonality(id: string, data: Record<string, unknown>) {
  return orchestratorFetch(`/api/personalities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deletePersonality(id: string) {
  return orchestratorFetch(`/api/personalities/${id}`, {
    method: 'DELETE',
  })
}

export async function trainPersonality(id: string, sources: string[]) {
  return orchestratorFetch(`/api/personalities/${id}/train`, {
    method: 'POST',
    body: JSON.stringify({ sources }),
  })
}

export async function validatePersonality(id: string, topic?: string) {
  return orchestratorFetch(`/api/personalities/${id}/validate`, {
    method: 'POST',
    body: JSON.stringify({ topic }),
  })
}

// Script
export async function generateScript(episodeId: string, data: { personalityId: string; researchId?: string; targetDuration?: number }) {
  return orchestratorFetch(`/api/episodes/${episodeId}/script/generate`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function reviseScript(episodeId: string, feedback: string) {
  return orchestratorFetch(`/api/episodes/${episodeId}/script/revise`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  })
}

export async function approveScript(episodeId: string) {
  return orchestratorFetch(`/api/episodes/${episodeId}/script/approve`, {
    method: 'POST',
  })
}

export async function getScript(episodeId: string) {
  return orchestratorFetch(`/api/episodes/${episodeId}/script`)
}

export async function listScripts(episodeId: string) {
  return orchestratorFetch(`/api/episodes/${episodeId}/scripts`)
}

export async function updateScript(id: string, data: Record<string, unknown>) {
  return orchestratorFetch(`/api/scripts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// TTS
export async function listTTSVoices() {
  return orchestratorFetch('/api/tts/voices')
}

export async function previewTTS(episodeId: string, text: string, voice?: string, speed?: number) {
  return orchestratorFetch(`/api/episodes/${episodeId}/tts/preview`, {
    method: 'POST',
    body: JSON.stringify({ text, voice, speed }),
  })
}

export async function generateTTS(episodeId: string, segments: Array<{ text: string }>, voice?: string, speed?: number) {
  return orchestratorFetch(`/api/episodes/${episodeId}/tts/generate`, {
    method: 'POST',
    body: JSON.stringify({ segments, voice, speed }),
  })
}

// ─── Episode Generation (SSE) ───────────────────────────────────────────────

interface GenerationCallbacks {
  topic: string
  channelId: string
  options: Record<string, unknown>
  templateId?: string
  onProgress: (progress: { stage: string; stageLabel: string; progress: number; message: string; overallProgress: number; error?: string }) => void
  onError: (error: string) => void
}

/**
 * Start episode generation via SSE.
 * Returns the EventSource for cleanup.
 */
export function startEpisodeGeneration(
  episodeId: string,
  callbacks: GenerationCallbacks,
): EventSource {
  const params = new URLSearchParams({
    topic: callbacks.topic,
    channelId: callbacks.channelId,
    options: JSON.stringify(callbacks.options),
    ...(callbacks.templateId ? { templateId: callbacks.templateId } : {}),
  })

  const url = `${ORCHESTRATOR_URL}/api/episodes/${episodeId}/generate?${params.toString()}`
  const es = new EventSource(url)

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      callbacks.onProgress(data)
    } catch {
      // Ignore parse errors
    }
  }

  es.onerror = () => {
    es.close()
    callbacks.onError('Connection lost during generation')
  }

  return es
}

// ─── Template Operations ────────────────────────────────────────────────────

export async function saveAsTemplate(episodeId: string, name: string, description?: string) {
  return orchestratorFetch(`/api/templates/save`, {
    method: 'POST',
    body: JSON.stringify({ episodeId, name, description }),
  })
}

export async function createEpisodeFromTemplate(templateId: string, topic: string, title?: string) {
  return orchestratorFetch(`/api/templates/${templateId}/use`, {
    method: 'POST',
    body: JSON.stringify({ topic, title }),
  })
}

export async function deleteTemplate(templateId: string) {
  return orchestratorFetch(`/api/templates/${templateId}`, {
    method: 'DELETE',
  })
}
