package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/chaitanyarahalkar/llm-observability-dashboard/internal/models"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// ── Health ──

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	err := h.db.Ping()
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"status": "degraded",
			"error":  "database unreachable",
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"status": "healthy",
		"time":   time.Now().UTC().Format(time.RFC3339),
	})
}

// ── Ingest ──

func (h *Handler) IngestTrace(w http.ResponseWriter, r *http.Request) {
	var payloads []models.TracePayload

	if err := json.NewDecoder(r.Body).Decode(&payloads); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error":   "invalid JSON body",
			"detail":  err.Error(),
		})
		return
	}

	if len(payloads) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "request body must contain at least one trace object",
		})
		return
	}

	if len(payloads) > 1000 {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("batch limited to 1000 traces, got %d", len(payloads)),
		})
		return
	}

	// Validate all payloads before inserting
	for i, p := range payloads {
		if err := validateTracePayload(p); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": fmt.Sprintf("trace[%d]: %s", i, err.Error()),
			})
			return
		}
	}

	stmt, err := h.db.Prepare(`INSERT INTO traces
		(trace_id, model, provider, prompt_tokens, completion_tokens, latency_ms, time_to_first_token_ms, cost, status, error_message, prompt_hash, metadata)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		slog.Error("prepare insert", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
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

		_, err := stmt.Exec(
			traceID, p.Model, p.Provider,
			p.PromptTokens, p.CompletionTokens,
			p.LatencyMs, nullableInt(p.TTFTMs),
			p.Cost, status,
			nullableString(p.ErrorMessage),
			p.PromptHash,
			nullableString(p.Metadata),
		)
		if err != nil {
			slog.Warn("insert trace failed", "trace_id", traceID, "error", err)
			continue
		}
		inserted++
	}

	writeJSON(w, http.StatusCreated, map[string]int{"inserted": inserted})
}

// ── List Traces ──

func (h *Handler) ListTraces(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	model := strings.TrimSpace(r.URL.Query().Get("model"))
	status := strings.TrimSpace(r.URL.Query().Get("status"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	// Validate status filter
	if status != "" && status != "success" && status != "error" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "status filter must be 'success' or 'error'",
		})
		return
	}

	// Build WHERE dynamically with parameterized args to avoid injection
	var conditions []string
	var args []interface{}

	if model != "" {
		conditions = append(conditions, "model = ?")
		args = append(args, model)
	}
	if status != "" {
		conditions = append(conditions, "status = ?")
		args = append(args, status)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	// Count
	var total int64
	countQuery := "SELECT COUNT(*) FROM traces" + whereClause
	if err := h.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		slog.Error("count traces", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	// Fetch
	fetchQuery := fmt.Sprintf(`SELECT id, trace_id, model, provider, prompt_tokens, completion_tokens,
		latency_ms, time_to_first_token_ms, cost, status, error_message, prompt_hash, metadata, created_at
		FROM traces%s ORDER BY created_at DESC LIMIT ? OFFSET ?`, whereClause)
	args = append(args, limit, offset)

	rows, err := h.db.Query(fetchQuery, args...)
	if err != nil {
		slog.Error("query traces", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	defer rows.Close()

	traces := []models.TraceResponse{}
	for rows.Next() {
		t, err := scanTrace(rows)
		if err != nil {
			continue
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

// ── Get Trace ──

func (h *Handler) GetTrace(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if _, err := strconv.ParseInt(id, 10, 64); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id must be an integer"})
		return
	}

	var ttft sql.NullInt64
	var errMsg sql.NullString
	var meta sql.NullString
	var t models.TraceResponse

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
		slog.Error("get trace", "id", id, "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
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

// ── Overview ──

func (h *Handler) GetOverview(w http.ResponseWriter, r *http.Request) {
	since := r.URL.Query().Get("since")
	if since == "" {
		since = "24h"
	}

	dur, err := parseDuration(since)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("invalid 'since' value: %s", since)})
		return
	}

	var s models.OverviewStats
	err = h.db.QueryRow(`SELECT
		COUNT(*),
		COALESCE(SUM(prompt_tokens), 0),
		COALESCE(SUM(completion_tokens), 0),
		COALESCE(AVG(latency_ms), 0),
		COALESCE(AVG(time_to_first_token_ms), 0),
		COALESCE(SUM(cost), 0),
		COUNT(DISTINCT model),
		COUNT(DISTINCT provider),
		COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END), 0),
		COALESCE(SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END), 0)
		FROM traces WHERE created_at >= datetime('now', ?)`,
		fmt.Sprintf("-%d hours", int(dur.Hours())),
	).Scan(
		&s.TotalRequests, &s.TotalPromptTokens, &s.TotalCompTokens,
		&s.AvgLatencyMs, &s.AvgTTFTMs, &s.TotalCost,
		&s.UniqueModels, &s.UniqueProviders,
		&s.SuccessCount, &s.ErrorCount,
	)
	if err != nil {
		slog.Error("overview query", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	if s.TotalRequests > 0 {
		s.ErrorRate = math.Round(float64(s.ErrorCount)/float64(s.TotalRequests)*10000) / 100
	}

	writeJSON(w, http.StatusOK, s)
}

// ── Time Series ──

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
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("invalid 'since': %s", since)})
		return
	}

	// SQLite strftime format for grouping
	groupFormat := "%Y-%m-%dT%H:00:00" // default hourly
	switch interval {
	case "5m":
		groupFormat = "%Y-%m-%dT%H:%M:00"
	case "1h":
		groupFormat = "%Y-%m-%dT%H:00:00"
	case "6h":
		groupFormat = "%Y-%m-%dT%H:00:00"
	case "1d":
		groupFormat = "%Y-%m-%d"
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("invalid interval: %s (supported: 5m, 1h, 6h, 1d)", interval),
		})
		return
	}

	hours := int(dur.Hours())

	// CRITICAL: Use %% in strftime to escape Go's fmt.Sprintf %% processing
	// The SQL we want: strftime('%Y-%m-%d...', created_at)
	// In Go Sprintf: use %%Y-%%m-%%d to produce literal %Y-%m-%d in the final SQL
	escapedGroupFormat := strings.ReplaceAll(groupFormat, "%", "%%")

	query := fmt.Sprintf(`SELECT
		strftime('`+escapedGroupFormat+`', created_at) AS bucket,
		COUNT(*) AS requests,
		COALESCE(SUM(prompt_tokens), 0),
		COALESCE(SUM(completion_tokens), 0),
		COALESCE(AVG(latency_ms), 0),
		COALESCE(SUM(cost), 0),
		SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END)
		FROM traces
		WHERE created_at >= datetime('now', '-%d hours')
		GROUP BY bucket
		ORDER BY bucket ASC`, hours)

	rows, err := h.db.Query(query)
	if err != nil {
		slog.Error("timeseries query", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	defer rows.Close()

	buckets := []models.TimeSeriesBucket{}
	for rows.Next() {
		var b models.TimeSeriesBucket
		if err := rows.Scan(&b.Time, &b.Requests, &b.PromptTokens, &b.CompTokens, &b.AvgLatencyMs, &b.Cost, &b.ErrorCount); err != nil {
			slog.Warn("scan timeseries row", "error", err)
			continue
		}
		b.TotalTokens = b.PromptTokens + b.CompTokens
		buckets = append(buckets, b)
	}

	writeJSON(w, http.StatusOK, buckets)
}

// ── Model Breakdown ──

func (h *Handler) GetModelBreakdown(w http.ResponseWriter, r *http.Request) {
	since := r.URL.Query().Get("since")
	if since == "" {
		since = "24h"
	}

	dur, err := parseDuration(since)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("invalid 'since': %s", since)})
		return
	}

	rows, err := h.db.Query(`SELECT
		model,
		COUNT(*) AS requests,
		COALESCE(SUM(prompt_tokens), 0),
		COALESCE(SUM(completion_tokens), 0),
		COALESCE(AVG(latency_ms), 0),
		COALESCE(SUM(cost), 0),
		CASE WHEN COUNT(*) > 0 THEN ROUND(CAST(SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 2) ELSE 0 END
		FROM traces
		WHERE created_at >= datetime('now', ?)
		GROUP BY model ORDER BY requests DESC`,
		fmt.Sprintf("-%d hours", int(dur.Hours())),
	)
	if err != nil {
		slog.Error("model breakdown query", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	defer rows.Close()

	breakdowns := []models.ModelBreakdown{}
	for rows.Next() {
		var b models.ModelBreakdown
		if err := rows.Scan(&b.Model, &b.Requests, &b.PromptTokens, &b.CompTokens, &b.AvgLatencyMs, &b.Cost, &b.ErrorRate); err != nil {
			slog.Warn("scan model row", "error", err)
			continue
		}
		b.TotalTokens = b.PromptTokens + b.CompTokens
		breakdowns = append(breakdowns, b)
	}

	writeJSON(w, http.StatusOK, breakdowns)
}

// ── Helpers ──

func scanTrace(rows *sql.Rows) (models.TraceResponse, error) {
	var t models.TraceResponse
	var ttft sql.NullInt64
	var errMsg sql.NullString
	var meta sql.NullString

	err := rows.Scan(&t.ID, &t.TraceID, &t.Model, &t.Provider,
		&t.PromptTokens, &t.CompletionTokens,
		&t.LatencyMs, &ttft, &t.Cost, &t.Status, &errMsg, &t.PromptHash, &meta, &t.CreatedAt)
	if err != nil {
		return t, err
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
	return t, nil
}

func validateTracePayload(p models.TracePayload) error {
	if p.Model == "" {
		return fmt.Errorf("model is required")
	}
	if p.Provider == "" {
		return fmt.Errorf("provider is required")
	}
	if p.PromptTokens < 0 {
		return fmt.Errorf("prompt_tokens must be >= 0")
	}
	if p.CompletionTokens < 0 {
		return fmt.Errorf("completion_tokens must be >= 0")
	}
	if p.LatencyMs < 0 {
		return fmt.Errorf("latency_ms must be >= 0")
	}
	if p.Cost < 0 {
		return fmt.Errorf("cost must be >= 0")
	}
	if p.TTFTMs != nil && *p.TTFTMs < 0 {
		return fmt.Errorf("time_to_first_token_ms must be >= 0")
	}
	if p.Status != "" && p.Status != "success" && p.Status != "error" {
		return fmt.Errorf("status must be 'success' or 'error'")
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		slog.Error("write json response", "error", err)
	}
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
