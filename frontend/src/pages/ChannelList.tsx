import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { pb } from '@/lib/pocketbase'
import type { Channel, StyleDNA } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { StyleDNAEditor } from '@/components/StyleDNAEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { Plus, Edit2, Archive, Loader2 } from 'lucide-react'

const DEFAULT_STYLE_DNA: StyleDNA = {
  primary_font: 'Inter',
  secondary_font: 'Roboto',
  color_palette: ['#8B5CF6', '#6366F1', '#1E293B'],
  title_position: 'center',
  lower_third_style: 'minimal',
  transition_type: 'crossfade',
  background_style: 'gradient',
  logo_url: '',
  intro_duration: 3,
  outro_duration: 3,
  resolution: '1920x1080',
  fps: 30,
  tts_voice: '',
  tts_speed: 1.0,
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function ChannelList() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const fetchChannels = async () => {
    try {
      setLoading(true)
      const result = await pb.collection('channels').getList<Channel>(1, 50)
      setChannels(result.items)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch channels')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChannels()
  }, [])

  const handleCreate = async (data: { name: string; description: string; system_prompt: string; style_dna: Partial<StyleDNA> }) => {
    try {
      setSaving(true)
      await pb.collection('channels').create({
        name: data.name,
        slug: slugify(data.name),
        description: data.description,
        system_prompt: data.system_prompt,
        style_dna: { ...DEFAULT_STYLE_DNA, ...data.style_dna },
        status: 'active',
        intro_video: '',
        outro_video: '',
        episode_count: 0,
        schedule: '',
        schedule_enabled: false,
        schedule_template: '',
        schedule_auto_advance: false,
      })
      setCreateOpen(false)
      await fetchChannels()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create channel')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (channel: Channel) => {
    const newStatus = channel.status === 'archived' ? 'active' : 'archived'
    try {
      await pb.collection('channels').update(channel.id, { status: newStatus })
      await fetchChannels()
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Channels</h1>
          <p className="mt-1 text-zinc-400">Manage your video channels and brand styles.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Channel
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
          <Button variant="link" size="sm" className="ml-2 text-red-400" onClick={fetchChannels}>Retry</Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading channels...
        </div>
      ) : channels.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-400">No channels yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Episodes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((ch) => (
                <TableRow key={ch.id}>
                  <TableCell>
                    <Link to={`/channels/${ch.slug}`} className="font-medium text-zinc-100 hover:text-purple-400 transition-colors">
                      {ch.name}
                    </Link>
                    {ch.description && (
                      <p className="text-xs text-zinc-500 truncate max-w-xs mt-0.5">{ch.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ch.status} />
                  </TableCell>
                  <TableCell className="text-zinc-400">{ch.episode_count ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/channels/${ch.slug}`)}>
                        <Edit2 className="mr-1 h-3 w-3" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleArchive(ch)}>
                        <Archive className="mr-1 h-3 w-3" />
                        {ch.status === 'archived' ? 'Unarchive' : 'Archive'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ChannelCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
        saving={saving}
      />
    </div>
  )
}

function ChannelCreateDialog({
  open,
  onOpenChange,
  onCreate,
  saving,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreate: (d: { name: string; description: string; system_prompt: string; style_dna: Partial<StyleDNA> }) => void
  saving: boolean
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [styleDna, setStyleDna] = useState<Partial<StyleDNA>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreate({ name, description, system_prompt: systemPrompt, style_dna: styleDna })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ch-name">Name</Label>
            <Input
              id="ch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Channel name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-desc">Description</Label>
            <Textarea
              id="ch-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Channel description..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ch-prompt">System Prompt</Label>
            <Textarea
              id="ch-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="System prompt for content generation..."
              rows={3}
            />
          </div>
          <StyleDNAEditor value={styleDna} onChange={setStyleDna} />
          <div className="flex justify-end gap-2 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
