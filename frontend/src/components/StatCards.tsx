import type { OverviewStats } from '../api/client'

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const formatCost = (n: number): string => `$${n.toFixed(2)}`

const formatMs = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`
  return `${Math.round(n)}ms`
}

interface StatCardsProps {
  stats: OverviewStats | null
}

export default function StatCards({ stats }: StatCardsProps) {
  if (!stats) {
    return <div className="stats-grid"><div className="loading">Loading metrics...</div></div>
  }

  const cards = [
    {
      label: 'Total Requests',
      value: formatNumber(stats.total_requests),
      icon: '📊',
      iconClass: 'purple',
      sub: `${stats.success_count} success, ${stats.error_count} errors`,
    },
    {
      label: 'Total Tokens',
      value: formatNumber(stats.total_prompt_tokens + stats.total_completion_tokens),
      icon: '🪙',
      iconClass: 'green',
      sub: `${formatNumber(stats.total_prompt_tokens)} prompt · ${formatNumber(stats.total_completion_tokens)} comp`,
    },
    {
      label: 'Avg Latency',
      value: formatMs(stats.avg_latency_ms),
      icon: '⚡',
      iconClass: 'amber',
      sub: `TTFT: ${formatMs(stats.avg_time_to_first_token_ms)}`,
    },
    {
      label: 'Total Cost',
      value: formatCost(stats.total_cost),
      icon: '💵',
      iconClass: 'blue',
      sub: ``,
    },
    {
      label: 'Error Rate',
      value: `${stats.error_rate.toFixed(1)}%`,
      icon: '🔴',
      iconClass: stats.error_rate > 1 ? 'red' : 'green',
      sub: `${stats.error_count} failed requests`,
    },
    {
      label: 'Avg Tokens/Req',
      value: formatNumber(
        stats.total_requests > 0
          ? Math.round((stats.total_prompt_tokens + stats.total_completion_tokens) / stats.total_requests)
          : 0
      ),
      icon: '📐',
      iconClass: 'purple',
      sub: ``,
    },
    {
      label: 'Active Models',
      value: String(stats.unique_models),
      icon: '🧠',
      iconClass: 'amber',
      sub: `${stats.unique_providers} providers`,
    },
    {
      label: 'Avg Cost/Req',
      value: formatCost(
        stats.total_requests > 0 ? stats.total_cost / stats.total_requests : 0
      ),
      icon: '💸',
      iconClass: 'green',
      sub: ``,
    },
  ]

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <div key={card.label} className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">{card.label}</span>
            <div className={`stat-card-icon ${card.iconClass}`}>
              <span style={{ fontSize: '0.9rem' }}>{card.icon}</span>
            </div>
          </div>
          <div className="stat-card-value">{card.value}</div>
          {card.sub && <div className="stat-card-change positive">{card.sub}</div>}
        </div>
      ))}
    </div>
  )
}
