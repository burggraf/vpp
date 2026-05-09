import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { pb } from '@/lib/pocketbase'
import { startEpisodeGeneration } from '@/lib/orchestrator'
import type { Channel, EpisodeTemplate, GenerationOptions, GenerationProgress } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Loader2,
  FileText,
  Sparkles,
  Search,
  FileStack,
  Mic,
  Image,
  Music,
  Clapperboard,
  Film,
  Play,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react'

interface SectionToggle {
  id: keyof GenerationOptions
  label: string
  description: string
  icon: React.ReactNode
  enabled: boolean
}

const DEFAULT_SECTIONS: SectionToggle[] = [
  { id: 'research', label: 'Research', description: 'Web search for topic — facts, sources, key points', icon: <Search className="h-4 w-4" />, enabled: true },
  { id: 'script', label: 'Script', description: 'Personality-driven script writing', icon: <FileText className="h-4 w-4" />, enabled: true },
  { id: 'tts', label: 'TTS / Narration', description: 'Kokoro voiceover from script', icon: <Mic className="h-4 w-4" />, enabled: true },
  { id: 'visuals', label: 'Visuals / Compositions', description: 'HyperFrames block compositions', icon: <Image className="h-4 w-4" />, enabled: true },
  { id: 'backgroundMusic', label: 'Background Music', description: 'Royalty-free music matching tone', icon: <Music className="h-4 w-4" />, enabled: true },
  { id: 'intro', label: 'Intro', description: 'Channel intro bumper from Style DNA', icon: <Clapperboard className="h-4 w-4" />, enabled: true },
  { id: 'outro', label: 'Outro', description: 'Channel outro bumper from Style DNA', icon: <Film className="h-4 w-4" />, enabled: true },
]

export function NewEpisode() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [channel, setChannel] = useState<Channel | null>(null)
  const [templates, setTemplates] = useState<EpisodeTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [topic, setTopic] = useState('')
  const [title, setTitle] = useState('')
  const [number, setNumber] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [personalityId, setPersonalityId] = useState<string>('')
  const [personalities, setPersonalities] = useState<{ id: string; name: string }[]>([])
  const [sections, setSections] = useState<SectionToggle[]>(DEFAULT_SECTIONS.map(s => ({ ...s })))

  // Generation state
  const [generating, setGenerating] = useState(false)
  const [episodeId, setEpisodeId] = useState<string | null>(null)
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!slug) return
    const fetchData = async () => {
      try {
        setLoading(true)
        const [ch, tplResult, persResult] = await Promise.all([
          pb.collection('channels').getFirstListItem<Channel>(`slug="${slug}"`),
          pb.collection('episode_templates').getList<EpisodeTemplate>(1, 50, {
            filter: `status="active"`,
            sort: 'name',
          }),
          pb.collection('personalities').getList(1, 50, {
            filter: `status="active"`,
            sort: 'name',
          }),
        ])
        setChannel(ch)
        setTemplates(tplResult.items.filter((t: EpisodeTemplate) => t.channel === ch.id || t.channel === ch.slug))
        setPersonalities(persResult.items.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
        if (ch.style_dna?.tts_voice) {
          // Default personality selection could go here
        }
        setError(null)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load channel data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [slug])

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  const canGenerate = topic.trim().length > 0 && channel !== null && !generating

  const toggleSection = (id: keyof GenerationOptions) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }

  const selectAll = () => setSections(prev => prev.map(s => ({ ...s, enabled: true })))
  const deselectAll = () => setSections(prev => prev.map(s => ({ ...s, enabled: false })))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!channel || !canGenerate) return

    try {
      setGenerating(true)
      setError(null)

      // Auto-generate title from topic if blank
      const episodeTitle = title.trim() || topic.trim().slice(0, 80)
      const episodeSlug = episodeTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      // Build generation options
      const genOptions: GenerationOptions = {
        research: sections.find(s => s.id === 'research')?.enabled ?? true,
        script: sections.find(s => s.id === 'script')?.enabled ?? true,
        tts: sections.find(s => s.id === 'tts')?.enabled ?? true,
        visuals: sections.find(s => s.id === 'visuals')?.enabled ?? true,
        backgroundMusic: sections.find(s => s.id === 'backgroundMusic')?.enabled ?? true,
        intro: sections.find(s => s.id === 'intro')?.enabled ?? true,
        outro: sections.find(s => s.id === 'outro')?.enabled ?? true,
        personalityId: personalityId || undefined,
        targetDuration: undefined,
      }

      // Create episode in PocketBase
      const episodeData: Record<string, unknown> = {
        channel: channel.id,
        title: episodeTitle,
        slug: episodeSlug,
        topic: topic.trim(),
        status: 'generating',
        feedback_log: [],
        metadata: { generation_options: genOptions },
      }

      if (number.trim()) {
        episodeData.number = parseInt(number.trim(), 10)
      }

      if (selectedTemplate) {
        episodeData.template = selectedTemplate
      }

      const created = await pb.collection('episodes').create(episodeData)
      setEpisodeId(created.id)

      // Increment channel episode count
      await pb.collection('channels').update(channel.id, {
        episode_count: (channel.episode_count || 0) + 1,
      })

      // Start generation via orchestrator (SSE)
      const es = startEpisodeGeneration(created.id, {
        topic: topic.trim(),
        channelId: channel.id,
        options: genOptions,
        templateId: selectedTemplate || undefined,
        onProgress: (p: GenerationProgress) => {
          setProgress(p)
          if (p.stage === 'complete' || p.stage === 'failed') {
            setGenerating(false)
            if (p.stage === 'complete') {
              // Navigate to episode workspace after brief delay
              setTimeout(() => navigate(`/episodes/${created.id}`), 1500)
            }
          }
        },
        onError: (err: string) => {
          setError(err)
          setGenerating(false)
        },
      })
      eventSourceRef.current = es
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create episode')
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (error && !channel && !generating) {
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/channels/${slug}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">
            {generating ? 'Generating Episode' : 'New Episode'}
          </h1>
          <p className="mt-1 text-zinc-400">
            Channel: {channel?.name}
            {generating && episodeId && <span className="ml-2 text-purple-400">· In Progress</span>}
          </p>
        </div>
      </div>

      {/* Generation Progress */}
      {generating && progress && (
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-purple-300">
              <Zap className="h-5 w-5 animate-pulse" />
              {progress.stageLabel}
            </CardTitle>
            <CardDescription>{progress.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Overall progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Overall Progress</span>
                <span>{Math.round(progress.overallProgress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${progress.overallProgress}%` }}
                />
              </div>
            </div>

            {/* Stage progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>{progress.stageLabel}</span>
                <span>{Math.round(progress.progress)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-purple-400 transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>

            {/* Completion / Failure */}
            {progress.stage === 'complete' && (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Episode generated successfully!</span>
              </div>
            )}
            {progress.stage === 'failed' && (
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Generation failed: {progress.error}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Topic / Prompt */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Episode Blueprint
            </CardTitle>
            <CardDescription>
              Enter a topic or prompt. Everything else is auto-generated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic / Prompt *</Label>
              <Textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Latest AI developer tools released this week — what's new, what matters, and how to use them"
                rows={3}
                autoFocus
                required
                disabled={generating}
              />
              <p className="text-xs text-zinc-500">
                This drives research, scripting, and composition generation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Episode Title <span className="text-zinc-500">(optional — generated from topic if blank)</span></Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-generated from topic if left blank"
                disabled={generating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="number">Episode Number <span className="text-zinc-500">(optional)</span></Label>
              <Input
                id="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="e.g. 42"
                className="max-w-xs"
                disabled={generating}
              />
            </div>

            {personalities.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="personality">Voice Personality <span className="text-zinc-500">(optional)</span></Label>
                <Select value={personalityId} onValueChange={setPersonalityId} disabled={generating}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Select a personality..." />
                  </SelectTrigger>
                  <SelectContent>
                    {personalities.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generation Sections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>What to Generate</span>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-purple-400 hover:text-purple-300"
                  disabled={generating}
                >
                  Select All
                </button>
                <span className="text-zinc-600">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-zinc-500 hover:text-zinc-400"
                  disabled={generating}
                >
                  None
                </button>
              </div>
            </CardTitle>
            <CardDescription>
              Uncheck anything you already have or don't need. Unchecked steps are skipped.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {sections.map(section => (
                <label
                  key={section.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    section.enabled
                      ? 'border-purple-500/50 bg-purple-500/5'
                      : 'border-zinc-800 bg-zinc-900/30 opacity-60'
                  } ${generating ? 'pointer-events-none' : 'hover:border-zinc-600'}`}
                >
                  <Checkbox
                    checked={section.enabled}
                    onCheckedChange={() => toggleSection(section.id)}
                    disabled={generating}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">{section.icon}</span>
                      <span className="font-medium text-sm text-zinc-100">{section.label}</span>
                    </div>
                    <p className="text-xs text-zinc-500">{section.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Template Selection */}
        {templates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Use a Template</CardTitle>
              <CardDescription>
                Start from an existing template for consistent episode structure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                type="button"
                onClick={() => setSelectedTemplate('')}
                className={`w-full text-left rounded-lg border p-4 transition-colors mb-2 ${
                  selectedTemplate === ''
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
                disabled={generating}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  <div>
                    <p className="font-medium text-zinc-100">Blank — Generate Everything</p>
                    <p className="text-sm text-zinc-500">No template. Full auto-generation from your topic.</p>
                  </div>
                </div>
              </button>

              <div className="space-y-2">
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
                    disabled={generating}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-zinc-400" />
                      <div>
                        <p className="font-medium text-zinc-100">{tpl.name}</p>
                        {tpl.description && (
                          <p className="text-sm text-zinc-500">{tpl.description}</p>
                        )}
                        <p className="text-xs text-zinc-600 mt-1">
                          {(tpl.block_structure?.length || 0)} blocks · Used {tpl.usage_count || 0} times
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={!canGenerate}
            className="min-w-[200px]"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Generate Episode
              </>
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
