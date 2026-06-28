import { useState, useEffect, useCallback } from 'react'
import { getOverview, getTimeSeries, getModelBreakdown } from '../api/client'
import type { OverviewStats, TimeSeriesBucket, ModelBreakdown } from '../api/client'
import Sidebar from './Sidebar'
import StatCards from './StatCards'
import ChartsGrid from './Charts'
import TracesTable from './TracesTable'
import ModelBreakdownTable from './ModelBreakdownTable'
import { Button } from './ui/button'
import { RefreshCw } from 'lucide-react'

const RANGES = ['1h', '6h', '24h', '7d', '30d'] as const

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState<string>('24h')
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [timeSeries, setTimeSeries] = useState<TimeSeriesBucket[]>([])
  const [modelBreakdown, setModelBreakdown] = useState<ModelBreakdown[]>([])

  const fetchData = useCallback(async () => {
    try {
      const [ov, ts, mb] = await Promise.all([
        getOverview(timeRange),
        getTimeSeries(timeRange, timeRange === '1h' ? '5m' : '1h'),
        getModelBreakdown(timeRange),
      ])
      setOverview(ov)
      setTimeSeries(ts)
      setModelBreakdown(mb)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    }
  }, [timeRange])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto p-6 space-y-5">
          {/* Header */}
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monitor token usage, latency, costs, and errors across your AI workloads
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      timeRange === r
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw size={15} />
              </Button>
            </div>
          </header>

          {/* Stat Cards */}
          <StatCards stats={overview} />

          {/* Charts */}
          <ChartsGrid data={timeSeries} />

          {/* Model Breakdown */}
          <ModelBreakdownTable data={modelBreakdown} />

          {/* Traces Table */}
          <TracesTable />
        </div>
      </main>
    </div>
  )
}
