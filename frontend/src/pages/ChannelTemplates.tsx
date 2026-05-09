import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { pb } from '@/lib/pocketbase'
import { listTemplates, createEpisodeFromTemplate, deleteTemplate } from '@/lib/orchestrator'
import type { Channel, EpisodeTemplate } from '@/types'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Loader2,
  FileStack,
  Play,
  Trash2,
  Plus,
  Layers,
  Clock,
} from 'lucide-react'

export function ChannelTemplates() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [channel, setChannel] = useState<Channel | null>(null)
  const [templates, setTemplates] = useState<EpisodeTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [channelId, setChannelId] = useState<string>('')

  // Create episode dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EpisodeTemplate | null>(null)
  const [newTopic, setNewTopic] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!slug) return
      try {
        const channels = await pb.collection('channels').getFullList<Channel>({
          filter: `slug="${slug}"`,
        })
        if (channels.length > 0) {
          const ch = channels[0]
          setChannel(ch)
          setChannelId(ch.id)

          // Load templates from orchestrator
          try {
            const data = await listTemplates(ch.id)
            setTemplates(data.templates || [])
          } catch { /* orchestrator may not be running */ }
        }
      } catch {
        console.error('Failed to load channel')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  const handleCreateEpisode = async () => {
    if (!selectedTemplate || !newTopic.trim()) return
    try {
      setCreating(true)
      const result = await createEpisodeFromTemplate(
        selectedTemplate.id,
        newTopic.trim(),
        newTitle.trim() || undefined,
      )
      // Navigate to the new episode workspace
      navigate(`/episodes/${result.episode.id}`)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create episode')
    } finally {
      setCreating(false)
      setCreateDialogOpen(false)
      setNewTopic('')
      setNewTitle('')
      setSelectedTemplate(null)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template?')) return
    try {
      await deleteTemplate(templateId)
      setTemplates((prev) => prev.filter((t) => t.id !== templateId))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete template')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading templates...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {channel && (
          <Button variant="ghost" size="icon" onClick={() => navigate(`/channels/${channel.slug}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">
            {channel ? `${channel.name} — Templates` : 'Templates'}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Save episode structures as templates for quick reuse
          </p>
        </div>
      </div>

      {/* Template List */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 mb-2">No templates yet</p>
            <p className="text-sm text-zinc-500">
              Complete an episode, then click "Save as Template" from the episode workspace.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:border-zinc-600/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg text-zinc-100">{template.name}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {template.block_structure?.length || 0} blocks
                  </Badge>
                </div>
                {template.description && (
                  <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-zinc-400 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>~{template.default_duration || 60}s duration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileStack className="h-3.5 w-3.5" />
                    <span>Used {template.usage_count || 0} time{(template.usage_count || 0) !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Block structure preview */}
                {template.block_structure?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.block_structure.slice(0, 6).map((b: { block_type: string; order: number }, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[10px] capitalize">
                        {b.block_type.replace('_', ' ')}
                      </Badge>
                    ))}
                    {(template.block_structure.length > 6) && (
                      <Badge variant="secondary" className="text-[10px]">
                        +{template.block_structure.length - 6} more
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedTemplate(template)
                      setCreateDialogOpen(true)
                    }}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> New Episode
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-500 hover:text-red-400"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Episode Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Episode from Template</DialogTitle>
            <DialogDescription>
              Using template: <strong>{selectedTemplate?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="topic">Topic *</Label>
              <Input
                id="topic"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="What is this episode about?"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Auto-generated if left blank"
              />
            </div>

            {/* Template structure preview */}
            {selectedTemplate?.block_structure?.length > 0 && (
              <div>
                <Label className="text-xs text-zinc-500">Block Structure</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTemplate.block_structure.map((b: { block_type: string; order: number }, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs capitalize">
                      {b.order}. {b.block_type.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateEpisode} disabled={!newTopic.trim() || creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Create Episode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
