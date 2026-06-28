const API_BASE = '/api/v1'

export interface OverviewStats {
  total_requests: number
  total_prompt_tokens: number
  total_completion_tokens: number
  avg_latency_ms: number
  avg_time_to_first_token_ms: number
  total_cost: number
  error_rate: number
  unique_models: number
  unique_providers: number
  success_count: number
  error_count: number
}

export interface TimeSeriesBucket {
  time: string
  requests: number
  prompt_tokens: number
  comp_tokens: number
  total_tokens: number
  avg_latency_ms: number
  cost: number
  error_count: number
}

export interface TraceResponse {
  id: number
  trace_id: string
  model: string
  provider: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  latency_ms: number
  time_to_first_token_ms?: number
  cost: number
  status: string
  error_message?: string
  prompt_hash?: string
  metadata?: string
  created_at: string
}

export interface TracesPage {
  traces: TraceResponse[]
  total: number
  page: number
  limit: number
}

export interface ModelBreakdown {
  model: string
  requests: number
  prompt_tokens: number
  comp_tokens: number
  total_tokens: number
  avg_latency_ms: number
  cost: number
  error_rate: number
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getOverview(since: string): Promise<OverviewStats> {
  return fetchJSON(`${API_BASE}/stats/overview?since=${since}`)
}

export async function getTimeSeries(since: string, interval: string): Promise<TimeSeriesBucket[]> {
  return fetchJSON(`${API_BASE}/stats/timeseries?since=${since}&interval=${interval}`)
}

export async function getModelBreakdown(since: string): Promise<ModelBreakdown[]> {
  return fetchJSON(`${API_BASE}/stats/models?since=${since}`)
}

export async function getTraces(page: number, limit: number, model?: string, status?: string): Promise<TracesPage> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (model) params.set('model', model)
  if (status) params.set('status', status)
  return fetchJSON(`${API_BASE}/traces?${params}`)
}
