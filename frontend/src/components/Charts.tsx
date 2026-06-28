import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { TimeSeriesBucket } from '../api/client'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { BarChart3, TrendingUp, DollarSign, Split } from 'lucide-react'

/* ── Chart color helpers ── */
const COLORS = {
  latency:    'oklch(0.66 0.22 265)',
  tokens:     'oklch(0.68 0.19 180)',
  cost:       'oklch(0.72 0.18 85)',
  prompt:     'oklch(0.66 0.22 265)',
  completion: 'oklch(0.65 0.18 230)',
}


const chartTooltip = {
  contentStyle: {
    background: 'oklch(0.18 0.014 260)',
    border: '1px solid oklch(0.26 0.016 260)',
    borderRadius: '10px',
    fontSize: '12.5px',
    fontFamily: 'var(--font-sans)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  },
  labelStyle: { color: 'oklch(0.52 0.015 265)', marginBottom: 4, fontWeight: 500 },
}

/* ── Shared time formatter ── */
const formatTime = (t: string) => {
  try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return t }
}

/* ── Empty state ── */
function EmptyChart({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] gap-2 text-muted-foreground/40">
      <Icon size={28} strokeWidth={1.5} />
      <span className="text-[0.75rem] font-medium">No data yet</span>
    </div>
  )
}

/* ── Latency Chart ── */
function LatencyChart({ data }: { data: TimeSeriesBucket[] }) {
  if (!data || data.length === 0) return <EmptyChart icon={TrendingUp} />
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.latency} stopOpacity={0.25} />
            <stop offset="100%" stopColor={COLORS.latency} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="time" tickFormatter={formatTime} axisLine={false} tickLine={false} dy={6} />
        <YAxis axisLine={false} tickLine={false} width={48} tick={{ fontSize: 11 }} />
        <Tooltip {...chartTooltip} />
        <Area type="monotone" dataKey="avg_latency_ms" stroke={COLORS.latency} strokeWidth={2} fill="url(#latencyGrad)" name="ms" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'transparent', fill: COLORS.latency }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── Token Usage Chart ── */
function TokenChart({ data }: { data: TimeSeriesBucket[] }) {
  if (!data || data.length === 0) return <EmptyChart icon={BarChart3} />
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.tokens} stopOpacity={0.25} />
            <stop offset="100%" stopColor={COLORS.tokens} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="time" tickFormatter={formatTime} axisLine={false} tickLine={false} dy={6} />
        <YAxis axisLine={false} tickLine={false} width={48} tick={{ fontSize: 11 }} />
        <Tooltip {...chartTooltip} />
        <Area type="monotone" dataKey="total_tokens" stroke={COLORS.tokens} strokeWidth={2} fill="url(#tokenGrad)" name="Tokens" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'transparent', fill: COLORS.tokens }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── Cost Chart ── */
function CostChart({ data }: { data: TimeSeriesBucket[] }) {
  if (!data || data.length === 0) return <EmptyChart icon={DollarSign} />
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.cost} stopOpacity={0.25} />
            <stop offset="100%" stopColor={COLORS.cost} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="time" tickFormatter={formatTime} axisLine={false} tickLine={false} dy={6} />
        <YAxis axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
        <Tooltip {...chartTooltip} formatter={(value) => [`$${Number(value ?? 0).toFixed(4)}`, 'Cost']} />
        <Area type="monotone" dataKey="cost" stroke={COLORS.cost} strokeWidth={2} fill="url(#costGrad)" name="Cost" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'transparent', fill: COLORS.cost }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── Prompt vs Completion ── */
function TokenBreakdownChart({ data }: { data: TimeSeriesBucket[] }) {
  if (!data || data.length === 0) return <EmptyChart icon={Split} />
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="promptGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.prompt} stopOpacity={0.25} />
            <stop offset="100%" stopColor={COLORS.prompt} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.completion} stopOpacity={0.25} />
            <stop offset="100%" stopColor={COLORS.completion} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="time" tickFormatter={formatTime} axisLine={false} tickLine={false} dy={6} />
        <YAxis axisLine={false} tickLine={false} width={48} tick={{ fontSize: 11 }} />
        <Tooltip {...chartTooltip} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="prompt_tokens" stroke={COLORS.prompt} strokeWidth={2} fill="url(#promptGrad)" name="Prompt" stackId="1" dot={false} />
        <Area type="monotone" dataKey="comp_tokens" stroke={COLORS.completion} strokeWidth={2} fill="url(#compGrad)" name="Completion" stackId="1" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── Grid ── */
export default function ChartsGrid({ data }: { data: TimeSeriesBucket[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">Latency</CardTitle>
        </CardHeader>
        <CardContent>
          <LatencyChart data={data} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">Token Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <TokenChart data={data} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <CostChart data={data} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wider">Prompt vs Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <TokenBreakdownChart data={data} />
        </CardContent>
      </Card>
    </div>
  )
}
