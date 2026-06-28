package api_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/chaitanyarahalkar/llm-observability-dashboard/internal/api"
	"github.com/chaitanyarahalkar/llm-observability-dashboard/internal/db"
	"github.com/chaitanyarahalkar/llm-observability-dashboard/internal/models"
)

// ── Test setup ──

func setupTestAPI(t *testing.T) *httptest.Server {
	t.Helper()

	database, err := db.Init("file::memory:?cache=shared&_journal_mode=WAL")
	if err != nil {
		t.Fatalf("db init: %v", err)
	}

	router := api.NewRouter(database)
	srv := httptest.NewServer(router)

	t.Cleanup(func() {
		srv.Close()
		database.Close()
	})

	return srv
}

func postJSON(t *testing.T, srv *httptest.Server, path string, body interface{}) *http.Response {
	t.Helper()
	b, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	resp, err := http.Post(srv.URL+path, "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	return resp
}

func getJSON(t *testing.T, srv *httptest.Server, path string) *http.Response {
	t.Helper()
	resp, err := http.Get(srv.URL + path)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	return resp
}

func decodeBody[T any](t *testing.T, resp *http.Response) T {
	t.Helper()
	defer resp.Body.Close()
	var v T
	if err := json.NewDecoder(resp.Body).Decode(&v); err != nil {
		t.Fatalf("decode: %v (status=%d)", err, resp.StatusCode)
	}
	return v
}

// ── Helper to make valid traces ──

func makeTrace(model string, tokens int64, latency int64, status string) models.TracePayload {
	return models.TracePayload{
		Model:            model,
		Provider:         "openai",
		PromptTokens:     tokens,
		CompletionTokens: tokens / 4,
		LatencyMs:        latency,
		Cost:             float64(tokens) * 0.0001,
		Status:           status,
	}
}

// ── Health ──

func TestHealth(t *testing.T) {
	srv := setupTestAPI(t)
	resp := getJSON(t, srv, "/api/v1/health")
	if resp.StatusCode != 200 {
		t.Fatalf("health: expected 200, got %d", resp.StatusCode)
	}
	body := decodeBody[map[string]string](t, resp)
	if body["status"] != "healthy" {
		t.Fatalf("health: expected healthy, got %s", body["status"])
	}
	if body["time"] == "" {
		t.Fatal("health: missing time field")
	}
}

// ── Ingest: happy path ──

func TestIngestSingleTrace(t *testing.T) {
	srv := setupTestAPI(t)

	trace := makeTrace("gpt-4o", 1000, 500, "success")
	resp := postJSON(t, srv, "/api/v1/traces", []models.TracePayload{trace})
	if resp.StatusCode != 201 {
		t.Fatalf("ingest: expected 201, got %d", resp.StatusCode)
	}

	body := decodeBody[map[string]int](t, resp)
	if body["inserted"] != 1 {
		t.Fatalf("ingest: expected 1 inserted, got %d", body["inserted"])
	}
}

func TestIngestBatch(t *testing.T) {
	srv := setupTestAPI(t)

	traces := []models.TracePayload{
		makeTrace("gpt-4o", 1000, 500, "success"),
		makeTrace("claude-sonnet-4", 2000, 800, "success"),
		makeTrace("gpt-4o-mini", 500, 200, "error"),
	}
	resp := postJSON(t, srv, "/api/v1/traces", traces)
	if resp.StatusCode != 201 {
		t.Fatalf("batch ingest: expected 201, got %d", resp.StatusCode)
	}
	body := decodeBody[map[string]int](t, resp)
	if body["inserted"] != 3 {
		t.Fatalf("batch ingest: expected 3 inserted, got %d", body["inserted"])
	}
}

// ── Ingest: validation ──

func TestIngestEmptyBody(t *testing.T) {
	srv := setupTestAPI(t)
	resp := postJSON(t, srv, "/api/v1/traces", []models.TracePayload{})
	if resp.StatusCode != 400 {
		t.Fatalf("empty body: expected 400, got %d", resp.StatusCode)
	}
}

func TestIngestMissingModel(t *testing.T) {
	srv := setupTestAPI(t)
	trace := makeTrace("", 1000, 500, "success")
	resp := postJSON(t, srv, "/api/v1/traces", []models.TracePayload{trace})
	if resp.StatusCode != 400 {
		t.Fatalf("missing model: expected 400, got %d", resp.StatusCode)
	}
}

func TestIngestMissingProvider(t *testing.T) {
	srv := setupTestAPI(t)
	trace := models.TracePayload{
		Model:            "gpt-4o",
		Provider:         "",
		PromptTokens:     100,
		CompletionTokens: 50,
		LatencyMs:        500,
		Cost:             0.01,
	}
	resp := postJSON(t, srv, "/api/v1/traces", []models.TracePayload{trace})
	if resp.StatusCode != 400 {
		t.Fatalf("missing provider: expected 400, got %d", resp.StatusCode)
	}
}

func TestIngestNegativeTokens(t *testing.T) {
	srv := setupTestAPI(t)
	trace := makeTrace("gpt-4o", -1, 500, "success")
	resp := postJSON(t, srv, "/api/v1/traces", []models.TracePayload{trace})
	if resp.StatusCode != 400 {
		t.Fatalf("negative tokens: expected 400, got %d", resp.StatusCode)
	}
}

func TestIngestNegativeLatency(t *testing.T) {
	srv := setupTestAPI(t)
	trace := models.TracePayload{
		Model:            "gpt-4o",
		Provider:         "openai",
		PromptTokens:     100,
		CompletionTokens: 50,
		LatencyMs:        -1,
		Cost:             0.01,
	}
	resp := postJSON(t, srv, "/api/v1/traces", []models.TracePayload{trace})
	if resp.StatusCode != 400 {
		t.Fatalf("negative latency: expected 400, got %d", resp.StatusCode)
	}
}

func TestIngestInvalidStatus(t *testing.T) {
	srv := setupTestAPI(t)
	trace := makeTrace("gpt-4o", 1000, 500, "timeout")
	resp := postJSON(t, srv, "/api/v1/traces", []models.TracePayload{trace})
	if resp.StatusCode != 400 {
		t.Fatalf("invalid status: expected 400, got %d", resp.StatusCode)
	}
}

func TestIngestBatchTooLarge(t *testing.T) {
	srv := setupTestAPI(t)
	traces := make([]models.TracePayload, 1001)
	for i := range traces {
		traces[i] = makeTrace("gpt-4o", 100, 100, "success")
	}
	resp := postJSON(t, srv, "/api/v1/traces", traces)
	if resp.StatusCode != 400 {
		t.Fatalf("batch too large: expected 400, got %d", resp.StatusCode)
	}
}

// ── Ingest: auto-assigns UUID ──

func TestIngestAutoUUID(t *testing.T) {
	srv := setupTestAPI(t)
	trace := models.TracePayload{
		Model:            "gpt-4o",
		Provider:         "openai",
		PromptTokens:     100,
		CompletionTokens: 50,
		LatencyMs:        500,
		Cost:             0.01,
	}
	resp := postJSON(t, srv, "/api/v1/traces", []models.TracePayload{trace})
	if resp.StatusCode != 201 {
		t.Fatalf("auto uuid: expected 201, got %d", resp.StatusCode)
	}

	// Verify trace exists with a UUID
	resp = getJSON(t, srv, "/api/v1/traces?limit=1")
	page := decodeBody[models.TracesPage](t, resp)
	if len(page.Traces) != 1 {
		t.Fatalf("auto uuid: expected 1 trace, got %d", len(page.Traces))
	}
	if len(page.Traces[0].TraceID) != 36 {
		t.Fatalf("auto uuid: expected UUID length 36, got %d (%s)", len(page.Traces[0].TraceID), page.Traces[0].TraceID)
	}
}

// ── List Traces: pagination ──

func TestListTracesPagination(t *testing.T) {
	srv := setupTestAPI(t)

	// Ingest 7 traces
	for i := 0; i < 7; i++ {
		trace := makeTrace("gpt-4o", int64(1000+i*100), int64(500+i*10), "success")
		resp := postJSON(t, srv, "/api/v1/traces", []models.TracePayload{trace})
		if resp.StatusCode != 201 {
			t.Fatalf("ingest[%d]: got %d", i, resp.StatusCode)
		}
	}

	// Page 1, limit 3
	resp := getJSON(t, srv, "/api/v1/traces?page=1&limit=3")
	page := decodeBody[models.TracesPage](t, resp)
	if page.Total != 7 {
		t.Fatalf("total: expected 7, got %d", page.Total)
	}
	if len(page.Traces) != 3 {
		t.Fatalf("page1: expected 3 traces, got %d", len(page.Traces))
	}
	if page.Page != 1 {
		t.Fatalf("page1: expected page=1, got %d", page.Page)
	}

	// Page 3 (last page — 7 traces, limit 3 → pages: 3, 3, 1)
	resp = getJSON(t, srv, "/api/v1/traces?page=3&limit=3")
	page = decodeBody[models.TracesPage](t, resp)
	if len(page.Traces) != 1 {
		t.Fatalf("page3: expected 1 trace, got %d", len(page.Traces))
	}

	// Page 0 → defaults to 1
	resp = getJSON(t, srv, "/api/v1/traces?page=0")
	page = decodeBody[models.TracesPage](t, resp)
	if page.Page != 1 {
		t.Fatalf("page0: expected page=1, got %d", page.Page)
	}

	// Limit > 100 → clamped
	resp = getJSON(t, srv, "/api/v1/traces?limit=200")
	page = decodeBody[models.TracesPage](t, resp)
	if page.Limit != 50 {
		t.Fatalf("limit 200: expected limit=50, got %d", page.Limit)
	}
}

// ── List Traces: filtering ──

func TestListTracesFilterByModel(t *testing.T) {
	srv := setupTestAPI(t)

	postJSON(t, srv, "/api/v1/traces", []models.TracePayload{
		makeTrace("gpt-4o", 1000, 500, "success"),
		makeTrace("claude-sonnet-4", 2000, 800, "success"),
		makeTrace("gpt-4o", 3000, 1200, "success"),
	})

	resp := getJSON(t, srv, "/api/v1/traces?model=gpt-4o")
	page := decodeBody[models.TracesPage](t, resp)
	if page.Total != 2 {
		t.Fatalf("filter model: expected 2 traces, got %d", page.Total)
	}
	for _, tr := range page.Traces {
		if tr.Model != "gpt-4o" {
			t.Fatalf("filter model: got unexpected model %s", tr.Model)
		}
	}
}

func TestListTracesFilterByStatus(t *testing.T) {
	srv := setupTestAPI(t)

	postJSON(t, srv, "/api/v1/traces", []models.TracePayload{
		makeTrace("gpt-4o", 1000, 500, "success"),
		makeTrace("gpt-4o", 2000, 800, "error"),
		makeTrace("gpt-4o", 3000, 1200, "success"),
	})

	resp := getJSON(t, srv, "/api/v1/traces?status=error")
	page := decodeBody[models.TracesPage](t, resp)
	if page.Total != 1 {
		t.Fatalf("filter status error: expected 1 trace, got %d", page.Total)
	}
	if page.Traces[0].Status != "error" {
		t.Fatalf("filter status: expected error, got %s", page.Traces[0].Status)
	}

	// Invalid status
	resp = getJSON(t, srv, "/api/v1/traces?status=invalid")
	if resp.StatusCode != 400 {
		t.Fatalf("filter invalid status: expected 400, got %d", resp.StatusCode)
	}
}

func TestListTracesFilterByModelAndStatus(t *testing.T) {
	srv := setupTestAPI(t)

	postJSON(t, srv, "/api/v1/traces", []models.TracePayload{
		makeTrace("gpt-4o", 1000, 500, "success"),
		makeTrace("gpt-4o", 2000, 800, "error"),
		makeTrace("claude-sonnet-4", 3000, 1200, "error"),
	})

	resp := getJSON(t, srv, "/api/v1/traces?model=gpt-4o&status=error")
	page := decodeBody[models.TracesPage](t, resp)
	if page.Total != 1 {
		t.Fatalf("filter both: expected 1 trace, got %d", page.Total)
	}
}

// ── Get Trace ──

func TestGetTrace(t *testing.T) {
	srv := setupTestAPI(t)

	trace := makeTrace("gpt-4o", 1000, 500, "success")
	postJSON(t, srv, "/api/v1/traces", []models.TracePayload{trace})

	// Get the first trace
	resp := getJSON(t, srv, "/api/v1/traces?limit=1")
	page := decodeBody[models.TracesPage](t, resp)
	id := page.Traces[0].ID

	resp = getJSON(t, srv, fmt.Sprintf("/api/v1/traces/%d", id))
	if resp.StatusCode != 200 {
		t.Fatalf("get trace: expected 200, got %d", resp.StatusCode)
	}

	tr := decodeBody[models.TraceResponse](t, resp)
	if tr.ID != id {
		t.Fatalf("get trace: expected id=%d, got %d", id, tr.ID)
	}
	if tr.Model != "gpt-4o" {
		t.Fatalf("get trace: expected model=gpt-4o, got %s", tr.Model)
	}
	if tr.TotalTokens != 1250 {
		t.Fatalf("get trace: expected total_tokens=1250, got %d", tr.TotalTokens)
	}
}

func TestGetTraceNotFound(t *testing.T) {
	srv := setupTestAPI(t)
	resp := getJSON(t, srv, "/api/v1/traces/99999")
	if resp.StatusCode != 404 {
		t.Fatalf("get trace not found: expected 404, got %d", resp.StatusCode)
	}
}

func TestGetTraceInvalidID(t *testing.T) {
	srv := setupTestAPI(t)
	resp := getJSON(t, srv, "/api/v1/traces/abc")
	if resp.StatusCode != 400 {
		t.Fatalf("get trace invalid id: expected 400, got %d", resp.StatusCode)
	}
}

// ── Overview ──

func TestOverviewEmpty(t *testing.T) {
	srv := setupTestAPI(t)
	resp := getJSON(t, srv, "/api/v1/stats/overview")
	if resp.StatusCode != 200 {
		t.Fatalf("overview empty: expected 200, got %d", resp.StatusCode)
	}

	stats := decodeBody[models.OverviewStats](t, resp)
	if stats.TotalRequests != 0 {
		t.Fatalf("overview empty: expected 0 requests, got %d", stats.TotalRequests)
	}
}

func TestOverviewWithData(t *testing.T) {
	srv := setupTestAPI(t)

	postJSON(t, srv, "/api/v1/traces", []models.TracePayload{
		makeTrace("gpt-4o", 1000, 500, "success"),
		makeTrace("claude-sonnet-4", 2000, 800, "success"),
		makeTrace("gpt-4o-mini", 500, 200, "success"),
		makeTrace("gpt-4o", 3000, 1200, "error"),
	})

	resp := getJSON(t, srv, "/api/v1/stats/overview")
	stats := decodeBody[models.OverviewStats](t, resp)

	if stats.TotalRequests != 4 {
		t.Fatalf("overview: expected 4 requests, got %d", stats.TotalRequests)
	}
	if stats.SuccessCount != 3 {
		t.Fatalf("overview: expected 3 success, got %d", stats.SuccessCount)
	}
	if stats.ErrorCount != 1 {
		t.Fatalf("overview: expected 1 error, got %d", stats.ErrorCount)
	}
	if stats.ErrorRate != 25.0 {
		t.Fatalf("overview: expected error_rate=25, got %f", stats.ErrorRate)
	}
	if stats.UniqueModels != 3 {
		t.Fatalf("overview: expected 3 unique models, got %d", stats.UniqueModels)
	}
	if stats.UniqueProviders != 1 {
		t.Fatalf("overview: expected 1 provider, got %d", stats.UniqueProviders)
	}
	if stats.TotalPromptTokens != 6500 {
		t.Fatalf("overview: expected 6500 prompt tokens, got %d", stats.TotalPromptTokens)
	}
}

func TestOverviewInvalidSince(t *testing.T) {
	srv := setupTestAPI(t)
	resp := getJSON(t, srv, "/api/v1/stats/overview?since=xyz")
	if resp.StatusCode != 400 {
		t.Fatalf("overview invalid since: expected 400, got %d", resp.StatusCode)
	}
}

// ── Time Series ──

func TestTimeSeriesEmpty(t *testing.T) {
	srv := setupTestAPI(t)
	resp := getJSON(t, srv, "/api/v1/stats/timeseries")
	if resp.StatusCode != 200 {
		t.Fatalf("timeseries empty: expected 200, got %d", resp.StatusCode)
	}
	buckets := decodeBody[[]models.TimeSeriesBucket](t, resp)
	if len(buckets) != 0 {
		t.Fatalf("timeseries empty: expected 0 buckets, got %d", len(buckets))
	}
}

func TestTimeSeriesWithData(t *testing.T) {
	srv := setupTestAPI(t)

	postJSON(t, srv, "/api/v1/traces", []models.TracePayload{
		makeTrace("gpt-4o", 1000, 500, "success"),
		makeTrace("gpt-4o", 2000, 800, "error"),
	})

	resp := getJSON(t, srv, "/api/v1/stats/timeseries?since=24h&interval=1h")
	if resp.StatusCode != 200 {
		t.Fatalf("timeseries: expected 200, got %d", resp.StatusCode)
	}
	buckets := decodeBody[[]models.TimeSeriesBucket](t, resp)
	if len(buckets) == 0 {
		t.Fatal("timeseries: expected at least 1 bucket")
	}
	// Verify aggregation
	found := false
	for _, b := range buckets {
		if b.Requests == 2 {
			found = true
			if b.TotalTokens == 0 {
				t.Errorf("timeseries: expected non-zero tokens")
			}
		}
	}
	if !found {
		t.Logf("buckets: %+v", buckets)
		t.Fatal("timeseries: bucket with 2 requests not found")
	}
}

func TestTimeSeriesInvalidInterval(t *testing.T) {
	srv := setupTestAPI(t)
	resp := getJSON(t, srv, "/api/v1/stats/timeseries?interval=2h")
	if resp.StatusCode != 400 {
		t.Fatalf("timeseries invalid interval: expected 400, got %d", resp.StatusCode)
	}
}

func TestTimeSeries5mInterval(t *testing.T) {
	srv := setupTestAPI(t)

	postJSON(t, srv, "/api/v1/traces", []models.TracePayload{
		makeTrace("gpt-4o", 100, 500, "success"),
	})

	resp := getJSON(t, srv, "/api/v1/stats/timeseries?since=1h&interval=5m")
	if resp.StatusCode != 200 {
		t.Fatalf("timeseries 5m: expected 200, got %d", resp.StatusCode)
	}
}

// ── Model Breakdown ──

func TestModelBreakdown(t *testing.T) {
	srv := setupTestAPI(t)

	postJSON(t, srv, "/api/v1/traces", []models.TracePayload{
		makeTrace("gpt-4o", 1000, 500, "success"),
		makeTrace("gpt-4o", 2000, 800, "error"),
		makeTrace("claude-sonnet-4", 3000, 1200, "success"),
	})

	resp := getJSON(t, srv, "/api/v1/stats/models")
	if resp.StatusCode != 200 {
		t.Fatalf("model breakdown: expected 200, got %d", resp.StatusCode)
	}

	mb := decodeBody[[]models.ModelBreakdown](t, resp)
	if len(mb) != 2 {
		t.Fatalf("model breakdown: expected 2 models, got %d", len(mb))
	}

	// Should be ordered by request count desc
	if mb[0].Model != "gpt-4o" {
		t.Fatalf("model breakdown: expected gpt-4o first, got %s", mb[0].Model)
	}
	if mb[0].Requests != 2 {
		t.Fatalf("model breakdown: expected gpt-4o requests=2, got %d", mb[0].Requests)
	}
	if mb[0].ErrorRate != 50.0 {
		t.Fatalf("model breakdown: expected gpt-4o error_rate=50, got %f", mb[0].ErrorRate)
	}
	if mb[1].Model != "claude-sonnet-4" {
		t.Fatalf("model breakdown: expected claude-sonnet-4 second, got %s", mb[1].Model)
	}
}

func TestModelBreakdownEmpty(t *testing.T) {
	srv := setupTestAPI(t)
	resp := getJSON(t, srv, "/api/v1/stats/models")
	mb := decodeBody[[]models.ModelBreakdown](t, resp)
	if len(mb) != 0 {
		t.Fatalf("model breakdown empty: expected 0, got %d", len(mb))
	}
}

// ── CORS ──

func TestCORSHeaders(t *testing.T) {
	srv := setupTestAPI(t)

	// CORS headers are set on ALL responses via middleware
	resp := getJSON(t, srv, "/api/v1/health")
	if resp.Header.Get("Access-Control-Allow-Origin") != "*" {
		t.Fatal("cors: missing Access-Control-Allow-Origin")
	}
	if resp.Header.Get("Access-Control-Allow-Methods") != "GET, POST, OPTIONS" {
		t.Fatal("cors: missing Access-Control-Allow-Methods")
	}
}

// ── Concurrent ingestion ──

func TestConcurrentIngestion(t *testing.T) {
	srv := setupTestAPI(t)

	var wg sync.WaitGroup
	errs := make(chan error, 10)

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			trace := models.TracePayload{
				TraceID:          fmt.Sprintf("concurrent-%d", idx),
				Model:            "gpt-4o",
				Provider:         "openai",
				PromptTokens:     100,
				CompletionTokens: 50,
				LatencyMs:        500,
				Cost:             float64(idx) * 0.001,
				Status:           "success",
			}
			resp := postJSON(t, srv, "/api/v1/traces", []models.TracePayload{trace})
			if resp.StatusCode != 201 {
				errs <- fmt.Errorf("concurrent[%d]: got status %d", idx, resp.StatusCode)
			}
		}(i)
	}

	wg.Wait()
	close(errs)

	for e := range errs {
		t.Error(e)
	}

	// All 10 should be there
	resp := getJSON(t, srv, "/api/v1/stats/overview")
	stats := decodeBody[models.OverviewStats](t, resp)
	if stats.TotalRequests != 10 {
		t.Fatalf("concurrent: expected 10 total, got %d", stats.TotalRequests)
	}
}

// ── Error message handling ──

func TestErrorMessageOnFailedTrace(t *testing.T) {
	srv := setupTestAPI(t)

	trace := models.TracePayload{
		Model:            "gpt-4o",
		Provider:         "openai",
		PromptTokens:     100,
		CompletionTokens: 0,
		LatencyMs:        3000,
		Cost:             0.01,
		Status:           "error",
		ErrorMessage:     "rate limit exceeded",
	}
	resp := postJSON(t, srv, "/api/v1/traces", []models.TracePayload{trace})
	if resp.StatusCode != 201 {
		t.Fatalf("error message: expected 201, got %d", resp.StatusCode)
	}

	resp = getJSON(t, srv, "/api/v1/traces?status=error&limit=1")
	page := decodeBody[models.TracesPage](t, resp)
	if len(page.Traces) != 1 {
		t.Fatalf("error message: expected 1 error trace")
	}
	if page.Traces[0].ErrorMessage != "rate limit exceeded" {
		t.Fatalf("error message: expected 'rate limit exceeded', got '%s'", page.Traces[0].ErrorMessage)
	}
}

// ── API returns JSON content type ──

func TestContentTypeJSON(t *testing.T) {
	srv := setupTestAPI(t)
	resp := getJSON(t, srv, "/api/v1/health")
	if ct := resp.Header.Get("Content-Type"); ct != "application/json" {
		t.Fatalf("content type: expected application/json, got %s", ct)
	}
}

// ── OpenAPI spec ──

func TestOpenAPISpec(t *testing.T) {
	srv := setupTestAPI(t)
	resp := getJSON(t, srv, "/api/v1/openapi.json")
	if resp.StatusCode != 200 {
		t.Fatalf("openapi: expected 200, got %d", resp.StatusCode)
	}
}
