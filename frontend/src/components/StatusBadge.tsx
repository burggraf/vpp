import { cn } from '@/lib/utils'
import type { Episode, Block, Channel } from '@/types'

type EntityStatus = Episode['status'] | Block['status'] | Channel['status']

interface StatusBadgeProps {
  status: EntityStatus
  label?: string
  className?: string
}

const statusColors: Record<string, string> = {
  // Episode
  draft: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  generating: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  preview: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  reviewing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  rendering: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  complete: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  // Block
  pending: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  generated: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  needs_revision: 'bg-red-500/20 text-red-400 border-red-500/30',
  // Channel
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  archived: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const displayLabel = label ?? status.replace(/_/g, ' ')
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
        statusColors[status] ?? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
        className,
      )}
    >
      {displayLabel}
    </span>
  )
}
