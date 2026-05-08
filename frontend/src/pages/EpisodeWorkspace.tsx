import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { pb } from '@/lib/pocketbase'
import type { Episode } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { PipelineStepper, getPipelineStages } from '@/components/PipelineStepper'
import { BlockList } from '@/components/BlockList'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ArrowLeft, Loader2, Clock, FileStack, Search, FileText, Mic } from 'lucide-react'

export function EpisodeWorkspace() {
  const { id } = useParams<{ id: string }>()

  const [episode, setEpisode] = useState<Episode | null>(null)
  const [channelName, setChannelName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEpisode = async () => {
    if (!id) return
    try {
      setLoading(true)
      const ep = await pb.collection('episodes').getOne<Episode>(id)
      setEpisode(ep)

      // Fetch channel name
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

  useEffect(() => {
    fetchEpisode()
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <FileStack className="h-4 w-4" /> Blocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-100">{episode.block_count ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Clock className="h-4 w-4" /> Total Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-100">{episode.total_duration ?? 0}s</p>
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
      </div>

      {/* Blocks */}
      <BlockList episodeId={episode.id} />
    </div>
  )
}
