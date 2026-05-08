import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

type StageStatus = 'pending' | 'active' | 'complete' | 'failed'

interface PipelineStage {
  id: string
  label: string
  status: StageStatus
}

interface PipelineStepperProps {
  stages: PipelineStage[]
  className?: string
}

const stageIcons: Record<string, React.ReactNode> = {
  pending: (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-600 bg-zinc-800">
      <span className="h-2 w-2 rounded-full bg-zinc-500" />
    </span>
  ),
  active: (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-purple-500 bg-purple-500/20">
      <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
    </span>
  ),
  complete: (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-green-500 bg-green-500/20">
      <Check className="h-4 w-4 text-green-400" />
    </span>
  ),
  failed: (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-red-500 bg-red-500/20">
      <X className="h-4 w-4 text-red-400" />
    </span>
  ),
}

const labelColors: Record<StageStatus, string> = {
  pending: 'text-zinc-500',
  active: 'text-purple-400 font-medium',
  complete: 'text-green-400',
  failed: 'text-red-400 font-medium',
}

export function PipelineStepper({ stages, className }: PipelineStepperProps) {
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto py-2', className)}>
      {stages.map((stage, i) => (
        <div key={stage.id} className="flex items-center gap-1 shrink-0">
          <div className="flex flex-col items-center gap-1.5">
            {stageIcons[stage.status]}
            <span className={cn('text-xs', labelColors[stage.status])}>
              {stage.label}
            </span>
          </div>
          {i < stages.length - 1 && (
            <div className={cn(
              'w-6 h-0.5',
              stage.status === 'failed' ? 'bg-red-500/50' :
              stage.status === 'complete' ? 'bg-green-500/50' :
              'bg-zinc-700',
            )} />
          )}
        </div>
      ))}
    </div>
  )
}

/** Derive PipelineStepper stages from an episode status string. */
export function getPipelineStages(episodeStatus: string): PipelineStage[] {
  const allStages = ['draft', 'generating', 'preview', 'reviewing', 'rendering', 'complete', 'failed']
  const status = episodeStatus as string
  const currentIndex = allStages.indexOf(status)

  if (currentIndex === -1) {
    return allStages.map((id) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1), status: 'pending' as StageStatus }))
  }

  return allStages.map((id, i) => {
    let s: StageStatus
    if (id === status) {
      s = status === 'failed' ? 'failed' : 'active'
    } else if (i < currentIndex) {
      s = 'complete'
    } else {
      s = 'pending'
    }
    return { id, label: id.charAt(0).toUpperCase() + id.slice(1), status: s }
  })
}
