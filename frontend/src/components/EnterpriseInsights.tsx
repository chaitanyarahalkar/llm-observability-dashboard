import type { ModelBreakdown, OverviewStats } from '../api/client'
import { ShieldCheck, Gauge, ServerCog, TrendingUp, Clock, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

interface Props {
  stats: OverviewStats | null
  models: ModelBreakdown[]
}

const formatCost = (value: number) => {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}
const formatMs = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`

function InsightTile({ label, value, helper, icon: Icon, tone }: {
  label: string
  value: string
  helper: string
  icon: React.ElementType
  tone: 'success' | 'warning' | 'danger' | 'neutral'
}) {
  const toneStyles = {
    success: { ring: 'ring-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    warning: { ring: 'ring-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    danger:  { ring: 'ring-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
    neutral: { ring: 'ring-sky-500/30', bg: 'bg-sky-500/10', text: 'text-sky-400', dot: 'bg-sky-400' },
  }[tone]

  return (
    <div className="group relative rounded-xl border border-border/60 bg-card/60 p-4 transition-all duration-200 hover:border-border hover:bg-card hover:shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneStyles.bg} ${toneStyles.text} transition-transform group-hover:scale-110`}>
          <Icon size={15} />
        </div>
        <span className={`h-2 w-2 rounded-full ${toneStyles.dot} ring-1 ${toneStyles.ring}`} />
      </div>
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
        {label}
      </p>
      <p className="text-xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-[0.675rem] text-muted-foreground/60 leading-relaxed">{helper}</p>
    </div>
  )
}

export default function EnterpriseInsights({ stats, models }: Props) {
  const highestCostModel = models.reduce<ModelBreakdown | null>((current, model) => {
    if (!current || model.cost > current.cost) return model
    return current
  }, null)

  const reliability = stats ? Math.max(0, 100 - stats.error_rate) : 0
  const spendPerModel = stats && stats.unique_models > 0 ? stats.total_cost / stats.unique_models : 0

  const items = [
    {
      label: 'Reliability',
      value: stats ? `${reliability.toFixed(2)}%` : '—',
      helper: stats
        ? `${stats.error_count} failures in window · ${stats.success_count} requests succeeded`
        : 'Waiting for telemetry',
      icon: ShieldCheck,
      tone: (reliability >= 99.5 ? 'success' : reliability >= 95 ? 'warning' : 'danger') as 'success' | 'warning' | 'danger',
    },
    {
      label: 'P95 Latency',
      value: stats ? formatMs(stats.avg_latency_ms) : '—',
      helper: stats
        ? `TTFT ${formatMs(stats.avg_time_to_first_token_ms)} · SLA target <2.5s`
        : 'Waiting for telemetry',
      icon: Clock,
      tone: (stats && stats.avg_latency_ms > 2500 ? 'warning' : 'success') as 'success' | 'warning',
    },
    {
      label: 'Provider Coverage',
      value: stats ? `${stats.unique_providers}` : '—',
      helper: stats
        ? `${stats.unique_models} models across ${stats.unique_providers} provider${stats.unique_providers !== 1 ? 's' : ''}`
        : 'Waiting for telemetry',
      icon: ServerCog,
      tone: 'neutral' as const,
    },
    {
      label: 'Top Cost Driver',
      value: highestCostModel ? highestCostModel.model : '—',
      helper: highestCostModel
        ? `${formatCost(highestCostModel.cost)} total · ${formatCost(spendPerModel)} avg/model`
        : 'No model spend yet',
      icon: TrendingUp,
      tone: (highestCostModel && stats && highestCostModel.cost > stats.total_cost * 0.5 ? 'warning' : 'neutral') as 'warning' | 'neutral',
    },
  ]

  return (
    <Card className="overflow-hidden border-primary/10">
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/8 via-transparent to-sky-500/5 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-[0.875rem] font-semibold">Health & SLOs</CardTitle>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/8 text-emerald-400 text-[0.6rem]">
                SOC2-ready
              </Badge>
            </div>
            <p className="mt-0.5 text-[0.7rem] text-muted-foreground/70">
              Operational readiness signals for production LLM workloads
            </p>
          </div>
          {stats && (
            <div className="flex items-center gap-3 text-[0.7rem] text-muted-foreground/60">
              <div className="flex items-center gap-1.5">
                <BarChart3 size={12} />
                <span>{stats.total_requests.toLocaleString()} reqs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Gauge size={12} />
                <span>{formatMs(stats.avg_latency_ms)} avg</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <InsightTile key={item.label} {...item} />
        ))}
      </CardContent>
    </Card>
  )
}
