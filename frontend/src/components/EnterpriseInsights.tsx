import type { ModelBreakdown, OverviewStats } from '../api/client'
import { ShieldCheck, Gauge, ServerCog, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

interface Props {
  stats: OverviewStats | null
  models: ModelBreakdown[]
}

const formatCost = (value: number) => `$${value.toFixed(2)}`
const formatMs = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`

export default function EnterpriseInsights({ stats, models }: Props) {
  const highestCostModel = models.reduce<ModelBreakdown | null>((current, model) => {
    if (!current || model.cost > current.cost) return model
    return current
  }, null)

  const reliability = stats ? Math.max(0, 100 - stats.error_rate) : 0
  const spendPerModel = stats && stats.unique_models > 0 ? stats.total_cost / stats.unique_models : 0

  const items = [
    {
      label: 'Reliability posture',
      value: stats ? `${reliability.toFixed(2)}%` : '—',
      helper: stats ? `${stats.error_count} failed requests in selected window` : 'Waiting for telemetry',
      icon: ShieldCheck,
      tone: reliability >= 99 ? 'success' : reliability >= 95 ? 'warning' : 'danger',
    },
    {
      label: 'Latency guardrail',
      value: stats ? formatMs(stats.avg_latency_ms) : '—',
      helper: stats ? `TTFT averages ${formatMs(stats.avg_time_to_first_token_ms)}` : 'Waiting for telemetry',
      icon: Gauge,
      tone: stats && stats.avg_latency_ms > 2500 ? 'warning' : 'success',
    },
    {
      label: 'Provider coverage',
      value: stats ? `${stats.unique_providers}` : '—',
      helper: stats ? `${stats.unique_models} active models with failover visibility` : 'Waiting for telemetry',
      icon: ServerCog,
      tone: 'neutral',
    },
    {
      label: 'Largest cost driver',
      value: highestCostModel ? highestCostModel.model : '—',
      helper: highestCostModel ? `${formatCost(highestCostModel.cost)} total · ${formatCost(spendPerModel)} avg/model` : 'No model spend yet',
      icon: AlertCircle,
      tone: highestCostModel && stats && highestCostModel.cost > stats.total_cost * 0.5 ? 'warning' : 'neutral',
    },
  ] as const

  return (
    <Card className="overflow-hidden border-primary/15 bg-card/80 shadow-2xl shadow-black/10">
      <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-transparent to-sky-500/10 pb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Enterprise control plane</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Operational readiness signals for production LLM workloads.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            SOC2-ready telemetry view
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="rounded-xl border border-border/70 bg-background/45 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={17} />
                </div>
                <span className={`h-2 w-2 rounded-full ${item.tone === 'success' ? 'bg-emerald-400' : item.tone === 'warning' ? 'bg-amber-400' : item.tone === 'danger' ? 'bg-red-400' : 'bg-sky-400'}`} />
              </div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
              <p className="mt-2 truncate text-xl font-semibold tracking-tight">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
