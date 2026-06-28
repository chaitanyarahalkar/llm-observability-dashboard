import { useState, useEffect, useCallback } from 'react'
import { getOverview, getTimeSeries, getModelBreakdown } from '../api/client'
import type { OverviewStats, TimeSeriesBucket, ModelBreakdown } from '../api/client'
import StatCards from './StatCards'
import ChartsGrid from './Charts'
import TracesTable from './TracesTable'
import { Activity, RefreshCw } from 'lucide-react'

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
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={24} color="var(--accent)" />
            <h1>LLM Observability</h1>
          </div>
          <p className="subtitle">Monitor token usage, latency, costs, and errors across your AI workloads</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="time-range-selector">
            {RANGES.map((r) => (
              <button
                key={r}
                className={timeRange === r ? 'active' : ''}
                onClick={() => setTimeRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={16} color="var(--text-secondary)" />
          </button>
        </div>
      </header>

      <StatCards stats={overview} />

      <ChartsGrid data={timeSeries} />

      {modelBreakdown.length > 0 && (
        <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
          <h3>Per-Model Breakdown</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="traces-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Requests</th>
                  <th>Tokens</th>
                  <th>Avg Latency</th>
                  <th>Cost</th>
                  <th>Error Rate</th>
                </tr>
              </thead>
              <tbody>
                {modelBreakdown.map((m) => (
                  <tr key={m.model}>
                    <td><span className="model-badge">{m.model}</span></td>
                    <td>{m.requests.toLocaleString()}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>
                      {m.total_tokens.toLocaleString()}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>
                      {m.avg_latency_ms >= 1000
                        ? `${(m.avg_latency_ms / 1000).toFixed(1)}s`
                        : `${Math.round(m.avg_latency_ms)}ms`}
                    </td>
                    <td className="cost-cell">${m.cost.toFixed(4)}</td>
                    <td>
                      <span className={`status-badge ${m.error_rate < 1 ? 'success' : 'error'}`}>
                        {m.error_rate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TracesTable />
    </div>
  )
}
