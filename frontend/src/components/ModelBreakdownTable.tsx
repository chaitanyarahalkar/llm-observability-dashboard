import type { ModelBreakdown } from '../api/client'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

interface Props {
  data: ModelBreakdown[]
}

export default function ModelBreakdownTable({ data }: Props) {
  if (!data || data.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Per-Model Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-5">Model</th>
                <th className="text-left text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-5">Requests</th>
                <th className="text-left text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-5">Tokens</th>
                <th className="text-left text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-5">Avg Latency</th>
                <th className="text-left text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-5">Cost</th>
                <th className="text-left text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-5">Error Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.model} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-5">
                    <Badge variant="secondary" className="font-mono text-[0.65rem]">{m.model}</Badge>
                  </td>
                  <td className="py-2.5 px-5 text-xs">{m.requests.toLocaleString()}</td>
                  <td className="py-2.5 px-5 text-xs font-mono">{m.total_tokens.toLocaleString()}</td>
                  <td className="py-2.5 px-5 text-xs font-mono">
                    {m.avg_latency_ms >= 1000
                      ? `${(m.avg_latency_ms / 1000).toFixed(1)}s`
                      : `${Math.round(m.avg_latency_ms)}ms`}
                  </td>
                  <td className="py-2.5 px-5 text-xs font-mono">${m.cost.toFixed(4)}</td>
                  <td className="py-2.5 px-5">
                    <Badge variant={m.error_rate < 1 ? 'secondary' : 'destructive'} className="text-[0.65rem]">
                      {m.error_rate.toFixed(1)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
