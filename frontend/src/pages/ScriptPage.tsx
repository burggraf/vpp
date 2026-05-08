import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { pb } from '@/lib/pocketbase'
import {
  generateScript,
  reviseScript,
  approveScript,
  getScript,
  updateScript,
  listTTSVoices,
  previewTTS,
  generateTTS,
} from '@/lib/orchestrator'
import type { Episode, Script, ScriptSegment, Personality } from '@/types'

export function ScriptPage() {
  const { id } = useParams<{ id: string }>()
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [script, setScript] = useState<Script | null>(null)
  const [personalities, setPersonalities] = useState<Personality[]>([])
  const [selectedPersonality, setSelectedPersonality] = useState('')
  const [selectedResearch, setSelectedResearch] = useState('')
  const [researchList, setResearchList] = useState<Array<{ id: string; query: string; status: string }>>([])
  const [generating, setGenerating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [revisionFeedback, setRevisionFeedback] = useState('')
  const [showRevision, setShowRevision] = useState(false)
  const [ttsVoices, setTtsVoices] = useState<Array<{ name: string; lang: string; description: string }>>([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [ttsSpeed, setTtsSpeed] = useState(1.0)
  const [ttsGenerating, setTtsGenerating] = useState(false)
  const [ttsPreviewing, setTtsPreviewing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    loadData()
    loadPersonalities()
    loadResearch()
    loadTTSVoices()
  }, [id])

  async function loadData() {
    if (!id) return
    try {
      const ep = await pb.collection('episodes').getOne<Episode>(id)
      setEpisode(ep)
      if (ep.channel) {
        const ch = await pb.collection('channels').getOne<{ style_dna?: { tts_voice?: string; tts_speed?: number } }>(ep.channel)
        if (ch.style_dna?.tts_voice) setSelectedVoice(ch.style_dna.tts_voice)
        if (ch.style_dna?.tts_speed) setTtsSpeed(ch.style_dna.tts_speed)
      }
    } catch (err) {
      console.error('Failed to load episode:', err)
    }

    try {
      const s = await getScript(id)
      setScript(s)
      if (s?.personality) setSelectedPersonality(s.personality)
    } catch {
      // No script yet
    } finally {
      setLoading(false)
    }
  }

  async function loadPersonalities() {
    try {
      const data = await pb.collection('personalities').getList<Personality>(1, 50, { filter: 'status="active"' })
      setPersonalities(data.items)
    } catch (err) {
      console.error('Failed to load personalities:', err)
    }
  }

  async function loadResearch() {
    if (!id) return
    try {
      const data = await pb.collection('research_results').getList(1, 50, {
        filter: `episode="${id}" && status="complete"`,
      })
      setResearchList(data.items.map((r) => ({ id: r.id, query: r.query, status: r.status })))
    } catch (err) {
      console.error('Failed to load research:', err)
    }
  }

  async function loadTTSVoices() {
    try {
      const data = await listTTSVoices()
      setTtsVoices(data?.voices || [])
    } catch {
      // Voices not available
    }
  }

  const handleGenerate = useCallback(async () => {
    if (!id || !selectedPersonality) return
    setGenerating(true)
    try {
      const targetDuration = episode?.total_duration || 60
      await generateScript(id, {
        personalityId: selectedPersonality,
        researchId: selectedResearch || undefined,
        targetDuration,
      })

      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const s = await getScript(id)
          if (s?.status === 'generated' || s?.status === 'approved') {
            clearInterval(poll)
            setGenerating(false)
            setScript(s)
          }
        } catch {
          // Still generating
        }
      }, 5000)

      setTimeout(() => clearInterval(poll), 120000) // 2 min timeout
    } catch (err) {
      console.error('Failed to generate script:', err)
      setGenerating(false)
    }
  }, [id, selectedPersonality, selectedResearch, episode])

  const handleSaveEdit = useCallback(async () => {
    if (!script) return
    try {
      // Parse segments from edited content
      const segments: ScriptSegment[] = script.segments.map((seg, i) => ({
        ...seg,
        text: editedContent.split('\n\n')[i] || seg.text,
      }))
      const wordCount = editedContent.split(/\s+/).filter(Boolean).length
      await updateScript(script.id, {
        content: editedContent,
        segments,
        word_count: wordCount,
      })
      setScript({ ...script, content: editedContent, segments, word_count: wordCount })
      setEditing(false)
    } catch (err) {
      console.error('Failed to save edit:', err)
    }
  }, [script, editedContent])

  const handleRevise = useCallback(async () => {
    if (!id || !revisionFeedback.trim()) return
    try {
      await reviseScript(id, revisionFeedback.trim())
      setRevisionFeedback('')
      setShowRevision(false)

      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const s = await getScript(id)
          if (s?.status === 'generated') {
            clearInterval(poll)
            setScript(s)
          }
        } catch {}
      }, 5000)
    } catch (err) {
      console.error('Failed to revise script:', err)
    }
  }, [id, revisionFeedback])

  const handleApprove = useCallback(async () => {
    if (!id) return
    try {
      await approveScript(id)
      const s = await getScript(id)
      setScript(s)
    } catch (err) {
      console.error('Failed to approve script:', err)
    }
  }, [id])

  const handlePreviewTTS = useCallback(async () => {
    if (!id || !script?.segments?.length) return
    setTtsPreviewing(true)
    try {
      const firstSegment = script.segments[0]
      await previewTTS(id, firstSegment.text, selectedVoice || undefined, ttsSpeed)
      // Audio file is saved server-side; in production would return URL
      setTtsPreviewing(false)
    } catch (err) {
      console.error('Failed to preview TTS:', err)
      setTtsPreviewing(false)
    }
  }, [id, script, selectedVoice, ttsSpeed])

  const handleGenerateTTS = useCallback(async () => {
    if (!id || !script?.segments?.length) return
    setTtsGenerating(true)
    try {
      await generateTTS(id, script.segments, selectedVoice || undefined, ttsSpeed)
      setTtsGenerating(false)
    } catch (err) {
      console.error('Failed to generate TTS:', err)
      setTtsGenerating(false)
    }
  }, [id, script, selectedVoice, ttsSpeed])

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  if (!episode) return <div className="p-8 text-center text-muted-foreground">Episode not found</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link to={`/episodes/${id}`} className="hover:text-foreground">Episode: {episode.title}</Link>
          <span>→</span>
          <span>Script</span>
        </div>
        <h1 className="text-2xl font-bold">Script</h1>
      </div>

      {/* Generation Controls */}
      {!script || script.status === 'draft' ? (
        <div className="border rounded-lg p-4 mb-6 bg-card">
          <h2 className="font-semibold mb-3">Generate Script</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Personality</label>
              <select
                value={selectedPersonality}
                onChange={(e) => setSelectedPersonality(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="">Select personality...</option>
                {personalities.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Research (optional)</label>
              <select
                value={selectedResearch}
                onChange={(e) => setSelectedResearch(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="">None</option>
                {researchList.map((r) => (
                  <option key={r.id} value={r.id}>{r.query}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedPersonality}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
          >
            {generating ? 'Generating...' : 'Generate Script'}
          </button>
        </div>
      ) : null}

      {/* Script Display */}
      {script && (
        <div className="space-y-6">
          {/* Status + Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                script.status === 'approved' ? 'bg-green-100 text-green-800' :
                script.status === 'generated' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {script.status}
              </span>
              {script.word_count && (
                <span className="text-xs text-muted-foreground">
                  {script.word_count} words · ~{script.estimated_duration}s
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {!editing && script.status !== 'approved' && (
                <button
                  onClick={() => { setEditing(true); setEditedContent(script.content) }}
                  className="px-3 py-1.5 border rounded-md text-sm hover:bg-muted"
                >
                  Edit
                </button>
              )}
              {!showRevision && script.status !== 'approved' && (
                <button
                  onClick={() => setShowRevision(true)}
                  className="px-3 py-1.5 border rounded-md text-sm hover:bg-muted"
                >
                  Request Revision
                </button>
              )}
              {script.status !== 'approved' && (
                <button
                  onClick={handleApprove}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                >
                  Approve
                </button>
              )}
            </div>
          </div>

          {/* Revision Form */}
          {showRevision && (
            <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
              <h3 className="font-semibold text-sm mb-2">Revision Feedback</h3>
              <textarea
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                placeholder="Describe what to change..."
                className="w-full px-3 py-2 border rounded-md bg-background text-sm min-h-[80px] mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRevise}
                  disabled={!revisionFeedback.trim()}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
                >
                  Submit Revision
                </button>
                <button
                  onClick={() => setShowRevision(false)}
                  className="px-3 py-1.5 border rounded-md text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Edit Mode */}
          {editing ? (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Edit Script</h3>
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm">Save</button>
                  <button onClick={() => setEditing(false)} className="px-3 py-1.5 border rounded-md text-sm">Cancel</button>
                </div>
              </div>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm min-h-[200px] font-mono"
              />
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-card">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{script.content}</div>
            </div>
          )}

          {/* Segments Table */}
          {script.segments && script.segments.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">#</th>
                    <th className="text-left px-4 py-2 font-medium">Text</th>
                    <th className="text-right px-4 py-2 font-medium">Duration</th>
                    <th className="text-left px-4 py-2 font-medium">Tone</th>
                  </tr>
                </thead>
                <tbody>
                  {script.segments.map((seg, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2 text-muted-foreground">{seg.order}</td>
                      <td className="px-4 py-2 max-w-md truncate">{seg.text}</td>
                      <td className="px-4 py-2 text-right">{seg.estimated_duration}s</td>
                      <td className="px-4 py-2 text-muted-foreground">{seg.tone_note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TTS Controls */}
          {script.status === 'approved' && script.segments && script.segments.length > 0 && (
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold mb-3">Text-to-Speech</h3>
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Voice</label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background text-sm min-w-[160px]"
                  >
                    {ttsVoices.map((v) => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Speed: {ttsSpeed.toFixed(1)}x</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={ttsSpeed}
                    onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                    className="w-32"
                  />
                </div>
                <button
                  onClick={handlePreviewTTS}
                  disabled={ttsPreviewing}
                  className="px-3 py-2 border rounded-md text-sm disabled:opacity-50 hover:bg-muted"
                >
                  {ttsPreviewing ? 'Generating...' : 'Preview TTS'}
                </button>
                <button
                  onClick={handleGenerateTTS}
                  disabled={ttsGenerating}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
                >
                  {ttsGenerating ? 'Generating...' : 'Generate All'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Back */}
      <div className="mt-8 pt-4 border-t">
        <Link to={`/episodes/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Episode Workspace
        </Link>
      </div>
    </div>
  )
}
