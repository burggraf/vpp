import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { pb } from '@/lib/pocketbase'
import type { MediaLibrary as MediaItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Image as ImageIcon, Video, Music, FileText, ExternalLink } from 'lucide-react'

function mediaTypeIcon(type: string) {
  switch (type) {
    case 'image': return <ImageIcon className="h-16 w-16" />
    case 'video': return <Video className="h-16 w-16" />
    case 'music': case 'audio': case 'sfx': return <Music className="h-16 w-16" />
    default: return <FileText className="h-16 w-16" />
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

export function MediaDetail() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<MediaItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const fetch = async () => {
      try {
        setLoading(true)
        const record = await pb.collection('media_library').getOne<MediaItem>(id)
        setItem(record)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch media')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  if (loading) return <div className="py-12 text-center text-zinc-500">Loading...</div>
  if (error) return <div className="py-12 text-center text-red-400">{error}</div>
  if (!item) return <div className="py-12 text-center text-zinc-500">Not found</div>

  const fileUrl = item.file_url || (item.file ? pb.files.getUrl(item, item.file) : '')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/media-library">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-zinc-100">{item.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
              {fileUrl && item.media_type === 'image' ? (
                <img src={fileUrl} alt={item.name} className="w-full h-full object-contain" />
              ) : fileUrl && item.media_type === 'video' ? (
                <video src={fileUrl} controls className="w-full h-full" />
              ) : fileUrl && (item.media_type === 'audio' || item.media_type === 'music' || item.media_type === 'sfx') ? (
                <div className="text-center p-8">
                  <Music className="h-16 w-16 mx-auto mb-4 text-zinc-600" />
                  <audio src={fileUrl} controls className="w-full" />
                </div>
              ) : (
                <div className="text-zinc-600">{mediaTypeIcon(item.media_type)}</div>
              )}
            </div>
            {fileUrl && (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center text-sm text-violet-400 hover:text-violet-300">
                <ExternalLink className="mr-1 h-3 w-3" /> Open original
              </a>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Type</span>
                <p>
                  <Badge variant="secondary" className={mediaTypeColor(item.media_type)}>
                    {item.media_type}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-zinc-500">Category</span>
                <p className="text-zinc-200">{item.category || '—'}</p>
              </div>
              <div>
                <span className="text-zinc-500">License</span>
                <p className="text-zinc-200">{item.license || '—'}</p>
              </div>
              <div>
                <span className="text-zinc-500">Usage Count</span>
                <p className="text-zinc-200">{item.usage_count}</p>
              </div>
              {item.duration > 0 && (
                <div>
                  <span className="text-zinc-500">Duration</span>
                  <p className="text-zinc-200">{item.duration}s</p>
                </div>
              )}
              {item.dimensions && (
                <div>
                  <span className="text-zinc-500">Dimensions</span>
                  <p className="text-zinc-200">{item.dimensions.width}×{item.dimensions.height}</p>
                </div>
              )}
            </div>

            {item.description && (
              <div>
                <span className="text-zinc-500 text-sm">Description</span>
                <p className="text-zinc-300 mt-1">{item.description}</p>
              </div>
            )}

            {item.tags.length > 0 && (
              <div>
                <span className="text-zinc-500 text-sm">Tags</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 text-xs text-zinc-600">
              <p>Created: {new Date(item.created).toLocaleDateString()}</p>
              <p>Updated: {new Date(item.updated).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
