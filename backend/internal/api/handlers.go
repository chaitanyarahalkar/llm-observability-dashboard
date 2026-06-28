package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"

	"github.com/chaitanyarahalkar/llm-observability-dashboard/internal/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// Health check
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "healthy"})
}

// IngestTrace accepts a single trace or array of traces
func (h *Handler) IngestTrace(w http.ResponseWriter, r *http.Request) {
	var payloads []models.TracePayload

	if err := json.NewDecoder(r.Body).Decode(&payloads); err != nil {
		// Try single trace
		r.Body.Close()
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON body: " + err.Error()})
		return
	}

	stmt, err := h.db.Prepare(`INSERT INTO traces
		(trace_id, model, provider, prompt_tokens, completion_tokens, latency_ms, time_to_first_token_ms, cost, status, error_message, prompt_hash, metadata)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer stmt.Close()

	inserted := 0
	for _, p := range payloads {
		traceID := p.TraceID
		if traceID == "" {
			traceID = uuid.New().String()
		}
		status := p.Status
		if status == "" {
			status = "success"
		}
		ttft := nullableInt(p.TTFTMs)
		errMsg := nullableString(p.ErrorMessage)
		meta := nullableString(p.Metadata)
		promptHash := p.PromptHash

		_, err := stmt.Exec(traceID, p.Model, p.Provider, p.PromptTokens, p.CompletionTokens,
			p.LatencyMs, ttft, p.Cost, status, errMsg, promptHash, meta)
		if err != nil {
			continue
		}
		inserted++
	}

	writeJSON(w, http.StatusCreated, map[string]int{"inserted": inserted})
}

// ListTraces returns paginated traces
func (h *Handler) ListTraces(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	model := r.URL.Query().Get("model")
	status := r.URL.Query().Get("status")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	// Count total
	var total int64
	countQuery := "SELECT COUNT(*) FROM traces WHERE 1=1"
	args := []interface{}{}
	if model != "" {
		countQuery += " AND model = ?"
		args = append(args, model)
	}
	if status != "" {
		countQuery += " AND status = ?"
		args = append(args, status)
	}
	h.db.QueryRow(countQuery, args...).Scan(&total)

	// Fetch page
	query := `SELECT id, trace_id, model, provider, prompt_tokens, completion_tokens,
		latency_ms, time_to_first_token_ms, cost, status, error_message, prompt_hash, metadata, created_at
		FROM traces`
	if model != "" {
		query += " WHERE model = ?"
	}
	if status != "" {
		if model != "" {
			query += " AND status = ?"
		} else {
			query += " WHERE status = ?"
		}
	}
	query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := h.db.Query(query, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	traces := []models.TraceResponse{}
	for rows.Next() {
		var t models.TraceResponse
		var ttft sql.NullInt64
		var errMsg sql.NullString
		var meta sql.NullString
		err := rows.Scan(&t.ID, &t.TraceID, &t.Model, &t.Provider,
			&t.PromptTokens, &t.CompletionTokens,
			&t.LatencyMs, &ttft, &t.Cost, &t.Status, &errMsg, &t.PromptHash, &meta, &t.CreatedAt)
		if err != nil {
			continue
		}
		t.TotalTokens = t.PromptTokens + t.CompletionTokens
		if ttft.Valid {
			t.TTFTMs = &ttft.Int64
		}
		if errMsg.Valid {
			t.ErrorMessage = errMsg.String
		}
		if meta.Valid {
			t.Metadata = meta.String
		}
		traces = append(traces, t)
	}

	writeJSON(w, http.StatusOK, models.TracesPage{
		Traces: traces,
		Total:  total,
		Page:   page,
		Limit:  limit,
	})
}

// GetTrace returns a single trace by its numeric id
func (h *Handler) GetTrace(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	var t models.TraceResponse
	var ttft sql.NullInt64
	var errMsg sql.NullString
	var meta sql.NullString

	err := h.db.QueryRow(`SELECT id, trace_id, model, provider, prompt_tokens, completion_tokens,
		latency_ms, time_to_first_token_ms, cost, status, error_message, prompt_hash, metadata, created_at
		FROM traces WHERE id = ?`, id).Scan(
		&t.ID, &t.TraceID, &t.Model, &t.Provider,
		&t.PromptTokens, &t.CompletionTokens,
		&t.LatencyMs, &ttft, &t.Cost, &t.Status, &errMsg, &t.PromptHash, &meta, &t.CreatedAt,
	)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "trace not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	t.TotalTokens = t.PromptTokens + t.CompletionTokens
	if ttft.Valid {
		t.TTFTMs = &ttft.Int64
	}
	if errMsg.Valid {
		t.ErrorMessage = errMsg.String
	}
	if meta.Valid {
		t.Metadata = meta.String
	}

	writeJSON(w, http.StatusOK, t)
}

// GetOverview returns aggregate stats for the overview cards
func (h *Handler) GetOverview(w http.ResponseWriter, r *http.Request) {
	since := r.URL.Query().Get("since")
	timeFilter := ""
	if since != "" {
		// Parse duration like "24h", "7d"
		dur, err := parseDuration(since)
		if err == nil {
			timeFilter = fmt.Sprintf(" WHERE created_at >= datetime('now', '-%d hours')", int(dur.Hours()))
		}
	}

	var s models.OverviewStats
	query := fmt.Sprintf(`SELECT
		COUNT(*) AS total_requests,
		COALESCE(SUM(prompt_tokens), 0),
		COALESCE(SUM(completion_tokens), 0),
		COALESCE(AVG(latency_ms), 0),
		COALESCE(AVG(time_to_first_token_ms), 0),
		COALESCE(SUM(cost), 0),
		COUNT(DISTINCT model),
		COUNT(DISTINCT provider),
		SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END),
		SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END)
		FROM traces%s`, timeFilter)

	err := h.db.QueryRow(query).Scan(
		&s.TotalRequests, &s.TotalPromptTokens, &s.TotalCompTokens,
		&s.AvgLatencyMs, &s.AvgTTFTMs, &s.TotalCost,
		&s.UniqueModels, &s.UniqueProviders,
		&s.SuccessCount, &s.ErrorCount,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if s.TotalRequests > 0 {
		s.ErrorRate = math.Round(float64(s.ErrorCount)/float64(s.TotalRequests)*10000) / 100
	}

	writeJSON(w, http.StatusOK, s)
}

// GetTimeSeries returns bucketed time-series data
func (h *Handler) GetTimeSeries(w http.ResponseWriter, r *http.Request) {
	since := r.URL.Query().Get("since")
	interval := r.URL.Query().Get("interval")

	if since == "" {
		since = "24h"
	}
	if interval == "" {
		interval = "1h"
	}

	dur, err := parseDuration(since)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid since duration"})
		return
	}

	// SQLite strftime grouping
	groupFormat := "%Y-%m-%dT%H:00:00" // default hourly
	hours := int(dur.Hours())
	switch interval {
	case "30m":
		groupFormat = `%Y-%m-%dT%H:%M:00`
	case "1h":
		groupFormat = `%Y-%m-%dT%H:00:00`
	case "6h":
		groupFormat = `%Y-%m-%dT%H:00:00`
	case "1d":
		groupFormat = `%Y-%m-%d`
	}

	query := fmt.Sprintf(`SELECT
		strftime('%s', created_at) AS bucket,
		COUNT(*) AS requests,
		COALESCE(SUM(prompt_tokens), 0),
		COALESCE(SUM(completion_tokens), 0),
		COALESCE(AVG(latency_ms), 0),
		COALESCE(SUM(cost), 0),
		SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END)
		FROM traces
		WHERE created_at >= datetime('now', '-%d hours')
		GROUP BY bucket
		ORDER BY bucket ASC`, groupFormat, hours)

	rows, err := h.db.Query(query)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	buckets := []models.TimeSeriesBucket{}
	for rows.Next() {
		var b models.TimeSeriesBucket
		rows.Scan(&b.Time, &b.Requests, &b.PromptTokens, &b.CompTokens, &b.AvgLatencyMs, &b.Cost, &b.ErrorCount)
		b.TotalTokens = b.PromptTokens + b.CompTokens
		buckets = append(buckets, b)
	}

	writeJSON(w, http.StatusOK, buckets)
}

// GetModelBreakdown returns per-model stats
func (h *Handler) GetModelBreakdown(w http.ResponseWriter, r *http.Request) {
	since := r.URL.Query().Get("since")
	timeFilter := ""
	if since != "" {
		dur, err := parseDuration(since)
		if err == nil {
			timeFilter = fmt.Sprintf(" WHERE created_at >= datetime('now', '-%d hours')", int(dur.Hours()))
		}
	}

	query := fmt.Sprintf(`SELECT
		model,
		COUNT(*) AS requests,
		COALESCE(SUM(prompt_tokens), 0),
		COALESCE(SUM(completion_tokens), 0),
		COALESCE(AVG(latency_ms), 0),
		COALESCE(SUM(cost), 0),
		CASE WHEN COUNT(*) > 0 THEN ROUND(CAST(SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 2) ELSE 0 END
		FROM traces%s GROUP BY model ORDER BY requests DESC`, timeFilter)

	rows, err := h.db.Query(query)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	breakdowns := []models.ModelBreakdown{}
	for rows.Next() {
		var b models.ModelBreakdown
		rows.Scan(&b.Model, &b.Requests, &b.PromptTokens, &b.CompTokens, &b.AvgLatencyMs, &b.Cost, &b.ErrorRate)
		b.TotalTokens = b.PromptTokens + b.CompTokens
		breakdowns = append(breakdowns, b)
	}

	writeJSON(w, http.StatusOK, breakdowns)
}

// Helpers

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func nullableInt(v *int64) interface{} {
	if v == nil {
		return nil
	}
	return *v
}

func nullableString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
