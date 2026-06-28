import { useState, useMemo } from 'react'
import type { ModelBreakdown } from '../api/client'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { ArrowUpDown, Layers } from 'lucide-react'
import { cn } from '../lib/utils'

interface Props {
  data: ModelBreakdown[]
}

type SortKey = 'requests' | 'total_tokens' | 'avg_latency_ms' | 'cost' | 'error_rate'
type SortDir = 'asc' | 'desc'

function SortHeader({ label, sortKey, currentKey, dir, onSort }: {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
}) {
  const active = sortKey === currentKey
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        "group flex items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-wider transition-colors hover:text-foreground",
        active ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      {label}
      <ArrowUpDown size={10} className={cn(
        "opacity-0 group-hover:opacity-100 transition-opacity",
        active && 'opacity-100',
        active && dir === 'asc' && 'rotate-180'
      )} />
    </button>
  )
}

export default function ModelBreakdownTable({ data }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('cost')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1
      return (a[sortKey] - b[sortKey]) * mult
    })
  }, [data, sortKey, sortDir])

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">Models</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/30 gap-2">
            <Layers size={24} strokeWidth={1.5} />
            <span className="text-[0.75rem] font-medium">No model data</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">
          Models
          <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground/50">
            {data.length} {data.length === 1 ? 'model' : 'models'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-2.5 px-5">
                  <span className="text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wider">Model</span>
                </th>
                <th className="text-right py-2.5 px-3">
                  <SortHeader label="Req" sortKey="requests" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-right py-2.5 px-3">
                  <SortHeader label="Tokens" sortKey="total_tokens" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-right py-2.5 px-3">
                  <SortHeader label="Latency" sortKey="avg_latency_ms" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-right py-2.5 px-3">
                  <SortHeader label="Cost" sortKey="cost" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-center py-2.5 px-3">
                  <SortHeader label="Errors" sortKey="error_rate" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => {
                const maxCost = sorted.length > 0 ? sorted[0].cost : 1
                const costRatio = maxCost > 0 ? m.cost / maxCost : 0
                return (
                  <tr key={m.model} className="border-b border-border/30 hover:bg-muted/20 transition-colors group">
                    <td className="py-2 px-5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                        <Badge variant="secondary" className="font-mono text-[0.6rem]">{m.model}</Badge>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-[0.7rem] text-right tabular-nums">{m.requests.toLocaleString()}</td>
                    <td className="py-2 px-3 text-[0.7rem] font-mono text-right tabular-nums">{m.total_tokens.toLocaleString()}</td>
                    <td className="py-2 px-3 text-[0.7rem] font-mono text-right tabular-nums">
                      {m.avg_latency_ms >= 1000
                        ? `${(m.avg_latency_ms / 1000).toFixed(1)}s`
                        : `${Math.round(m.avg_latency_ms)}ms`}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Mini bar */}
                        <div className="hidden sm:block w-12 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60 transition-all"
                            style={{ width: `${Math.max(costRatio * 100, 2)}%` }}
                          />
                        </div>
                        <span className="text-[0.7rem] font-mono tabular-nums">${m.cost.toFixed(3)}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Badge
                        variant={m.error_rate < 1 ? 'secondary' : m.error_rate < 5 ? 'outline' : 'destructive'}
                        className={cn(
                          "text-[0.6rem]",
                          m.error_rate >= 5 && 'text-destructive',
                          m.error_rate >= 1 && m.error_rate < 5 && 'text-amber-400'
                        )}
                      >
                        {m.error_rate.toFixed(2)}%
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
