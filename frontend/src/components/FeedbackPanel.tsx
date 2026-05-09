import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Send, MessageSquare, User, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { submitFeedback, getFeedbackLog } from '@/lib/orchestrator'
import type { FeedbackEntry, Block } from '@/types'

interface FeedbackPanelProps {
  episodeId: string
  blocks?: Block[]
  className?: string
}

export function FeedbackPanel({ episodeId, blocks = [], className }: FeedbackPanelProps) {
  const [feedback, setFeedback] = useState('')
  const [targetBlockId, setTargetBlockId] = useState<string>('__all__')
  const [log, setLog] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load feedback log
  useEffect(() => {
    let cancelled = false
    getFeedbackLog(episodeId)
      .then((data) => {
        if (!cancelled && data?.feedback_log) {
          setLog(data.feedback_log)
        }
      })
      .catch(() => { /* orchestrator may not be running */ })
    return () => { cancelled = true }
  }, [episodeId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  const handleSubmit = async () => {
    if (!feedback.trim() || submitting) return
    setSubmitting(true)
    try {
      const result = await submitFeedback(
        episodeId,
        feedback.trim(),
        targetBlockId && targetBlockId !== '__all__' ? targetBlockId : undefined
      )
      setFeedback('')
      // Refresh log from server
      const updated = await getFeedbackLog(episodeId)
      if (updated?.feedback_log) {
        setLog(updated.feedback_log)
      }
    } catch (err: unknown) {
      console.error('Feedback failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-700/50 bg-zinc-800/30">
        <MessageSquare className="h-4 w-4 text-zinc-400" />
        <h3 className="text-sm font-medium text-zinc-200">Feedback</h3>
        {log.length > 0 && (
          <span className="ml-auto text-xs text-zinc-500">{log.length} iteration{log.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        {log.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageSquare className="h-8 w-8 text-zinc-700 mb-2" />
            <p className="text-sm text-zinc-500">No feedback yet</p>
            <p className="text-xs text-zinc-600 mt-1">Describe changes you'd like to see</p>
          </div>
        )}

        {log.map((entry) => (
          <div key={entry.iteration} className="space-y-3">
            {/* User message */}
            <div className="flex gap-2">
              <div className="flex-shrink-0 mt-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 border border-blue-500/30">
                  <User className="h-3 w-3 text-blue-400" />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-300">You</span>
                  {entry.target_block && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400">
                      block #{entry.target_block.slice(0, 8)}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-600">
                    #{entry.iteration}
                  </span>
                </div>
                <p className="text-sm text-zinc-200 whitespace-pre-wrap">{entry.feedback}</p>
              </div>
            </div>

            {/* Agent response */}
            {entry.agent_response && (
              <div className="flex gap-2">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 border border-green-500/30">
                    <Bot className="h-3 w-3 text-green-400" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-xs font-medium text-zinc-400">Agent</span>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                    {entry.agent_response}
                  </p>
                </div>
              </div>
            )}

            {/* Working indicator */}
            {!entry.agent_response && submitting && (
              <div className="flex gap-2">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 border border-green-500/30">
                    <Loader2 className="h-3 w-3 text-green-400 animate-spin" />
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-xs text-zinc-500 italic">Agent is working...</span>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-700/50 p-3 space-y-2 bg-zinc-800/20">
        {blocks.length > 0 && (
          <Select value={targetBlockId} onValueChange={setTargetBlockId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All blocks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All blocks</SelectItem>
              {blocks.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.block_type} #{b.order}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex gap-2">
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe changes... (⌘+Enter to send)"
            className="min-h-[60px] text-sm resize-none"
            rows={2}
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!feedback.trim() || submitting}
            className="self-end h-[60px] px-3"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
