import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { pb } from '@/lib/pocketbase'
import { searchMedia, downloadMediaAsset, listMediaSources, analyzeEpisodeMedia } from '@/lib/orchestrator'
import type { MediaLibrary as MediaItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { ArrowLeft, Search, Loader2, Music, Play, ExternalLink, Plus, Library, Globe, Check } from 'lucide-react'

interface MediaNeed {
  segmentOrder: number
  visualNeeds: string
  suggestedAssets: string[]
  newAssetsNeeded: string[]
  musicMood: string
  transitionType: string
}

interface MediaAnalysisResult {
  segments: MediaNeed[]
  globalNeeds: {
    backgroundMusic: string
    logoAnimation: string
  }
  gapCount: number
}

export function EpisodeMedia() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [episode, setEpisode] = useState<any>(null)
  const [channel, setChannel] = useState<any>(null)
  const [analysis, setAnalysis] = useState<MediaAnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [libraryAssets, setLibraryAssets] = useState<MediaItem[]>([])
  const [musicAssets, setMusicAssets] = useState<MediaItem[]>([])

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const ep = await pb.collection('episodes').getOne(id)
      setEpisode(ep)

      if (ep.channel) {
        const ch = await pb.collection('channels').getOne(ep.channel)
        setChannel(ch)
      }

      // Load media library
      const media = await pb.collection('media_library').getList<MediaItem>(1, 200)
      setLibraryAssets(media.items)
      setMusicAssets(media.items.filter((m) => m.media_type === 'music' || m.category === 'background-music'))

      // Load existing analysis
      if (ep.metadata?.media_analysis) {
        setAnalysis(ep.metadata.media_analysis)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAnalyze = async () => {
    if (!id) return
    try {
      setAnalyzing(true)
      const result = await analyzeEpisodeMedia(id)
      setAnalysis(result.analysis)
      // Refresh episode to get updated metadata
      const ep = await pb.collection('episodes').getOne(id)
      setEpisode(ep)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) return <div className="py-12 text-center text-zinc-500"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
  if (error) return <div className="py-12 text-center text-red-400">{error}</div>
  if (!episode) return <div className="py-12 text-center text-zinc-500">Not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/episodes/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{episode.title || 'Untitled Episode'}</h1>
          <p className="text-sm text-zinc-500">Media & Assets</p>
        </div>
      </div>

      {/* Analyze button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Button onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Analyze Media Needs
            </Button>
            {analysis && (
              <div className="text-sm text-zinc-400">
                {analysis.segments.length} segments analyzed, {analysis.gapCount} assets needed
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!analysis ? (
        <Card>
          <CardContent className="pt-6 text-center text-zinc-500 py-12">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No media analysis yet</p>
            <p className="text-sm mt-1">Run analysis to identify needed assets</p>
          </Card>
        )
      ) : (
        <>
          {/* Segment needs */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-200">Segment Media Needs</h2>
            {analysis.segments.map((seg) => (
              <SegmentCard key={seg.segmentOrder} segment={seg} episodeId={id!} />
            ))}
          </div>

          {/* Background Music */}
          <MusicSelector musicAssets={musicAssets} episodeId={id!} episode={episode} />

          {/* Library assets browser */}
          <LibraryBrowser assets={libraryAssets} />
        </>
      )}
    </div>
  )
}

function SegmentCard({ segment, episodeId }: { segment: MediaNeed; episodeId: string }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Record<string, any[]> | null>(null)
  const [searching, setSearching] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery) return
    try {
      setSearching(true)
      const result = await searchMedia(searchQuery, { limit: 10 })
      setSearchResults(result.results || {})
    } catch (err: unknown) {
      console.error('Search failed:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleDownload = async (sourceId: string, asset: any) => {
    try {
      await downloadMediaAsset({
        sourceId,
        assetId: asset.id,
        name: asset.title || asset.id,
        mediaType: asset.type,
        tags: [],
        license: asset.license,
      })
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Download failed')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Segment {segment.segmentOrder}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <span className="text-sm text-zinc-500">Visual Needs:</span>
          <p className="text-zinc-300 mt-1">{segment.visualNeeds}</p>
        </div>

        {segment.newAssetsNeeded.length > 0 && (
          <div>
            <span className="text-sm text-zinc-500">Assets to Source:</span>
            <ul className="mt-1 space-y-1">
              {segment.newAssetsNeeded.map((need, i) => (
                <li key={i} className="text-sm text-zinc-400 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                  {need}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">Transition: {segment.transitionType}</Badge>
          <Badge variant="outline">Mood: {segment.musicMood}</Badge>
        </div>

        {/* Search for this segment */}
        <div className="flex gap-2">
          <Input
            placeholder="Search for assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button size="sm" onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {/* Search results */}
        {searchResults && Object.keys(searchResults).length > 0 && (
          <div className="space-y-2">
            {Object.entries(searchResults).map(([sourceId, assets]) => (
              <div key={sourceId}>
                <h4 className="text-sm font-medium text-zinc-400 mb-1">{sourceId}</h4>
                <div className="grid grid-cols-4 gap-2">
                  {(assets as any[]).slice(0, 8).map((asset) => (
                    <div key={asset.id} className="relative group">
                      <div className="aspect-square bg-zinc-800 rounded overflow-hidden">
                        {asset.thumbUrl ? (
                          <img src={asset.thumbUrl} alt={asset.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-zinc-600 text-xs">{asset.type}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDownload(sourceId, asset)}
                        className="absolute top-1 right-1 p-1 rounded bg-zinc-900/80 hover:bg-green-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MusicSelector({ musicAssets, episodeId, episode }: { musicAssets: MediaItem[]; episodeId: string; episode: any }) {
  const [selectedMusic, setSelectedMusic] = useState<string | null>(episode.metadata?.music_id || null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  const handleSelect = async (assetId: string) => {
    setSelectedMusic(assetId)
    await pb.collection('episodes').update(episodeId, {
      metadata: {
        ...(episode.metadata || {}),
        music_id: assetId,
      },
    })
    setShowDialog(false)
  }

  const selected = musicAssets.find((m) => m.id === selectedMusic)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" /> Background Music
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
          <Library className="mr-2 h-4 w-4" /> Select Music
        </Button>
      </CardHeader>
      <CardContent>
        {selected ? (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPlaying(playing === selected.id ? null : selected.id)}
            >
              {playing === selected.id ? 'Pause' : <Play className="h-4 w-4" />}
            </Button>
            <div>
              <p className="text-sm font-medium text-zinc-200">{selected.name}</p>
              <p className="text-xs text-zinc-500">{selected.category} • {selected.license}</p>
            </div>
            <Check className="h-4 w-4 text-green-500 ml-auto" />
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No background music selected</p>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Background Music</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {musicAssets.length === 0 ? (
              <p className="text-center text-zinc-500 py-8">No music in library. Upload music assets first.</p>
            ) : (
              musicAssets.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedMusic === m.id ? 'bg-violet-500/20 ring-1 ring-violet-500' : 'hover:bg-zinc-800'
                  }`}
                  onClick={() => handleSelect(m.id)}
                >
                  <Music className="h-5 w-5 text-zinc-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{m.name}</p>
                    <p className="text-xs text-zinc-500">{m.category} • {m.license || 'No license'}</p>
                  </div>
                  {selectedMusic === m.id && <Check className="h-4 w-4 text-green-500" />}
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function LibraryBrowser({ assets }: { assets: MediaItem[] }) {
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? assets : assets.filter((a) => a.media_type === filter)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Library className="h-5 w-5" /> Media Library
        </CardTitle>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="music">Music</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="graphic">Graphics</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {filtered.slice(0, 40).map((item) => (
            <Link key={item.id} to={`/media-library/${item.id}`} className="block">
              <div className="aspect-square bg-zinc-800 rounded overflow-hidden hover:ring-1 hover:ring-zinc-600 transition-all">
                {item.file_url || item.file ? (
                  <img
                    src={item.file_url || `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'/>`}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
                    {item.media_type.slice(0, 3)}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
        {filtered.length > 40 && (
          <p className="text-sm text-zinc-500 mt-2 text-center">
            Showing 40 of {filtered.length} assets. <Link to="/media-library" className="text-violet-400">View all</Link>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
