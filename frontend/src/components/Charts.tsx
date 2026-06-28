import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { TimeSeriesBucket } from '../api/client'

interface Props {
  data: TimeSeriesBucket[]
  dataKey: 'latency' | 'tokens' | 'cost'
}

const latencyConfig = {
  dataKey: 'avg_latency_ms',
  label: 'Latency (ms)',
  stroke: '#74b9ff',
  fill: '#74b9ff',
  gradientId: 'latencyGradient',
}

const tokenConfig = {
  dataKey: 'total_tokens',
  label: 'Tokens',
  stroke: '#00b894',
  fill: '#00b894',
  gradientId: 'tokenGradient',
}

const costConfig = {
  dataKey: 'cost',
  label: 'Cost ($)',
  stroke: '#fdcb6e',
  fill: '#fdcb6e',
  gradientId: 'costGradient',
}

function TimeSeriesChart({ data, dataKey }: Props) {
  const config = dataKey === 'latency' ? latencyConfig : dataKey === 'tokens' ? tokenConfig : costConfig

  if (!data || data.length === 0) {
    return <div className="empty-state"><p>No data yet</p></div>
  }

  const formatTime = (t: string) => {
    try {
      return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return t
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="recharts-default-tooltip" style={{
        background: '#161620',
        border: '1px solid #1e1e2e',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
      }}>
        <p style={{ color: '#8888a0', marginBottom: 4 }}>{formatTime(label)}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color, fontWeight: 600 }}>
            {p.name}: {dataKey === 'cost' ? `$${Number(p.value).toFixed(4)}` : p.value.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={config.fill} stopOpacity={0.25} />
            <stop offset="100%" stopColor={config.fill} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="time"
          tickFormatter={formatTime}
          axisLine={false}
          tickLine={false}
          dy={8}
        />
        <YAxis axisLine={false} tickLine={false} width={60} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey={config.dataKey}
          stroke={config.stroke}
          strokeWidth={2}
          fill={`url(#${config.gradientId})`}
          name={config.label}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default function ChartsGrid({ data }: { data: TimeSeriesBucket[] }) {
  return (
    <div className="charts-grid">
      <div className="chart-card">
        <h3>Latency Over Time</h3>
        <TimeSeriesChart data={data} dataKey="latency" />
      </div>
      <div className="chart-card">
        <h3>Token Usage Over Time</h3>
        <TimeSeriesChart data={data} dataKey="tokens" />
      </div>
      <div className="chart-card">
        <h3>Cost Over Time</h3>
        <TimeSeriesChart data={data} dataKey="cost" />
      </div>
      <div className="chart-card">
        <h3>Prompt vs Completion Tokens</h3>
        <TokenBreakdownChart data={data} />
      </div>
    </div>
  )
}

function TokenBreakdownChart({ data }: { data: TimeSeriesBucket[] }) {
  if (!data || data.length === 0) {
    return <div className="empty-state"><p>No data yet</p></div>
  }

  const formatTime = (t: string) => {
    try {
      return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return t
    }
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="time" tickFormatter={formatTime} axisLine={false} tickLine={false} dy={8} />
        <YAxis axisLine={false} tickLine={false} width={60} />
        <Tooltip
          contentStyle={{
            background: '#161620',
            border: '1px solid #1e1e2e',
            borderRadius: 8,
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="prompt_tokens"
          stroke="#a29bfe"
          fill="url(#promptGradient)"
          strokeWidth={2}
          name="Prompt"
          stackId="1"
        />
        <Area
          type="monotone"
          dataKey="comp_tokens"
          stroke="#00cec9"
          fill="url(#compGradient)"
          strokeWidth={2}
          name="Completion"
          stackId="1"
        />
        <defs>
          <linearGradient id="promptGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a29bfe" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#a29bfe" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="compGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00cec9" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#00cec9" stopOpacity={0.02} />
          </linearGradient>
        </defs>
      </AreaChart>
    </ResponsiveContainer>
  )
}
