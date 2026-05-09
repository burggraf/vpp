import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { pb } from '@/lib/pocketbase'
import type { MediaLibrary as MediaItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Plus,
  Search,
  Upload,
  Edit2,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  X,
} from 'lucide-react'

const MEDIA_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'music', label: 'Music' },
  { value: 'sfx', label: 'SFX' },
  { value: 'font', label: 'Font' },
  { value: 'graphic', label: 'Graphic' },
] as const

const SORT_OPTIONS = [
  { value: '-created', label: 'Newest First' },
  { value: 'created', label: 'Oldest First' },
  { value: 'name', label: 'Name A-Z' },
  { value: '-name', label: 'Name Z-A' },
  { value: '-usage_count', label: 'Most Used' },
  { value: 'usage_count', label: 'Least Used' },
] as const

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function mediaTypeIcon(type: string) {
  switch (type) {
    case 'image': return <ImageIcon className="h-5 w-5" />
    case 'video': return <Video className="h-5 w-5" />
    case 'music': case 'audio': case 'sfx': return <Music className="h-5 w-5" />
    default: return <FileText className="h-5 w-5" />
  }
}

function mediaTypeColor(type: string): string {
  switch (type) {
    case 'image': return 'bg-blue-500/20 text-blue-400'
    case 'video': return 'bg-purple-500/20 text-purple-400'
    case 'music': return 'bg-green-500/20 text-green-400'
    case 'audio': return 'bg-green-500/20 text-green-400'
    case 'sfx': return 'bg-yellow-500/20 text-yellow-400'
    case 'font': return 'bg-pink-500/20 text-pink-400'
    case 'graphic': return 'bg-orange-500/20 text-orange-400'
    default: return 'bg-zinc-500/20 text-zinc-400'
  }
}

function fileUrl(item: MediaItem): string {
  if (item.file_url) return item.file_url
  if (item.file) return pb.files.getUrl(item, item.file)
  return ''
}

export function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState('-created')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      let filter = ''
      if (typeFilter && typeFilter !== 'all') filter += `media_type="${typeFilter}"`
      if (categoryFilter && categoryFilter !== 'all') {
        const catFilter = `category="${categoryFilter}"`
        filter = filter ? `${filter}&&${catFilter}` : catFilter
      }

      const result = await pb.collection('media_library').getList<MediaItem>(page, 24, {
        sort,
        filter: filter || undefined,
        expand: '',
      })
      setItems(result.items)
      setTotalPages(Math.ceil(result.totalItems / result.perPage))
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch media')
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, categoryFilter, sort])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const filteredItems = items.filter((item) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      item.name.toLowerCase().includes(s) ||
      item.tags.some((t) => t.toLowerCase().includes(s)) ||
      (item.description || '').toLowerCase().includes(s)
    )
  })

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-zinc-100">Media Library</h1>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 h-4 w-4" /> Upload
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            className="pl-9"
            placeholder="Search by name or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {MEDIA_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No media items found</p>
          <p className="text-sm mt-1">Upload assets to get started</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredItems.map((item) => (
              <MediaCard key={item.id} item={item} onEdit={() => { setEditingItem(item); setEditOpen(true) }} onDelete={fetchItems} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-zinc-400">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={fetchItems} />
      {editingItem && (
        <EditModal item={editingItem} open={editOpen} onOpenChange={setEditOpen} onSaved={fetchItems} />
      )}
    </div>
  )
}

function MediaCard({ item, onEdit, onDelete }: { item: MediaItem; onEdit: () => void; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const url = fileUrl(item)

  const handleDelete = async () => {
    if (item.usage_count > 0) {
      alert(`Cannot delete: used in ${item.usage_count} episode(s)`)
      return
    }
    if (!confirm(`Delete "${item.name}"?`)) return
    try {
      setDeleting(true)
      await pb.collection('media_library').delete(item.id)
      onDelete()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="group relative overflow-hidden hover:ring-1 hover:ring-zinc-600 transition-all">
      <Link to={`/media-library/${item.id}`}>
        <div className="aspect-square bg-zinc-800 flex items-center justify-center overflow-hidden">
          {url && item.media_type === 'image' ? (
            <img src={url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-zinc-600">{mediaTypeIcon(item.media_type)}</div>
          )}
        </div>
      </Link>
      <CardContent className="p-3">
        <Link to={`/media-library/${item.id}`} className="block">
          <p className="text-sm font-medium text-zinc-100 truncate">{item.name}</p>
        </Link>
        <div className="flex items-center gap-1 mt-1">
          <Badge variant="secondary" className={`text-xs ${mediaTypeColor(item.media_type)}`}>
            {item.media_type}
          </Badge>
          {item.usage_count > 0 && (
            <span className="text-xs text-zinc-500 ml-1">{item.usage_count} uses</span>
          )}
        </div>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] text-zinc-500">#{tag}</span>
            ))}
            {item.tags.length > 2 && (
              <span className="text-[10px] text-zinc-500">+{item.tags.length - 2}</span>
            )}
          </div>
        )}
      </CardContent>
      {/* Action overlay */}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.preventDefault(); onEdit() }}
          className="p-1 rounded bg-zinc-900/80 hover:bg-zinc-700 text-zinc-300"
        >
          <Edit2 className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); handleDelete() }}
          className="p-1 rounded bg-zinc-900/80 hover:bg-red-600 text-zinc-300"
          disabled={deleting}
        >
          {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        </button>
      </div>
    </Card>
  )
}

function UploadModal({ open, onOpenChange, onUploaded }: { open: boolean; onOpenChange: (v: boolean) => void; onUploaded: () => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [name, setName] = useState('')
  const [mediaType, setMediaType] = useState('image')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [license, setLicense] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...dropped])
    if (!name && dropped.length === 1) {
      setName(dropped[0].name.replace(/\.[^.]+$/, ''))
    }
    // Auto-detect type
    if (!mediaType || mediaType === 'image') {
      const f = dropped[0]
      if (f.type.startsWith('video/')) setMediaType('video')
      else if (f.type.startsWith('audio/')) setMediaType('audio')
      else if (f.type.startsWith('font/')) setMediaType('font')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...selected])
      if (!name && selected.length === 1) {
        setName(selected[0].name.replace(/\.[^.]+$/, ''))
      }
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    try {
      setUploading(true)
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', name || file.name.replace(/\.[^.]+$/, ''))
        formData.append('slug', slugify(name || file.name))
        formData.append('media_type', mediaType)
        formData.append('category', category)
        formData.append('tags', JSON.stringify(tags.split(',').map((t) => t.trim()).filter(Boolean)))
        formData.append('license', license)
        formData.append('description', description)
        formData.append('usage_count', '0')
        await pb.collection('media_library').create(formData)
      }
      onOpenChange(false)
      onUploaded()
      // Reset
      setFiles([])
      setName('')
      setMediaType('image')
      setCategory('')
      setTags('')
      setLicense('')
      setDescription('')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Media</DialogTitle>
        </DialogHeader>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver ? 'border-violet-500 bg-violet-500/10' : 'border-zinc-700 hover:border-zinc-600'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-zinc-500" />
          <p className="text-sm text-zinc-400">Drag & drop files here, or</p>
          <label className="text-sm text-violet-400 hover:text-violet-300 cursor-pointer">
            browse files
            <input type="file" multiple className="hidden" onChange={handleFileSelect} />
          </label>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-zinc-800 rounded px-3 py-1">
                <span className="text-zinc-300 truncate flex-1">{f.name}</span>
                <span className="text-zinc-500 ml-2">{(f.size / 1024).toFixed(0)}KB</span>
                <button onClick={() => removeFile(i)} className="ml-2 text-zinc-500 hover:text-red-400">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Asset name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={mediaType} onValueChange={setMediaType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEDIA_TYPE_OPTIONS.filter((o) => o.value).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. background-music" />
            </div>
          </div>
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tech, modern, clean" />
          </div>
          <div>
            <Label>License</Label>
            <Input value={license} onChange={(e) => setLicense(e.target.value)} placeholder="CC-BY, Public Domain, etc." />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpload} disabled={files.length === 0 || uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload {files.length > 1 ? `(${files.length})` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EditModal({ item, open, onOpenChange, onSaved }: { item: MediaItem; open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [name, setName] = useState(item.name)
  const [category, setCategory] = useState(item.category)
  const [tags, setTags] = useState(item.tags.join(', '))
  const [license, setLicense] = useState(item.license)
  const [description, setDescription] = useState(item.description)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)
      await pb.collection('media_library').update(item.id, {
        name,
        slug: slugify(name),
        category,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        license,
        description,
      })
      onOpenChange(false)
      onSaved()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Media</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div>
            <Label>License</Label>
            <Input value={license} onChange={(e) => setLicense(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
