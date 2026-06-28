import type { OverviewStats } from '../api/client'
import { Activity, Coins, Timer, DollarSign, AlertTriangle, Hash, BrainCircuit, Zap } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Skeleton } from './ui/skeleton'

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const formatCost = (n: number): string => {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

const formatMs = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`
  return `${Math.round(n)}ms`
}

interface StatCardProps {
  label: string
  value: string
  subLabel?: string
  icon: React.ElementType
  accent: 'primary' | 'green' | 'amber' | 'blue' | 'red' | 'purple'
  loading?: boolean
}

function StatCard({ label, value, subLabel, icon: Icon, accent = 'primary', loading }: StatCardProps) {
  const iconBg = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    blue: 'bg-sky-500/10 text-sky-400',
    red: 'bg-destructive/10 text-destructive',
    purple: 'bg-purple-500/10 text-purple-400',
  }[accent]
  return (
    <Card className="group relative overflow-hidden hover:border-primary/20 transition-all duration-200 hover:shadow-md hover:shadow-black/10">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[0.65rem] font-semibold text-muted-foreground tracking-wider uppercase truncate">
              {label}
            </p>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-0.5" />
            ) : (
              <p className="text-[1.5rem] font-bold tracking-tight tabular-nums truncate">{value}</p>
            )}
            {loading ? (
              <Skeleton className="h-3.5 w-32 mt-0.5" />
            ) : subLabel && (
              <p className="text-[0.675rem] text-muted-foreground/70 truncate">{subLabel}</p>
            )}
          </div>
          <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${iconBg} shrink-0 transition-transform group-hover:scale-110`}>
            <Icon size={17} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface StatCardsProps {
  stats: OverviewStats | null
  loading?: boolean
}

export default function StatCards({ stats, loading }: StatCardsProps) {
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <StatCard key={`skel-${i}`} label="Loading" value="" icon={Activity} accent="primary" loading />
        ))}
      </div>
    )
  }

  if (!stats) return null

  const totalTokens = stats.total_prompt_tokens + stats.total_completion_tokens
  const tokensPerReq = stats.total_requests > 0 ? Math.round(totalTokens / stats.total_requests) : 0
  const costPerReq = stats.total_requests > 0 ? stats.total_cost / stats.total_requests : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Total Requests"
        value={formatNumber(stats.total_requests)}
        subLabel={`${formatNumber(stats.success_count)} success · ${formatNumber(stats.error_count)} failed`}
        icon={Activity}
        accent="primary"
      />
      <StatCard
        label="Total Tokens"
        value={formatNumber(totalTokens)}
        subLabel={`${formatNumber(tokensPerReq)} avg per request`}
        icon={Zap}
        accent="purple"
      />
      <StatCard
        label="Avg Latency"
        value={formatMs(stats.avg_latency_ms)}
        subLabel={`TTFT ${formatMs(stats.avg_time_to_first_token_ms)}`}
        icon={Timer}
        accent={stats.avg_latency_ms > 2500 ? 'amber' : 'green'}
      />
      <StatCard
        label="Total Cost"
        value={formatCost(stats.total_cost)}
        subLabel={`${formatCost(costPerReq)} per request`}
        icon={DollarSign}
        accent="blue"
      />
      <StatCard
        label="Error Rate"
        value={`${stats.error_rate.toFixed(2)}%`}
        subLabel={stats.error_rate > 5 ? '⚠ Above threshold' : stats.error_rate > 1 ? 'Monitor closely' : 'Healthy'}
        icon={AlertTriangle}
        accent={stats.error_rate > 5 ? 'red' : stats.error_rate > 1 ? 'amber' : 'green'}
      />
      <StatCard
        label="Prompt Tokens"
        value={formatNumber(stats.total_prompt_tokens)}
        subLabel={`${formatNumber(stats.total_completion_tokens)} completion`}
        icon={Hash}
        accent="primary"
      />
      <StatCard
        label="Active Models"
        value={String(stats.unique_models)}
        subLabel={`Across ${stats.unique_providers} provider${stats.unique_providers !== 1 ? 's' : ''}`}
        icon={BrainCircuit}
        accent="purple"
      />
      <StatCard
        label="Throughput"
        value={stats.total_requests > 0 ? `${(stats.total_requests / 24).toFixed(0)}/hr` : '—'}
        subLabel={`${formatNumber(stats.success_count / Math.max(stats.total_requests, 1) * 100).replace(/\.0$/, '')}% success rate`}
        icon={Coins}
        accent="green"
      />
    </div>
  )
}
