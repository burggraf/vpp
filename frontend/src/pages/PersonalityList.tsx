import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { pb } from '@/lib/pocketbase'
import { createPersonality } from '@/lib/orchestrator'
import type { Personality } from '@/types'

export function PersonalityList() {
  const [personalities, setPersonalities] = useState<Personality[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newDescription, setNewDescription] = useState('')

  useEffect(() => {
    loadPersonalities()
  }, [])

  async function loadPersonalities() {
    try {
      const data = await pb.collection('personalities').getList<Personality>(1, 50, { sort: '-created' })
      setPersonalities(data.items)
    } catch (err) {
      console.error('Failed to load personalities:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newSlug.trim()) return
    try {
      await createPersonality({
        name: newName.trim(),
        slug: newSlug.trim(),
        description: newDescription.trim(),
      })
      setNewName('')
      setNewSlug('')
      setNewDescription('')
      setShowCreate(false)
      await loadPersonalities()
    } catch (err) {
      console.error('Failed to create personality:', err)
    }
  }

  function slugify(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Personalities</h1>
          <p className="text-muted-foreground">Voice profiles for script generation.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
        >
          {showCreate ? 'Cancel' : '+ New Personality'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="border rounded-lg p-4 mb-6 bg-card">
          <h2 className="font-semibold mb-3">Create Personality</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setNewSlug(slugify(e.target.value)) }}
                placeholder="e.g., Tech Analyst"
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Slug</label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="tech-analyst"
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-1 block">Description</label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional description..."
              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || !newSlug.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
          >
            Create
          </button>
        </div>
      )}

      {/* List */}
      {personalities.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No personalities yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {personalities.map((p) => (
            <Link
              key={p.id}
              to={`/personalities/${p.slug}`}
              className="border rounded-lg p-4 hover:bg-muted transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{p.name}</h3>
                  {p.description && (
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                  )}
                  {p.voice_profile && Object.keys(p.voice_profile).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.voice_profile.tone && `Tone: ${p.voice_profile.tone}`}
                      {p.voice_profile.humor_level && ` · Humor: ${p.voice_profile.humor_level}`}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  p.status === 'active' ? 'bg-green-100 text-green-800' :
                  p.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {p.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
