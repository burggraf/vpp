import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export function NewEpisode() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/channels/${slug}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">New Episode</h1>
          <p className="mt-1 text-zinc-400">Channel: {slug}</p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-100">Choose a starting point</h2>
        <p className="mt-2 text-sm text-zinc-500">Select a template or start from scratch.</p>
      </div>
    </div>
  )
}
