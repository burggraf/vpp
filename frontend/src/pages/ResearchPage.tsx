import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { pb } from '@/lib/pocketbase'
import { startResearch, getResearchResults, updateResearch } from '@/lib/orchestrator'
import type { Episode, ResearchResult, ResearchFinding } from '@/types'

export function ResearchPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [researchList, setResearchList] = useState<ResearchResult[]>([])
  const [query, setQuery] = useState('')
  const [timeframe, setTimeframe] = useState('1 week')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedResearch, setSelectedResearch] = useState<ResearchResult | null>(null)
  const [editingFinding, setEditingFinding] = useState<number | null>(null)
  const [editedSummary, setEditedSummary] = useState('')

  useEffect(() => {
    if (!id) return
    pb.collection('episodes').getOne<Episode>(id).then(setEpisode).catch(console.error)
    loadResearch()
  }, [id])

  async function loadResearch() {
    if (!id) return
    try {
      const data = await getResearchResults(id)
      setResearchList(data?.items || [])
    } catch (err) {
      console.error('Failed to load research:', err)
    }
  }

  // Poll for research completion
  useEffect(() => {
    if (!running) return
    const interval = setInterval(loadResearch, 3000)
    return () => clearInterval(interval)
  }, [running])

  // Check if any research is in_progress
  useEffect(() => {
    const inProgress = researchList.some((r) => r.status === 'in_progress')
    if (!inProgress && running) {
      setRunning(false)
    }
  }, [researchList, running])

  const handleRunResearch = useCallback(async () => {
    if (!id || !query.trim()) return
    setRunning(true)
    setError(null)
    try {
      await startResearch(id, query.trim(), timeframe)
      setQuery('')
      setTimeout(loadResearch, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setRunning(false)
    }
  }, [id, query, timeframe])

  const handleApprove = useCallback(async (research: ResearchResult) => {
    try {
      await updateResearch(research.id, { status: 'complete' })
      await loadResearch()
      if (selectedResearch?.id === research.id) {
        setSelectedResearch({ ...research, status: 'complete' })
      }
    } catch (err) {
      console.error('Failed to approve research:', err)
    }
  }, [selectedResearch])

  const handleEditFinding = useCallback((index: number, finding: ResearchFinding) => {
    setEditingFinding(index)
    setEditedSummary(finding.summary)
  }, [])

  const handleSaveFinding = useCallback(async (research: ResearchResult, index: number) => {
    if (!research.results) return
    const updated = [...research.results]
    updated[index] = { ...updated[index], summary: editedSummary }
    try {
      await updateResearch(research.id, { results: updated })
      setEditingFinding(null)
      setEditedSummary('')
      setSelectedResearch({ ...research, results: updated })
    } catch (err) {
      console.error('Failed to update finding:', err)
    }
  }, [editedSummary])

  if (!episode) return <div className="p-8 text-center text-muted-foreground">Loading...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link to={`/episodes/${id}`} className="hover:text-foreground">
            Episode: {episode.title}
          </Link>
          <span>→</span>
          <span>Research</span>
        </div>
        <h1 className="text-2xl font-bold">Research</h1>
        <p className="text-muted-foreground">Search the web for content to inform the script.</p>
      </div>

      {/* Query Form */}
      <div className="bg-card border rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunResearch()}
              placeholder="Enter research query..."
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              disabled={running}
            />
          </div>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background text-sm"
            disabled={running}
          >
            <option value="1 day">Past day</option>
            <option value="1 week">Past week</option>
            <option value="1 month">Past month</option>
            <option value="1 year">Past year</option>
          </select>
          <button
            onClick={handleRunResearch}
            disabled={running || !query.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
          >
            {running ? 'Researching...' : 'Run Research'}
          </button>
        </div>
        {error && (
          <div className="mt-3 text-sm text-destructive">{error}</div>
        )}
      </div>

      {/* Previous Research */}
      {researchList.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Research History</h2>
          <div className="space-y-2">
            {researchList.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedResearch(r)}
                className={`w-full text-left p-3 border rounded-lg transition-colors ${
                  selectedResearch?.id === r.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{r.query}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.results?.length || 0} findings · {new Date(r.created).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Research Results */}
      {selectedResearch && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Results</h2>
              <p className="text-sm text-muted-foreground">{selectedResearch.summary}</p>
            </div>
            {selectedResearch.status === 'in_progress' || selectedResearch.status === 'pending' ? (
              <span className="text-xs text-muted-foreground animate-pulse">Processing...</span>
            ) : selectedResearch.status === 'complete' ? (
              <span className="text-xs text-green-600 font-medium">✓ Complete</span>
            ) : (
              <button
                onClick={() => handleApprove(selectedResearch)}
                className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
              >
                Approve
              </button>
            )}
          </div>

          {selectedResearch.results && selectedResearch.results.length > 0 ? (
            <div className="space-y-3">
              {selectedResearch.results.map((finding, i) => (
                <div key={i} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm">{finding.topic}</h3>
                    <span className="text-xs text-muted-foreground">
                      Relevance: {(finding.relevance_score * 100).toFixed(0)}%
                    </span>
                  </div>

                  {editingFinding === i ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedSummary}
                        onChange={(e) => setEditedSummary(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveFinding(selectedResearch, i)}
                          className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingFinding(null)}
                          className="px-3 py-1 border rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">{finding.summary}</p>
                      {finding.key_points && finding.key_points.length > 0 && (
                        <ul className="text-xs space-y-1 mb-2">
                          {finding.key_points.map((kp, j) => (
                            <li key={j} className="flex items-start gap-1">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{kp}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex items-center justify-between">
                        <a
                          href={finding.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          Source →
                        </a>
                        <button
                          onClick={() => handleEditFinding(i, finding)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {selectedResearch.status === 'in_progress' || selectedResearch.status === 'pending'
                ? 'Research in progress...'
                : 'No findings yet.'}
            </div>
          )}
        </div>
      )}

      {/* Back to Episode */}
      <div className="mt-8 pt-4 border-t">
        <Link
          to={`/episodes/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Episode Workspace
        </Link>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    complete: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
