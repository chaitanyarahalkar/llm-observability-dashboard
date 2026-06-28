package models

// TracePayload is the JSON body for POST /api/v1/traces
type TracePayload struct {
	TraceID          string  `json:"trace_id"`
	Model            string  `json:"model"`
	Provider         string  `json:"provider"`
	PromptTokens     int64   `json:"prompt_tokens"`
	CompletionTokens int64   `json:"completion_tokens"`
	LatencyMs        int64   `json:"latency_ms"`
	TTFTMs           *int64  `json:"time_to_first_token_ms,omitempty"`
	Cost             float64 `json:"cost"`
	Status           string  `json:"status"`
	ErrorMessage     string  `json:"error_message,omitempty"`
	PromptHash       string  `json:"prompt_hash,omitempty"`
	Metadata         string  `json:"metadata,omitempty"`
}

// TraceResponse is a single trace in API responses
type TraceResponse struct {
	ID               int64   `json:"id"`
	TraceID          string  `json:"trace_id"`
	Model            string  `json:"model"`
	Provider         string  `json:"provider"`
	PromptTokens     int64   `json:"prompt_tokens"`
	CompletionTokens int64   `json:"completion_tokens"`
	TotalTokens      int64   `json:"total_tokens"`
	LatencyMs        int64   `json:"latency_ms"`
	TTFTMs           *int64  `json:"time_to_first_token_ms,omitempty"`
	Cost             float64 `json:"cost"`
	Status           string  `json:"status"`
	ErrorMessage     string  `json:"error_message,omitempty"`
	PromptHash       string  `json:"prompt_hash,omitempty"`
	Metadata         string  `json:"metadata,omitempty"`
	CreatedAt        string  `json:"created_at"`
}

// OverviewStats is the response for GET /api/v1/stats/overview
type OverviewStats struct {
	TotalRequests      int64   `json:"total_requests"`
	TotalPromptTokens  int64   `json:"total_prompt_tokens"`
	TotalCompTokens    int64   `json:"total_completion_tokens"`
	AvgLatencyMs       float64 `json:"avg_latency_ms"`
	AvgTTFTMs          float64 `json:"avg_time_to_first_token_ms"`
	TotalCost          float64 `json:"total_cost"`
	ErrorRate          float64 `json:"error_rate"`
	UniqueModels       int64   `json:"unique_models"`
	UniqueProviders    int64   `json:"unique_providers"`
	SuccessCount       int64   `json:"success_count"`
	ErrorCount         int64   `json:"error_count"`
}

// TimeSeriesBucket is one aggregated time bucket
type TimeSeriesBucket struct {
	Time          string  `json:"time"`
	Requests      int64   `json:"requests"`
	PromptTokens  int64   `json:"prompt_tokens"`
	CompTokens    int64   `json:"completion_tokens"`
	TotalTokens   int64   `json:"total_tokens"`
	AvgLatencyMs  float64 `json:"avg_latency_ms"`
	Cost          float64 `json:"cost"`
	ErrorCount    int64   `json:"error_count"`
}

// ModelBreakdown is per-model aggregate stats
type ModelBreakdown struct {
	Model         string  `json:"model"`
	Requests      int64   `json:"requests"`
	PromptTokens  int64   `json:"prompt_tokens"`
	CompTokens    int64   `json:"completion_tokens"`
	TotalTokens   int64   `json:"total_tokens"`
	AvgLatencyMs  float64 `json:"avg_latency_ms"`
	Cost          float64 `json:"cost"`
	ErrorRate     float64 `json:"error_rate"`
}

// TracesPage is a paginated list of traces
type TracesPage struct {
	Traces     []TraceResponse `json:"traces"`
	Total      int64           `json:"total"`
	Page       int             `json:"page"`
	Limit      int             `json:"limit"`
}
