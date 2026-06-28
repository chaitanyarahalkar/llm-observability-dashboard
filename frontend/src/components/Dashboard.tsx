import { useState, useEffect, useCallback } from 'react'
import { getOverview, getTimeSeries, getModelBreakdown } from '../api/client'
import type { OverviewStats, TimeSeriesBucket, ModelBreakdown } from '../api/client'
import Sidebar from './Sidebar'
import StatCards from './StatCards'
import ChartsGrid from './Charts'
import TracesTable from './TracesTable'
import ModelBreakdownTable from './ModelBreakdownTable'
import { Button } from './ui/button'
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react'
import EnterpriseInsights from './EnterpriseInsights'

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

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />

      <main className="relative flex-1 overflow-y-auto">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(80,110,255,0.16),transparent_32rem),radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.08),transparent_28rem)]" />
        <div className="relative mx-auto max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">
          <header className="overflow-hidden rounded-2xl border border-border/70 bg-card/75 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <ShieldCheck size={14} /> Production LLM Operations
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                    <CheckCircle2 size={14} /> 30s auto-refresh
                  </span>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Enterprise AI observability dashboard</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Govern token usage, latency, costs, model reliability, and trace health from one executive-ready command center.
                </p>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/40 p-3">
                <div className="flex items-center rounded-lg border border-border bg-card p-1">
                  {RANGES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className={`rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                        timeRange === r
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : loading ? 'Loading telemetry…' : 'Not updated'}
                  </span>
                  <Button variant="outline" size="sm" onClick={fetchData} disabled={refreshing}>
                    <RefreshCw className={refreshing ? 'animate-spin' : ''} size={15} /> Refresh
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <EnterpriseInsights stats={overview} models={modelBreakdown} />
          <StatCards stats={overview} />
          <ChartsGrid data={timeSeries} />
          <ModelBreakdownTable data={modelBreakdown} />
          <TracesTable />
        </div>
      </main>
    </div>
  )
}
