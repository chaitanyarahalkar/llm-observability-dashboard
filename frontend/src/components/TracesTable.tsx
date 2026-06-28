import { useState, useEffect } from 'react'
import { getTraces } from '../api/client'
import type { TraceResponse } from '../api/client'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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
      .then((res) => { setTraces(res.traces); setTotal(res.total) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, limit])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-0">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Traces</CardTitle>
        <span className="text-xs text-muted-foreground">
          Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total.toLocaleString()}
        </span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Loading traces...</div>
        ) : traces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground space-y-1">
            <span className="font-medium">No traces yet</span>
            <span>Send trace data to the API. Use POST /api/v1/traces</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-5">Trace ID</th>
                    <th className="text-left text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-5">Model</th>
                    <th className="text-left text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-5">Provider</th>
                    <th className="text-left text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-5">Tokens</th>
                    <th className="text-left text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-5">Latency</th>
                    <th className="text-left text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-5">TTFT</th>
                    <th className="text-left text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-5">Cost</th>
                    <th className="text-left text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-5">Status</th>
                    <th className="text-left text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-5">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {traces.map((t) => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-5 text-xs font-mono text-primary">
                        {t.trace_id.slice(0, 16)}...
                      </td>
                      <td className="py-2.5 px-5">
                        <Badge variant="secondary" className="font-mono text-[0.65rem]">{t.model}</Badge>
                      </td>
                      <td className="py-2.5 px-5 text-xs text-muted-foreground">{t.provider}</td>
                      <td className="py-2.5 px-5 text-xs font-mono">{t.total_tokens.toLocaleString()}</td>
                      <td className="py-2.5 px-5 text-xs font-mono">{formatMs(t.latency_ms)}</td>
                      <td className="py-2.5 px-5 text-xs font-mono text-muted-foreground">
                        {t.time_to_first_token_ms ? formatMs(t.time_to_first_token_ms) : '—'}
                      </td>
                      <td className="py-2.5 px-5 text-xs font-mono">${t.cost.toFixed(4)}</td>
                      <td className="py-2.5 px-5">
                        <Badge variant={t.status === 'success' ? 'secondary' : 'destructive'} className="text-[0.65rem]">
                          {t.status === 'success' ? '✓' : '✗'} {t.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-5 text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
              <span className="text-xs text-muted-foreground">{total.toLocaleString()} total traces</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={14} /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
