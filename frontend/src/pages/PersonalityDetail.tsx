import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { pb } from '@/lib/pocketbase'
import {
  getPersonalityBySlug,
  updatePersonality,
  trainPersonality,
  validatePersonality,
} from '@/lib/orchestrator'
import type { Personality } from '@/types'

export function PersonalityDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [personality, setPersonality] = useState<Personality | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'train' | 'validate'>('profile')

  useEffect(() => {
    if (!slug) return
    loadPersonality()
  }, [slug])

  async function loadPersonality() {
    if (!slug) return
    try {
      const data = await getPersonalityBySlug(slug)
      setPersonality(data)
    } catch (err) {
      console.error('Failed to load personality:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  if (!personality) return <div className="p-8 text-center text-muted-foreground">Not found</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link to="/personalities" className="hover:text-foreground">Personalities</Link>
          <span>→</span>
          <span>{personality.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{personality.name}</h1>
            {personality.description && (
              <p className="text-muted-foreground mt-1">{personality.description}</p>
            )}
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            personality.status === 'active' ? 'bg-green-100 text-green-800' :
            personality.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {personality.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {(['profile', 'train', 'validate'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'profile' ? 'Profile' : tab === 'train' ? 'Training' : 'Validate'}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfileTab personality={personality} />}
      {activeTab === 'train' && <TrainTab personality={personality} onRetrain={loadPersonality} />}
      {activeTab === 'validate' && <ValidateTab personality={personality} />}
    </div>
  )
}

function ProfileTab({ personality }: { personality: Personality }) {
  return (
    <div className="space-y-6">
      {/* Voice Profile */}
      {personality.voice_profile && Object.keys(personality.voice_profile).length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Voice Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {Object.entries(personality.voice_profile).map(([key, value]) => (
              <div key={key}>
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                <p className="mt-1">
                  {Array.isArray(value) ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {value.map((v, i) => (
                        <span key={i} className="px-2 py-0.5 bg-muted rounded text-xs">{v}</span>
                      ))}
                    </div>
                  ) : (
                    String(value)
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Prompt */}
      {personality.system_prompt && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">System Prompt</h3>
          <details>
            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
              Click to expand
            </summary>
            <pre className="mt-3 text-xs bg-muted p-3 rounded overflow-auto max-h-64 whitespace-pre-wrap">
              {personality.system_prompt}
            </pre>
          </details>
        </div>
      )}

      {/* Training Sources */}
      {personality.training_sources && personality.training_sources.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">
            Training Sources ({personality.training_sources.length})
            {personality.training_sources.length < 5 && (
              <span className="ml-2 text-xs text-yellow-600">⚠️ Minimum 5 recommended</span>
            )}
          </h3>
          <div className="space-y-1 max-h-48 overflow-auto">
            {personality.training_sources.map((src, i) => (
              <div key={i} className="text-xs bg-muted px-2 py-1 rounded font-mono truncate">
                {src.substring(0, 100)}{src.length > 100 ? '...' : ''} ({src.length} chars)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sample Output */}
      {personality.sample_output && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Sample Output</h3>
          <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap max-h-96 overflow-auto">
            {personality.sample_output}
          </div>
        </div>
      )}
    </div>
  )
}

function TrainTab({ personality, onRetrain }: { personality: Personality; onRetrain: () => void }) {
  const [sources, setSources] = useState(personality.training_sources || [])
  const [newSource, setNewSource] = useState('')
  const [training, setTraining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const handleAddSource = () => {
    if (!newSource.trim()) return
    setSources([...sources, newSource.trim()])
    setNewSource('')
  }

  const handleRemoveSource = (index: number) => {
    setSources(sources.filter((_, i) => i !== index))
  }

  const handleTrain = async () => {
    setTraining(true)
    setError(null)
    setWarning(null)
    try {
      const result = await trainPersonality(personality.id, sources)
      setWarning(result.warning)
      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const updated = await getPersonalityBySlug(personality.slug)
          if (updated.status !== 'draft' || updated.system_prompt) {
            clearInterval(poll)
            setTraining(false)
            onRetrain()
          }
        } catch {
          clearInterval(poll)
          setTraining(false)
        }
      }, 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setTraining(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Upload Sources */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Step 1: Training Sources</h3>
        {sources.length < 5 && (
          <div className="text-xs text-yellow-600 mb-3">
            ⚠️ {5 - sources.length} more sources recommended (minimum 5)
          </div>
        )}

        {/* Source list */}
        {sources.length > 0 && (
          <div className="space-y-1 mb-4 max-h-64 overflow-auto">
            {sources.map((src, i) => (
              <div key={i} className="flex items-center justify-between bg-muted p-2 rounded text-xs">
                <span className="truncate flex-1 font-mono">{src.substring(0, 80)}{src.length > 80 ? '...' : ''} ({src.length} chars)</span>
                <button
                  onClick={() => handleRemoveSource(i)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add source */}
        <div className="flex gap-2">
          <textarea
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder="Paste text, article, or transcript here..."
            className="flex-1 px-3 py-2 border rounded-md bg-background text-sm min-h-[80px]"
          />
          <button
            onClick={handleAddSource}
            disabled={!newSource.trim()}
            className="self-end px-3 py-2 border rounded-md text-sm disabled:opacity-50 hover:bg-muted"
          >
            Add
          </button>
        </div>
      </div>

      {/* Step 2: Analyze */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Step 2: Analyze</h3>
        <button
          onClick={handleTrain}
          disabled={training || sources.length === 0}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
        >
          {training ? 'Analyzing...' : 'Analyze Sources'}
        </button>
        {error && <div className="mt-2 text-sm text-destructive">{error}</div>}
        {warning && <div className="mt-2 text-sm text-yellow-600">{warning}</div>}
      </div>
    </div>
  )
}

function ValidateTab({ personality }: { personality: Personality }) {
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleValidate = async () => {
    if (!personality.system_prompt) {
      setError('Train the personality first.')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      await validatePersonality(personality.id, topic || undefined)
      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const updated = await getPersonalityBySlug(personality.slug)
          if (updated.sample_output) {
            clearInterval(poll)
            setGenerating(false)
            window.location.reload()
          }
        } catch {
          clearInterval(poll)
          setGenerating(false)
        }
      }, 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Step 3: Generate Sample</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic for sample (optional)..."
            className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
          />
          <button
            onClick={handleValidate}
            disabled={generating || !personality.system_prompt}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
          >
            {generating ? 'Generating...' : 'Generate Sample'}
          </button>
        </div>
        {error && <div className="mt-2 text-sm text-destructive">{error}</div>}
      </div>

      {personality.sample_output && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Sample Output</h3>
          <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap max-h-96 overflow-auto">
            {personality.sample_output}
          </div>
        </div>
      )}
    </div>
  )
}
