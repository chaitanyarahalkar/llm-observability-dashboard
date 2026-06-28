import { useState, useEffect, useCallback } from 'react'
import { getOverview, getTimeSeries, getModelBreakdown } from '../api/client'
import type { OverviewStats, TimeSeriesBucket, ModelBreakdown } from '../api/client'
import Sidebar from './Sidebar'
import StatCards from './StatCards'
import ChartsGrid from './Charts'
import TracesTable from './TracesTable'
import ModelBreakdownTable from './ModelBreakdownTable'
import { Button } from './ui/button'
import {
  AlertTriangle, RefreshCw,
} from 'lucide-react'
import { cn } from '../lib/utils'
import EnterpriseInsights from './EnterpriseInsights'
import { TooltipProvider } from './ui/tooltip'

const RANGES = ['1h', '6h', '24h', '7d', '30d'] as const

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState<string>('24h')
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [timeSeries, setTimeSeries] = useState<TimeSeriesBucket[]>([])
  const [modelBreakdown, setModelBreakdown] = useState<ModelBreakdown[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const [ov, ts, mb] = await Promise.all([
        getOverview(timeRange),
        getTimeSeries(timeRange, timeRange === '1h' ? '5m' : '1h'),
        getModelBreakdown(timeRange),
      ])
      setOverview(ov)
      setTimeSeries(ts)
      setModelBreakdown(mb)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError('Unable to refresh telemetry. Verify the API is reachable and try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const now = new Date()

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />

        <main className="relative flex-1 overflow-y-auto">
          {/* Subtle ambient background */}
          <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.04),transparent_50%)]" />

          <div className="relative mx-auto max-w-[1440px] space-y-5 p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-pulse-ring" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                    </span>
                    <span className="font-medium text-success/90">Live</span>
                  </div>
                  <span>·</span>
                  <span>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                  <span>·</span>
                  <span>{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <h1 className="text-[1.65rem] font-bold tracking-tight text-foreground">
                  LLM Observability
                </h1>
                <p className="text-[0.8125rem] text-muted-foreground max-w-xl">
                  Real-time telemetry for production AI workloads — monitor token usage, latency, costs, and reliability across all models and providers.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Time range selector */}
                <div className="flex items-center rounded-lg border border-border/60 bg-card p-0.5">
                  {RANGES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className={cn(
                        "relative rounded-[6px] px-3 py-1.5 text-[0.75rem] font-semibold transition-all duration-150",
                        timeRange === r
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Refresh + last updated */}
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[0.7rem] text-muted-foreground/70 tabular-nums">
                    {lastUpdated
                      ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                      : loading ? 'Loading…' : 'Not updated'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchData}
                    disabled={refreshing}
                    className="h-8 gap-1.5 text-[0.75rem]"
                  >
                    <RefreshCw size={13} className={cn(refreshing && 'animate-spin')} />
                    {refreshing ? 'Refreshing' : 'Refresh'}
                  </Button>
                </div>
              </div>
            </header>

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-[0.8125rem] text-destructive">
                <AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Content */}
            <EnterpriseInsights stats={overview} models={modelBreakdown} />
            <StatCards stats={overview} loading={loading} />
            <ChartsGrid data={timeSeries} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ModelBreakdownTable data={modelBreakdown} />
              <TracesTable />
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-between border-t border-border/40 pt-4 pb-6">
              <div className="flex items-center gap-4 text-[0.7rem] text-muted-foreground/50">
                <span>LLM Observability Platform</span>
                <span className="opacity-30">·</span>
                <span>v1.0.0</span>
              </div>
              <span className="text-[0.7rem] text-muted-foreground/50">
                Auto-refreshing every 30s
              </span>
            </footer>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
