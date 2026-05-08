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
