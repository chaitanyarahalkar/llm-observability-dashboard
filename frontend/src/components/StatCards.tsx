import type { OverviewStats } from '../api/client'
import { Activity, Coins, Timer, DollarSign, AlertTriangle, Hash, BrainCircuit, TrendingUp } from 'lucide-react'
import { Card, CardContent } from './ui/card'

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const formatCost = (n: number): string => `$${n.toFixed(2)}`

const formatMs = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`
  return `${Math.round(n)}ms`
}

interface StatCardProps {
  label: string
  value: string
  subLabel?: string
  icon: React.ElementType
  accent?: 'purple' | 'green' | 'amber' | 'blue' | 'red'
}

const accentColors = {
  purple: 'bg-primary/10 text-primary',
  green: 'bg-emerald-500/10 text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-400',
  blue: 'bg-sky-500/10 text-sky-400',
  red: 'bg-destructive/10 text-destructive',
}

function StatCard({ label, value, subLabel, icon: Icon, accent = 'purple' }: StatCardProps) {
  return (
    <Card className="hover:border-primary/20 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              {label}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subLabel && (
              <p className="text-xs text-muted-foreground">{subLabel}</p>
            )}
          </div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${accentColors[accent]}`}>
            <Icon size={16} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface StatCardsProps {
  stats: OverviewStats | null
}

export default function StatCards({ stats }: StatCardsProps) {
  if (!stats) {
    return <div className="grid grid-cols-4 gap-3"><div className="text-sm text-muted-foreground p-4">Loading metrics...</div></div>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Total Requests"
        value={formatNumber(stats.total_requests)}
        subLabel={`${stats.success_count} success, ${stats.error_count} errors`}
        icon={Activity}
        accent="purple"
      />
      <StatCard
        label="Total Tokens"
        value={formatNumber(stats.total_prompt_tokens + stats.total_completion_tokens)}
        subLabel={`${formatNumber(stats.total_prompt_tokens)} in · ${formatNumber(stats.total_completion_tokens)} out`}
        icon={Coins}
        accent="green"
      />
      <StatCard
        label="Avg Latency"
        value={formatMs(stats.avg_latency_ms)}
        subLabel={`TTFT: ${formatMs(stats.avg_time_to_first_token_ms)}`}
        icon={Timer}
        accent="amber"
      />
      <StatCard
        label="Total Cost"
        value={formatCost(stats.total_cost)}
        subLabel={stats.total_requests > 0 ? `~${formatCost(stats.total_cost / stats.total_requests)}/req` : undefined}
        icon={DollarSign}
        accent="blue"
      />
      <StatCard
        label="Error Rate"
        value={`${stats.error_rate.toFixed(1)}%`}
        subLabel={`${stats.error_count} failed requests`}
        icon={AlertTriangle}
        accent={stats.error_rate > 1 ? 'red' : 'green'}
      />
      <StatCard
        label="Tokens Per Request"
        value={formatNumber(
          stats.total_requests > 0
            ? Math.round((stats.total_prompt_tokens + stats.total_completion_tokens) / stats.total_requests)
            : 0
        )}
        icon={Hash}
        accent="purple"
      />
      <StatCard
        label="Active Models"
        value={String(stats.unique_models)}
        subLabel={`${stats.unique_providers} providers`}
        icon={BrainCircuit}
        accent="amber"
      />
      <StatCard
        label="Trend"
        value="—"
        subLabel="More data needed"
        icon={TrendingUp}
        accent="blue"
      />
    </div>
  )
}
