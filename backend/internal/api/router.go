package api

import (
	"database/sql"
	"net/http"

	"github.com/gorilla/mux"
)

func NewRouter(db *sql.DB) http.Handler {
	r := mux.NewRouter()
	h := &Handler{db: db}

	// Global middleware
	r.Use(corsMiddleware)
	r.Use(loggingMiddleware)

	// Health — no rate limit
	r.HandleFunc("/api/v1/health", h.Health).Methods("GET")

	// API v1 with rate limiting (100 req/s, burst 50)
	api := r.PathPrefix("/api/v1").Subrouter()
	api.Use(rateLimitMiddleware(100, 50))

	// Traces
	api.HandleFunc("/traces", h.IngestTrace).Methods("POST")
	api.HandleFunc("/traces", h.ListTraces).Methods("GET")
	api.HandleFunc("/traces/{id}", h.GetTrace).Methods("GET")

	// Stats
	api.HandleFunc("/stats/overview", h.GetOverview).Methods("GET")
	api.HandleFunc("/stats/timeseries", h.GetTimeSeries).Methods("GET")
	api.HandleFunc("/stats/models", h.GetModelBreakdown).Methods("GET")

	// OpenAPI spec
	r.HandleFunc("/api/v1/openapi.json", openAPISpec).Methods("GET")

	return r
}

func openAPISpec(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(openAPISpecJSON))
}

const openAPISpecJSON = `{
  "openapi": "3.0.3",
  "info": {
    "title": "LLM Observability API",
    "description": "Enterprise telemetry ingestion and query API for production LLM workloads",
    "version": "1.0.0"
  },
  "servers": [{"url": "/api/v1"}],
  "paths": {
    "/health": {
      "get": {
        "summary": "Health check with DB ping",
        "responses": {
          "200": {"description": "Healthy"},
          "503": {"description": "Degraded — DB unreachable"}
        }
      }
    },
    "/traces": {
      "post": {
        "summary": "Ingest trace(s)",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "array",
                "items": {"$ref": "#/components/schemas/TracePayload"}
              }
            }
          }
        },
        "responses": {
          "201": {"description": "Traces inserted"},
          "400": {"description": "Validation error"}
        }
      },
      "get": {
        "summary": "List traces (paginated)",
        "parameters": [
          {"name": "page", "in": "query", "schema": {"type": "integer"}},
          {"name": "limit", "in": "query", "schema": {"type": "integer"}},
          {"name": "model", "in": "query", "schema": {"type": "string"}},
          {"name": "status", "in": "query", "schema": {"type": "string", "enum": ["success", "error"]}}
        ],
        "responses": {"200": {"description": "Paginated trace list"}}
      }
    },
    "/traces/{id}": {
      "get": {
        "summary": "Get single trace by ID",
        "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "integer"}}],
        "responses": {
          "200": {"description": "Trace found"},
          "404": {"description": "Not found"}
        }
      }
    },
    "/stats/overview": {
      "get": {
        "summary": "Aggregate overview stats",
        "parameters": [{"name": "since", "in": "query", "schema": {"type": "string"}, "description": "e.g. 1h, 6h, 24h, 7d, 30d"}],
        "responses": {"200": {"description": "Aggregate metrics"}}
      }
    },
    "/stats/timeseries": {
      "get": {
        "summary": "Time-series bucketed data",
        "parameters": [
          {"name": "since", "in": "query", "schema": {"type": "string"}},
          {"name": "interval", "in": "query", "schema": {"type": "string", "enum": ["5m", "1h", "6h", "1d"]}}
        ],
        "responses": {"200": {"description": "Time-series buckets"}}
      }
    },
    "/stats/models": {
      "get": {
        "summary": "Per-model breakdown",
        "parameters": [{"name": "since", "in": "query", "schema": {"type": "string"}}],
        "responses": {"200": {"description": "Model breakdown list"}}
      }
    }
  },
  "components": {
    "schemas": {
      "TracePayload": {
        "type": "object",
        "required": ["model", "provider", "prompt_tokens", "completion_tokens", "latency_ms", "cost"],
        "properties": {
          "trace_id": {"type": "string"},
          "model": {"type": "string"},
          "provider": {"type": "string"},
          "prompt_tokens": {"type": "integer", "minimum": 0},
          "completion_tokens": {"type": "integer", "minimum": 0},
          "latency_ms": {"type": "integer", "minimum": 0},
          "time_to_first_token_ms": {"type": "integer", "minimum": 0},
          "cost": {"type": "number", "minimum": 0},
          "status": {"type": "string", "enum": ["success", "error"]},
          "error_message": {"type": "string"},
          "prompt_hash": {"type": "string"},
          "metadata": {"type": "string"}
        }
      }
    }
  }
}`
