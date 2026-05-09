import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { pb } from '@/lib/pocketbase'
import { saveAsTemplate } from '@/lib/orchestrator'
import type { Episode, Block } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { PipelineStepper, getPipelineStages } from '@/components/PipelineStepper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Loader2,
  Clock,
  FileStack,
  Search,
  FileText,
  Mic,
  Sparkles,
  Play,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Image,
  Music,
  Film,
  GripVertical,
  Save,
} from 'lucide-react'

const BLOCK_TYPE_ICONS: Record<string, React.ReactNode> = {
  intro: <Clapperboard className="h-4 w-4 text-yellow-400" />,
  title: <FileText className="h-4 w-4 text-blue-400" />,
  content: <Image className="h-4 w-4 text-green-400" />,
  lower_third: <FileText className="h-4 w-4 text-cyan-400" />,
  transition: <Sparkles className="h-4 w-4 text-purple-400" />,
  outro: <Film className="h-4 w-4 text-pink-400" />,
  caption: <FileText className="h-4 w-4 text-zinc-400" />,
}

const BLOCK_TYPE_COLORS: Record<string, string> = {
  intro: 'border-yellow-500/30 bg-yellow-500/5',
  title: 'border-blue-500/30 bg-blue-500/5',
  content: 'border-green-500/30 bg-green-500/5',
  lower_third: 'border-cyan-500/30 bg-cyan-500/5',
  transition: 'border-purple-500/30 bg-purple-500/5',
  outro: 'border-pink-500/30 bg-pink-500/5',
  caption: 'border-zinc-500/30 bg-zinc-500/5',
}

export function EpisodeWorkspace() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [episode, setEpisode] = useState<Episode | null>(null)
  const [channelName, setChannelName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Blocks
  const [blocks, setBlocks] = useState<Block[]>([])
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null)

  // Save template dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewBlock, setPreviewBlock] = useState<Block | null>(null)

  const fetchEpisode = async () => {
    if (!id) return
    try {
      setLoading(true)
      const ep = await pb.collection('episodes').getOne<Episode>(id)
      setEpisode(ep)

      if (ep.channel) {
        const ch = await pb.collection('channels').getOne(ep.channel)
        setChannelName(ch.name ?? '')
      }
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch episode')
    } finally {
      setLoading(false)
    }
  }

  const fetchBlocks = async () => {
    if (!id) return
    try {
      const result = await pb.collection('blocks').getList<Block>(1, 100, {
        filter: `episode="${id}"`,
        sort: 'order',
      })
      setBlocks(result.items)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchEpisode()
    fetchBlocks()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading episode...
      </div>
    )
  }

  if (error || !episode) {
    return (
      <div className="space-y-4">
        <Link to="/channels">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </Link>
        <div className="rounded-lg border border-red-900/50 bg-red-900/20 p-6 text-center text-red-400">
          <p className="font-medium">{error ?? 'Episode not found'}</p>
        </div>
      </div>
    )
  }

  const stages = getPipelineStages(episode.status)
  const totalDuration = blocks.reduce((sum, b) => sum + (b.duration || 0), 0)

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return
    try {
      setSavingTemplate(true)
      await saveAsTemplate(episode.id, templateName.trim(), templateDescription.trim() || undefined)
      setTemplateDialogOpen(false)
      setTemplateName('')
      setTemplateDescription('')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSavingTemplate(false)
    }
  }

  const updateBlock = async (blockId: string, data: Partial<Block>) => {
    try {
      await pb.collection('blocks').update(blockId, data)
      await fetchBlocks()
    } catch { /* ignore */ }
  }

  const deleteBlock = async (blockId: string) => {
    try {
      await pb.collection('blocks').delete(blockId)
      await fetchBlocks()
      // Re-order remaining blocks
      const remaining = blocks.filter(b => b.id !== blockId)
      await Promise.all(
        remaining.map((b, i) => pb.collection('blocks').update(b.id, { order: i + 1 }))
      )
      await fetchBlocks()
    } catch { /* ignore */ }
  }

  const moveBlock = async (blockId: string, direction: 'up' | 'down') => {
    const idx = blocks.findIndex(b => b.id === blockId)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= blocks.length) return

    const other = blocks[swapIdx]
    try {
      await Promise.all([
        pb.collection('blocks').update(blockId, { order: other.order }),
        pb.collection('blocks').update(other.id, { order: blocks[idx].order }),
      ])
      await fetchBlocks()
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/channels/${episode.channel}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-zinc-100">{episode.title}</h1>
              <StatusBadge status={episode.status} />
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Channel: {channelName || episode.channel}
              {episode.topic && <span className="ml-2">· Topic: {episode.topic}</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {(episode.status === 'preview' || episode.status === 'complete') && (
            <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)}>
              <Save className="mr-2 h-4 w-4" /> Save as Template
            </Button>
          )}
          <Link to={`/episodes/${episode.id}/research`}>
            <Button variant="outline" size="sm">
              <Search className="mr-2 h-4 w-4" /> Research
            </Button>
          </Link>
          <Link to={`/episodes/${episode.id}/script`}>
            <Button variant="outline" size="sm">
              <FileText className="mr-2 h-4 w-4" /> Script
            </Button>
          </Link>
        </div>
      </div>

      {/* Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-400">Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <PipelineStepper stages={stages} />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <FileStack className="h-4 w-4" /> Blocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-100">{blocks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Clock className="h-4 w-4" /> Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-100">{totalDuration || episode.total_duration || 0}s</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Episode #</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-100">{episode.number ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold capitalize text-zinc-100">{episode.status}</p>
          </CardContent>
        </Card>
      </div>

      {/* Preview Panel */}
      {previewOpen && previewBlock && (
        <Card className="border-purple-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-purple-400" />
              Preview: {previewBlock.block_type} #{previewBlock.order}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setPreviewOpen(false); setPreviewBlock(null); }}>Close</Button>
            </CardTitle>
            <CardDescription>
              {previewBlock.composition_src}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Script preview */}
            {previewBlock.script && (
              <div className="mb-4 p-3 rounded bg-zinc-900 border border-zinc-800">
                <Label className="text-xs text-zinc-500 mb-1 block">Script</Label>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{previewBlock.script}</p>
              </div>
            )}
            {/* Composition file info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Duration:</span>{' '}
                <span className="text-zinc-200">{previewBlock.duration || 0}s</span>
              </div>
              <div>
                <span className="text-zinc-500">Status:</span>{' '}
                <span className="text-zinc-200 capitalize">{previewBlock.status.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-zinc-500">Track:</span>{' '}
                <span className="text-zinc-200">{previewBlock.track_index}</span>
              </div>
              <div>
                <span className="text-zinc-500">Composition:</span>{' '}
                <span className="text-zinc-200 font-mono text-xs">{previewBlock.composition_src}</span>
              </div>
            </div>
            {previewBlock.assets && previewBlock.assets.length > 0 && (
              <div className="mt-4">
                <Label className="text-xs text-zinc-500 mb-1 block">Assets</Label>
                <div className="flex flex-wrap gap-2">
                  {previewBlock.assets.map((a, i) => (
                    <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded font-mono">{a}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 p-3 rounded bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-300">
                Preview rendering requires the HyperFrames dev server. Run{' '}
                <code className="bg-amber-500/20 px-1 rounded">npx hyperframes preview</code>{' '}
                in the episode's composition directory to see the visual preview.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-purple-400" />
            Episode Blocks
          </CardTitle>
          <CardDescription>
            Click a block to view details and preview. Edit inline or open the composition.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
              <p className="text-zinc-500 mb-2">No blocks yet.</p>
              <p className="text-sm text-zinc-600">
                Generate an episode from the channel page to auto-create blocks,
                or add them manually.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((block) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  expanded={expandedBlock === block.id}
                  onToggle={() => {
                    setExpandedBlock(expandedBlock === block.id ? null : block.id)
                    setPreviewBlock(block)
                    setPreviewOpen(expandedBlock !== block.id)
                  }}
                  onUpdate={(data) => updateBlock(block.id, data)}
                  onDelete={() => deleteBlock(block.id)}
                  onMove={(dir) => moveBlock(block.id, dir)}
                  onPreview={() => {
                    setPreviewBlock(block)
                    setPreviewOpen(true)
                  }}
                  isFirst={block.order === 1}
                  isLast={block.order === blocks.length}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save as Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Template Name *</Label>
              <Input
                id="tpl-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Weekly Tech Review"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-desc">Description</Label>
              <Textarea
                id="tpl-desc"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="What this template is for..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSaveTemplate} disabled={!templateName.trim() || savingTemplate}>
                {savingTemplate ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Template
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Block Card ─────────────────────────────────────────────────────────── */

function BlockCard({
  block,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  onMove,
  isFirst,
  isLast,
}: {
  block: Block
  expanded: boolean
  onToggle: () => void
  onUpdate: (data: Partial<Block>) => void
  onDelete: () => void
  onMove: (dir: 'up' | 'down') => void
  isFirst: boolean
  isLast: boolean
}) {
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState(block)

  useEffect(() => {
    setForm(block)
  }, [block])

  const handleSave = () => {
    onUpdate(form)
    setEditMode(false)
  }

  const statusColors: Record<string, string> = {
    pending: 'text-zinc-500',
    generated: 'text-blue-400',
    approved: 'text-green-400',
    needs_revision: 'text-amber-400',
  }

  return (
    <div className={`rounded-lg border transition-colors ${BLOCK_TYPE_COLORS[block.block_type] || 'border-zinc-800'}`}>
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-zinc-800/30"
        onClick={onToggle}
      >
        <GripVertical className="h-4 w-4 text-zinc-600 shrink-0" />
        <span className="text-zinc-500">{BLOCK_TYPE_ICONS[block.block_type] || <FileStack className="h-4 w-4" />}</span>
        <span className="font-medium text-sm text-zinc-100 capitalize flex-1">{block.block_type}</span>
        <span className="text-xs text-zinc-500">#{block.order}</span>
        {block.duration && (
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <Clock className="h-3 w-3" /> {block.duration}s
          </span>
        )}
        <span className={`text-xs ${statusColors[block.status] || 'text-zinc-500'} capitalize`}>
          {block.status.replace('_', ' ')}
        </span>
        {expanded ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-zinc-800/50 p-4 space-y-3">
          {editMode ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Script</Label>
                <Textarea
                  value={form.script}
                  onChange={(e) => setForm({ ...form, script: e.target.value })}
                  rows={3}
                  className="text-sm"
                />
              </div>
              <div className="flex gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Duration (s)</Label>
                  <Input
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                    className="w-24 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Block['status'] })}
                    className="rounded-md border border-zinc-700 bg-zinc-800 text-sm text-zinc-100 px-2 py-1.5"
                  >
                    <option value="pending">Pending</option>
                    <option value="generated">Generated</option>
                    <option value="approved">Approved</option>
                    <option value="needs_revision">Needs Revision</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleSave}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              {block.script && (
                <div>
                  <Label className="text-xs text-zinc-500">Script</Label>
                  <p className="text-sm text-zinc-300 mt-1 whitespace-pre-wrap">{block.script}</p>
                </div>
              )}
              {block.composition_src && (
                <div>
                  <Label className="text-xs text-zinc-500">Composition</Label>
                  <p className="text-sm text-zinc-400 font-mono mt-1">{block.composition_src}</p>
                </div>
              )}
              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => setEditMode(true)}>
                  <Edit2 className="mr-1 h-3 w-3" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onMove('up')} disabled={isFirst}>
                  ↑
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onMove('down')} disabled={isLast}>
                  ↓
                </Button>
                <Button size="sm" variant="ghost" className="text-red-400" onClick={onDelete}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
