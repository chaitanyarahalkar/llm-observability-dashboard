import { useState, useEffect } from 'react'
import { getTraces } from '../api/client'
import type { TraceResponse } from '../api/client'

const formatMs = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`
  return `${Math.round(n)}ms`
}

export default function TracesTable() {
  const [traces, setTraces] = useState<TraceResponse[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getTraces(page, limit)
      .then((res) => {
        setTraces(res.traces)
        setTotal(res.total)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, limit])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  if (loading) {
    return (
      <div className="table-card">
        <h3>Recent Traces</h3>
        <div className="loading">Loading traces...</div>
      </div>
    )
  }

  if (traces.length === 0) {
    return (
      <div className="table-card">
        <h3>Recent Traces</h3>
        <div className="empty-state">
          <h3>No traces yet</h3>
          <p>Send trace data to the API to see it here. Use POST /api/v1/traces</p>
        </div>
      </div>
    )
  }

  return (
    <div className="table-card">
      <h3>Recent Traces</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="traces-table">
          <thead>
            <tr>
              <th>Trace ID</th>
              <th>Model</th>
              <th>Provider</th>
              <th>Tokens</th>
              <th>Latency</th>
              <th>TTFT</th>
              <th>Cost</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {traces.map((t) => (
              <tr key={t.id}>
                <td>
                  <span className="trace-id">{t.trace_id.slice(0, 12)}</span>
                </td>
                <td>
                  <span className="model-badge">{t.model}</span>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {t.provider}
                </td>
                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>
                  {t.total_tokens.toLocaleString()}
                </td>
                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>
                  {formatMs(t.latency_ms)}
                </td>
                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {t.time_to_first_token_ms ? formatMs(t.time_to_first_token_ms) : '—'}
                </td>
                <td className="cost-cell">${t.cost.toFixed(4)}</td>
                <td>
                  <span className={`status-badge ${t.status === 'success' ? 'success' : 'error'}`}>
                    {t.status === 'success' ? '✓' : '✗'} {t.status}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {new Date(t.created_at).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      </div>
    </div>
  )
}
