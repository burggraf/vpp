import { useState, useEffect } from 'react'
import { pb } from '@/lib/pocketbase'
import type { Block } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { ArrowUp, ArrowDown, Edit2, Plus, Loader2 } from 'lucide-react'

interface BlockListProps {
  episodeId: string
}

const BLOCK_TYPES: Block['block_type'][] = ['intro', 'title', 'content', 'lower_third', 'transition', 'outro', 'caption']

export function BlockList({ episodeId }: BlockListProps) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editBlock, setEditBlock] = useState<Block | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchBlocks = async () => {
    try {
      setLoading(true)
      const result = await pb.collection('blocks').getList<Block>(1, 100, {
        filter: `episode="${episodeId}"`,
        sort: 'order',
      })
      setBlocks(result.items)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch blocks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (episodeId) fetchBlocks()
  }, [episodeId])

  const reorder = async (block: Block, direction: 'up' | 'down') => {
    const idx = blocks.findIndex((b) => b.id === block.id)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= blocks.length) return

    const other = blocks[swapIdx]
    try {
      await Promise.all([
        pb.collection('blocks').update(block.id, { order: other.order }),
        pb.collection('blocks').update(other.id, { order: block.order }),
      ])
      await fetchBlocks()
    } catch {
      /* ignore */
    }
  }

  const deleteBlock = async (block: Block) => {
    try {
      await pb.collection('blocks').delete(block.id)
      await fetchBlocks()
    } catch {
      /* ignore */
    }
  }

  const handleEditSave = async (updated: Block) => {
    try {
      setSaving(true)
      await pb.collection('blocks').update(updated.id, updated)
      setEditBlock(null)
      await fetchBlocks()
    } catch {
      /* ignore */
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = async (data: Partial<Block>) => {
    try {
      setSaving(true)
      await pb.collection('blocks').create({
        episode: episodeId,
        block_type: data.block_type ?? 'content',
        order: blocks.length,
        script: data.script ?? '',
        duration: data.duration ?? 0,
        status: 'pending',
        composition_src: '',
        start_time: 0,
        track_index: 0,
        variables: {},
        assets: [],
      })
      setAddOpen(false)
      await fetchBlocks()
    } catch {
      /* ignore */
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-sm text-zinc-400">Loading blocks...</div>
  if (error) return <div className="text-sm text-red-400">{error}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-100">Blocks</h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add Block
        </Button>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-500">
          No blocks yet. Add one to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Script</TableHead>
              <TableHead className="w-20">Duration</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-40 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocks.map((block, i) => (
              <TableRow key={block.id}>
                <TableCell className="font-mono text-xs text-zinc-500">{block.order}</TableCell>
                <TableCell>
                  <span className="inline-flex rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 capitalize">
                    {block.block_type.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs truncate text-zinc-400">
                  {block.script || <span className="italic text-zinc-600">empty</span>}
                </TableCell>
                <TableCell className="text-zinc-400">{block.duration}s</TableCell>
                <TableCell>
                  <StatusBadge status={block.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={i === 0}
                      onClick={() => reorder(block, 'up')}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={i === blocks.length - 1}
                      onClick={() => reorder(block, 'down')}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditBlock(block)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-300"
                      onClick={() => deleteBlock(block)}
                    >
                      <span className="sr-only">Delete</span>
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Edit Dialog */}
      {editBlock && (
        <BlockEditDialog
          block={editBlock}
          open
          onOpenChange={(o) => !o && setEditBlock(null)}
          onSave={handleEditSave}
          saving={saving}
        />
      )}

      {/* Add Dialog */}
      <BlockAddDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={handleAdd}
        saving={saving}
      />
    </div>
  )
}

function BlockEditDialog({
  block,
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  block: Block
  open: boolean
  onOpenChange: (o: boolean) => void
  onSave: (b: Block) => void
  saving: boolean
}) {
  const [form, setForm] = useState<Block>(block)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Block</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Block Type</Label>
            <Select
              value={form.block_type}
              onValueChange={(v) => setForm({ ...form, block_type: v as Block['block_type'] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Script</Label>
            <Textarea
              value={form.script}
              onChange={(e) => setForm({ ...form, script: e.target.value })}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration (s)</Label>
              <Input
                type="number"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as Block['status'] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="needs_revision">Needs Revision</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button disabled={saving} onClick={() => onSave(form)}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function BlockAddDialog({
  open,
  onOpenChange,
  onAdd,
  saving,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onAdd: (d: Partial<Block>) => void
  saving: boolean
}) {
  const [blockType, setBlockType] = useState<Block['block_type']>('content')
  const [script, setScript] = useState('')
  const [duration, setDuration] = useState(5)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Block</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Block Type</Label>
            <Select value={blockType} onValueChange={(v) => setBlockType(v as Block['block_type'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Script</Label>
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={4}
              placeholder="Block script content..."
            />
          </div>
          <div className="space-y-2">
            <Label>Duration (s)</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button disabled={saving} onClick={() => onAdd({ block_type: blockType, script, duration })}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
