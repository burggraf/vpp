import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { pb } from '@/lib/pocketbase'
import type { Channel, StyleDNA, Episode } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { StyleDNAEditor } from '@/components/StyleDNAEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Edit2,
  Archive,
  Plus,
  Loader2,
  Palette,
  Terminal,
  Eye,
} from 'lucide-react'

export function ChannelDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [channel, setChannel] = useState<Channel | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDna, setShowDna] = useState(false)

  const fetchData = async () => {
    if (!slug) return
    try {
      setLoading(true)
      const chResult = await pb.collection('channels').getFirstListItem<Channel>(`slug="${slug}"`)
      const epResult = await pb.collection('episodes').getList<Episode>(1, 50, {
        filter: `channel="${chResult.id}"`,
        sort: '-created',
      })
      setChannel(chResult)
      setEpisodes(epResult.items)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch channel data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [slug])

  const handleEdit = async (data: { name: string; description: string; system_prompt: string; style_dna: Partial<StyleDNA> }) => {
    if (!channel) return
    try {
      setSaving(true)
      const updateData: Record<string, unknown> = {
        name: data.name,
        description: data.description,
        system_prompt: data.system_prompt,
      }
      if (Object.keys(data.style_dna).length > 0) {
        updateData.style_dna = { ...channel.style_dna, ...data.style_dna }
      }
      await pb.collection('channels').update(channel.id, updateData)
      setEditOpen(false)
      await fetchData()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update channel')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleArchive = async () => {
    if (!channel) return
    const newStatus = channel.status === 'archived' ? 'active' : 'archived'
    try {
      await pb.collection('channels').update(channel.id, { status: newStatus })
      await fetchData()
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading channel...
      </div>
    )
  }

  if (error || !channel) {
    return (
      <div className="space-y-4">
        <Link to="/channels">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </Link>
        <div className="rounded-lg border border-red-900/50 bg-red-900/20 p-6 text-center text-red-400">
          <p className="font-medium">{error ?? 'Channel not found'}</p>
          <Button variant="link" className="text-red-400" onClick={fetchData}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/channels">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-zinc-100">{channel.name}</h1>
              <StatusBadge status={channel.status} />
            </div>
            {channel.description && (
              <p className="mt-1 text-sm text-zinc-400">{channel.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToggleArchive}>
            <Archive className="mr-1 h-3 w-3" />
            {channel.status === 'archived' ? 'Unarchive' : 'Archive'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit2 className="mr-1 h-3 w-3" /> Edit
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Episodes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-100">{channel.episode_count ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold capitalize text-zinc-100">{channel.status}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-zinc-100">
              {channel.created ? new Date(channel.created).toLocaleDateString() : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Style DNA */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
            <Palette className="h-4 w-4" /> Style DNA
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowDna(!showDna)}>
            <Eye className="mr-1 h-3 w-3" />
            {showDna ? 'Hide' : 'Show'}
          </Button>
        </CardHeader>
        {showDna && channel.style_dna && (
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Primary Font:</span>{' '}
                <span className="text-zinc-200">{channel.style_dna.primary_font}</span>
              </div>
              <div>
                <span className="text-zinc-500">Secondary Font:</span>{' '}
                <span className="text-zinc-200">{channel.style_dna.secondary_font}</span>
              </div>
              <div>
                <span className="text-zinc-500">Resolution:</span>{' '}
                <span className="text-zinc-200">{channel.style_dna.resolution}</span>
              </div>
              <div>
                <span className="text-zinc-500">FPS:</span>{' '}
                <span className="text-zinc-200">{channel.style_dna.fps}</span>
              </div>
              <div>
                <span className="text-zinc-500">Title Position:</span>{' '}
                <span className="text-zinc-200 capitalize">{channel.style_dna.title_position}</span>
              </div>
              <div>
                <span className="text-zinc-500">Transition:</span>{' '}
                <span className="text-zinc-200 capitalize">{channel.style_dna.transition_type.replace('_', ' ')}</span>
              </div>
              {channel.style_dna.color_palette && channel.style_dna.color_palette.length > 0 && (
                <div className="col-span-2">
                  <span className="text-zinc-500">Colors:</span>{' '}
                  <span className="inline-flex gap-1.5 ml-1">
                    {channel.style_dna.color_palette.map((c, i) => (
                      <span
                        key={i}
                        className="inline-block h-4 w-4 rounded border border-zinc-600"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* System Prompt */}
      {channel.system_prompt && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Terminal className="h-4 w-4" /> System Prompt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-zinc-300 bg-zinc-950/50 rounded-lg p-4 border border-zinc-800 font-mono">
              {channel.system_prompt}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Episodes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Episodes</h2>
          <Button size="sm" onClick={() => navigate(`/channels/${slug}/new`)}>
            <Plus className="mr-1 h-3 w-3" /> New Episode
          </Button>
        </div>

        {episodes.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
            No episodes yet. Create one to get started.
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-20">Blocks</TableHead>
                  <TableHead className="w-20">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {episodes.map((ep) => (
                  <TableRow key={ep.id}>
                    <TableCell className="font-mono text-xs text-zinc-500">{ep.number}</TableCell>
                    <TableCell>
                      <Link
                        to={`/episodes/${ep.id}`}
                        className="font-medium text-zinc-100 hover:text-purple-400 transition-colors"
                      >
                        {ep.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-zinc-400 truncate max-w-xs">{ep.topic}</TableCell>
                    <TableCell>
                      <StatusBadge status={ep.status} />
                    </TableCell>
                    <TableCell className="text-zinc-400">{ep.block_count ?? 0}</TableCell>
                    <TableCell className="text-zinc-400">{ep.total_duration ?? 0}s</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <ChannelEditDialog
        channel={channel}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleEdit}
        saving={saving}
      />
    </div>
  )
}

function ChannelEditDialog({
  channel,
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  channel: Channel
  open: boolean
  onOpenChange: (o: boolean) => void
  onSave: (d: { name: string; description: string; system_prompt: string; style_dna: Partial<StyleDNA> }) => void
  saving: boolean
}) {
  const [name, setName] = useState(channel.name)
  const [description, setDescription] = useState(channel.description)
  const [systemPrompt, setSystemPrompt] = useState(channel.system_prompt)
  const [styleDna, setStyleDna] = useState<Partial<StyleDNA>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name, description, system_prompt: systemPrompt, style_dna: styleDna })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-prompt">System Prompt</Label>
            <Textarea
              id="edit-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
            />
          </div>
          <StyleDNAEditor value={styleDna} onChange={setStyleDna} />
          <div className="flex justify-end gap-2 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
