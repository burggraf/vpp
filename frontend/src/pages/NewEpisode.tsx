import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { pb } from '@/lib/pocketbase'
import type { Channel, EpisodeTemplate } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, FileText, Sparkles } from 'lucide-react'

export function NewEpisode() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [channel, setChannel] = useState<Channel | null>(null)
  const [templates, setTemplates] = useState<EpisodeTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [number, setNumber] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('') // '' = blank

  useEffect(() => {
    if (!slug) return
    const fetchData = async () => {
      try {
        setLoading(true)
        const [ch, tplResult] = await Promise.all([
          pb.collection('channels').getFirstListItem<Channel>(`slug="${slug}"`),
          pb.collection('episode_templates').getList<EpisodeTemplate>(1, 50, {
            filter: `channel="${slug}" && status="active"`,
            sort: 'name',
          }),
        ])
        setChannel(ch)
        setTemplates(tplResult.items)
        setError(null)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load channel data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [slug])

  const canSubmit = title.trim().length > 0 && channel !== null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!channel || !canSubmit) return

    try {
      setCreating(true)
      setError(null)

      // Generate slug from title
      const episodeSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const episodeData: Record<string, unknown> = {
        channel: channel.id,
        title: title.trim(),
        slug: episodeSlug,
        topic: topic.trim() || null,
        status: 'draft',
        feedback_log: [],
        metadata: {},
      }

      if (number.trim()) {
        episodeData.number = parseInt(number.trim(), 10)
      }

      if (selectedTemplate) {
        episodeData.template = selectedTemplate
      }

      const created = await pb.collection('episodes').create(episodeData)

      // Increment channel episode_count
      await pb.collection('channels').update(channel.id, {
        episode_count: (channel.episode_count || 0) + 1,
      })

      navigate(`/episodes/${created.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create episode')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (error && !channel) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-red-400">
          {error}
        </div>
        <Button variant="ghost" onClick={() => navigate(`/channels/${slug}`)}>
          <ArrowLeft className="mr-1 h-3 w-3" /> Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/channels/${slug}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">New Episode</h1>
          <p className="mt-1 text-zinc-400">Channel: {channel?.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basics */}
        <Card>
          <CardHeader>
            <CardTitle>Episode Details</CardTitle>
            <CardDescription>
              Give your episode a title and optional topic for generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Future of AI in 2026"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic / Prompt</Label>
              <Textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Latest AI developer news from the past week"
                rows={3}
              />
              <p className="text-xs text-zinc-500">
                Used as the research query and script generation prompt.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="number">Episode Number</Label>
              <Input
                id="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g. 42"
                className="max-w-xs"
              />
              <p className="text-xs text-zinc-500">Optional — auto-incremented if left blank.</p>
            </div>
          </CardContent>
        </Card>

        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Starting Point</CardTitle>
            <CardDescription>
              Use an existing template or start from scratch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Blank option */}
            <button
              type="button"
              onClick={() => setSelectedTemplate('')}
              className={`w-full text-left rounded-lg border p-4 transition-colors ${
                selectedTemplate === ''
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="font-medium text-zinc-100">Start from Scratch</p>
                  <p className="text-sm text-zinc-500">
                    Blank episode — generate everything from your topic.
                  </p>
                </div>
              </div>
            </button>

            {/* Templates */}
            {templates.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-zinc-300">Or use a template:</p>
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`w-full text-left rounded-lg border p-4 transition-colors ${
                      selectedTemplate === tpl.id
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-zinc-400" />
                      <div>
                        <p className="font-medium text-zinc-100">{tpl.name}</p>
                        {tpl.description && (
                          <p className="text-sm text-zinc-500">{tpl.description}</p>
                        )}
                        <p className="text-xs text-zinc-600 mt-1">
                          {tpl.block_structure?.length || 0} blocks · Used {tpl.usage_count || 0}{' '}
                          times
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={!canSubmit || creating}>
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Episode'
            )}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate(`/channels/${slug}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
