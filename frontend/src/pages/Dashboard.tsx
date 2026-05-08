import { Radio, RadioTower, Clapperboard, Calendar } from 'lucide-react'

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-zinc-400">Overview of your video production pipeline.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Radio} label="Channels" value="—" />
        <StatCard icon={Clapperboard} label="Episodes" value="—" />
        <StatCard icon={RadioTower} label="Active" value="—" />
        <StatCard icon={Calendar} label="Scheduled" value="—" />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-100">Recent Activity</h2>
        <p className="mt-2 text-sm text-zinc-500">No activity yet. Create a channel to get started.</p>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-zinc-800 p-2">
          <Icon className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-100">{value}</p>
          <p className="text-sm text-zinc-400">{label}</p>
        </div>
      </div>
    </div>
  )
}
