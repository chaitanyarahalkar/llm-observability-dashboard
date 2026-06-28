import { useState, useEffect, useCallback } from 'react'
import { getTraces } from '../api/client'
import type { TraceResponse } from '../api/client'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Skeleton } from './ui/skeleton'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '../lib/utils'

const formatMs = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`
  return `${Math.round(n)}ms`
}

const STATUS_FILTERS = ['all', 'success', 'error'] as const

export default function TracesTable() {
  const [traces, setTraces] = useState<TraceResponse[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [loading, setLoading] = useState(true)
  const [modelFilter, setModelFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchTraces = useCallback(() => {
    setLoading(true)
    getTraces(
      page,
      limit,
      modelFilter || undefined,
      statusFilter !== 'all' ? statusFilter : undefined
    )
      .then((res) => { setTraces(res.traces); setTotal(res.total) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, limit, modelFilter, statusFilter])

  useEffect(() => { fetchTraces() }, [fetchTraces])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const from = total === 0 ? 0 : Math.min((page - 1) * limit + 1, total)
  const to = Math.min(page * limit, total)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">
            Recent Traces
            {total > 0 && <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground/50">{total.toLocaleString()}</span>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-44">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
              <Input
                placeholder="Filter by model…"
                value={modelFilter}
                onChange={(e) => { setModelFilter(e.target.value); setPage(1) }}
                className="h-7 pl-7 pr-6 text-[0.7rem]"
              />
              {modelFilter && (
                <button onClick={() => { setModelFilter(''); setPage(1) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground">
                  <X size={10} />
                </button>
              )}
            </div>
            <div className="hidden sm:flex items-center rounded-md border border-border/40 bg-card p-0.5">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1) }}
                  className={cn(
                    "rounded-[4px] px-2 py-0.5 text-[0.65rem] font-medium transition-all",
                    statusFilter === s
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        {total > 0 && (
          <p className="text-[0.6rem] text-muted-foreground/50 tabular-nums">
            Showing {from}–{to} of {total.toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12 ml-auto" />
              </div>
            ))}
          </div>
        ) : traces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/30 gap-2">
            <SlidersHorizontal size={24} strokeWidth={1.5} />
            <span className="text-[0.75rem] font-medium">No traces found</span>
            <span className="text-[0.65rem]">Ingest data via POST /api/v1/traces</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-5">Trace ID</th>
                    <th className="text-left text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-5">Model</th>
                    <th className="hidden md:table-cell text-left text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-5">Provider</th>
                    <th className="text-right text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-5">Tokens</th>
                    <th className="text-right text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-5">Latency</th>
                    <th className="hidden md:table-cell text-right text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-5">TTFT</th>
                    <th className="hidden sm:table-cell text-right text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-5">Cost</th>
                    <th className="text-center text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-5">Status</th>
                    <th className="hidden lg:table-cell text-right text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-5">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {traces.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors group"
                    >
                      <td className="py-2 px-5 text-[0.7rem] font-mono text-primary/80 truncate max-w-[140px]">
                        {t.trace_id.slice(0, 12)}…
                      </td>
                      <td className="py-2 px-5">
                        <Badge variant="secondary" className="font-mono text-[0.6rem]">{t.model}</Badge>
                      </td>
                      <td className="hidden md:table-cell py-2 px-5 text-[0.7rem] text-muted-foreground">{t.provider}</td>
                      <td className="py-2 px-5 text-[0.7rem] font-mono text-right tabular-nums">{t.total_tokens.toLocaleString()}</td>
                      <td className="py-2 px-5 text-[0.7rem] font-mono text-right tabular-nums">{formatMs(t.latency_ms)}</td>
                      <td className="hidden md:table-cell py-2 px-5 text-[0.7rem] font-mono text-right tabular-nums text-muted-foreground">
                        {t.time_to_first_token_ms ? formatMs(t.time_to_first_token_ms) : '—'}
                      </td>
                      <td className="hidden sm:table-cell py-2 px-5 text-[0.7rem] font-mono text-right tabular-nums">${t.cost.toFixed(4)}</td>
                      <td className="py-2 px-5 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold",
                          t.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-destructive/10 text-destructive'
                        )}>
                          <span className={cn(
                            "h-1 w-1 rounded-full",
                            t.status === 'success' ? 'bg-emerald-400' : 'bg-destructive'
                          )} />
                          {t.status}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell py-2 px-5 text-[0.7rem] text-muted-foreground text-right tabular-nums">
                        {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-3">
              <span className="text-[0.65rem] text-muted-foreground/50">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-7 px-2.5 text-[0.65rem]">
                  <ChevronLeft size={12} /> Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="h-7 px-2.5 text-[0.65rem]">
                  Next <ChevronRight size={12} />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
