import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, ExternalLink, RefreshCw, StopCircle, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { startPreview, stopPreview, getPreviewStatus } from '@/lib/orchestrator'

interface PreviewPlayerProps {
  episodeId: string
  className?: string
  onStatusChange?: (status: 'starting' | 'running' | 'stopped' | 'error') => void
}

export function PreviewPlayer({ episodeId, className, onStatusChange }: PreviewPlayerProps) {
  const [status, setStatus] = useState<'starting' | 'running' | 'stopped' | 'error'>('stopped')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const iframeKey = useRef(0)

  const handleStart = useCallback(async () => {
    try {
      setStatus('starting')
      setError(null)
      onStatusChange?.('starting')

      const result = await startPreview(episodeId)
      setPreviewUrl(result.url)
      setStatus('running')
      onStatusChange?.('running')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start preview'
      setError(msg)
      setStatus('error')
      onStatusChange?.('error')
    }
  }, [episodeId, onStatusChange])

  const handleStop = useCallback(async () => {
    try {
      await stopPreview(episodeId)
      setPreviewUrl(null)
      setStatus('stopped')
      onStatusChange?.('stopped')
    } catch (err: unknown) {
      console.error('Failed to stop preview:', err)
    }
  }, [episodeId, onStatusChange])

  const handleRefresh = useCallback(() => {
    iframeKey.current += 1
  }, [])

  // Check for existing active preview on mount
  useEffect(() => {
    getPreviewStatus().then((data) => {
      if (data.active && data.episodeId === episodeId) {
        setPreviewUrl(data.url)
        setStatus('running')
        onStatusChange?.('running')
      }
    }).catch(() => { /* orchestrator may not be running */ })
  }, [episodeId, onStatusChange])

  if (status === 'stopped') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-4 rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-12', className)}>
        <Play className="h-12 w-12 text-zinc-600" />
        <p className="text-sm text-zinc-500">Preview server is stopped</p>
        <Button onClick={handleStart} size="sm">
          <Play className="mr-2 h-4 w-4" /> Start Preview
        </Button>
      </div>
    )
  }

  if (status === 'starting') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-4 rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-12', className)}>
        <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
        <p className="text-sm text-zinc-400">Starting preview server...</p>
        <Button variant="ghost" size="sm" onClick={handleStop}>
          <StopCircle className="mr-2 h-4 w-4" /> Cancel
        </Button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-4 rounded-lg border border-red-900/50 bg-red-900/20 p-12', className)}>
        <p className="text-sm text-red-400">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleStart}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setStatus('stopped'); setError(null) }}>
            Close
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col rounded-lg border border-zinc-700/50 bg-zinc-900 overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/50 bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 mr-1 animate-pulse" />
            Live
          </Badge>
          <span className="text-xs text-zinc-500 font-mono truncate max-w-[200px]">
            {previewUrl}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh} title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Open in new tab">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={handleStop} title="Stop preview">
            <StopCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* iframe */}
      {previewUrl && (
        <iframe
          key={iframeKey.current}
          ref={iframeRef}
          src={previewUrl}
          className="w-full flex-1 min-h-[400px] bg-white"
          sandbox="allow-scripts allow-same-origin"
        />
      )}
    </div>
  )
}
