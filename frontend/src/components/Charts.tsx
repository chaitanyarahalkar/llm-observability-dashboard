import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { TimeSeriesBucket } from '../api/client'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

function LatencyChart({ data }: { data: TimeSeriesBucket[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">No data yet</div>
  }

  const formatTime = (t: string) => {
    try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return t }
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.75 0.15 230)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="oklch(0.75 0.15 230)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="time" tickFormatter={formatTime} axisLine={false} tickLine={false} dy={8} />
        <YAxis axisLine={false} tickLine={false} width={55} />
        <Tooltip
          contentStyle={{ background: 'oklch(0.17 0.005 285)', border: '1px solid oklch(0.22 0.01 280)', borderRadius: 8, fontSize: 13 }}
          labelStyle={{ color: 'oklch(0.55 0.01 280)', marginBottom: 4 }}
        />
        <Area type="monotone" dataKey="avg_latency_ms" stroke="oklch(0.75 0.15 230)" strokeWidth={2} fill="url(#latencyGrad)" name="Latency (ms)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function TokenChart({ data }: { data: TimeSeriesBucket[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">No data yet</div>
  }

  const formatTime = (t: string) => {
    try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return t }
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.70 0.18 160)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="oklch(0.70 0.18 160)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="time" tickFormatter={formatTime} axisLine={false} tickLine={false} dy={8} />
        <YAxis axisLine={false} tickLine={false} width={55} />
        <Tooltip
          contentStyle={{ background: 'oklch(0.17 0.005 285)', border: '1px solid oklch(0.22 0.01 280)', borderRadius: 8, fontSize: 13 }}
          labelStyle={{ color: 'oklch(0.55 0.01 280)', marginBottom: 4 }}
        />
        <Area type="monotone" dataKey="total_tokens" stroke="oklch(0.70 0.18 160)" strokeWidth={2} fill="url(#tokenGrad)" name="Tokens" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function CostChart({ data }: { data: TimeSeriesBucket[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">No data yet</div>
  }

  const formatTime = (t: string) => {
    try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return t }
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.80 0.12 85)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="oklch(0.80 0.12 85)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="time" tickFormatter={formatTime} axisLine={false} tickLine={false} dy={8} />
        <YAxis axisLine={false} tickLine={false} width={55} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          contentStyle={{ background: 'oklch(0.17 0.005 285)', border: '1px solid oklch(0.22 0.01 280)', borderRadius: 8, fontSize: 13 }}
          labelStyle={{ color: 'oklch(0.55 0.01 280)', marginBottom: 4 }}
          formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
        />
        <Area type="monotone" dataKey="cost" stroke="oklch(0.80 0.12 85)" strokeWidth={2} fill="url(#costGrad)" name="Cost ($)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function TokenBreakdownChart({ data }: { data: TimeSeriesBucket[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">No data yet</div>
  }

  const formatTime = (t: string) => {
    try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return t }
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="promptGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.2 265)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="oklch(0.65 0.2 265)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.18 185)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="oklch(0.65 0.18 185)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="time" tickFormatter={formatTime} axisLine={false} tickLine={false} dy={8} />
        <YAxis axisLine={false} tickLine={false} width={55} />
        <Tooltip
          contentStyle={{ background: 'oklch(0.17 0.005 285)', border: '1px solid oklch(0.22 0.01 280)', borderRadius: 8, fontSize: 13 }}
          labelStyle={{ color: 'oklch(0.55 0.01 280)', marginBottom: 4 }}
        />
        <Legend />
        <Area type="monotone" dataKey="prompt_tokens" stroke="oklch(0.65 0.2 265)" strokeWidth={2} fill="url(#promptGrad)" name="Prompt" stackId="1" />
        <Area type="monotone" dataKey="comp_tokens" stroke="oklch(0.65 0.18 185)" strokeWidth={2} fill="url(#compGrad)" name="Completion" stackId="1" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default function ChartsGrid({ data }: { data: TimeSeriesBucket[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Latency Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <LatencyChart data={data} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Token Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <TokenChart data={data} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cost Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <CostChart data={data} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prompt vs Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <TokenBreakdownChart data={data} />
        </CardContent>
      </Card>
    </div>
  )
}
