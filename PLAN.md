# LLM Observability Dashboard — Implementation Plan

**Goal:** Build a clean, mature, self-hosted LLM observability dashboard with Go backend and React frontend that tracks token usage, latency, costs, errors, and provides rich time-series visualization.

**Architecture:** Go REST API (net/http + gorilla/mux) with SQLite storage, React SPA (Vite + Recharts + shadcn/ui) dashboard. Traces ingested via API, aggregated for dashboard cards and time-series charts.

**Tech Stack:** Go 1.22+, React 18, Vite, Recharts, Tailwind CSS, SQLite (modernc.org/sqlite), gorilla/mux

---

### Task 1: Project Scaffolding

**Objective:** Set up Go module and React app structure

**Files:**
- Create: `backend/go.mod`
- Create: `backend/main.go`
- Create: `frontend/` (via Vite)
- Create: `README.md`

### Task 2: Database Schema & Migrations

**Objective:** Define and create the SQLite schema for traces and sessions

**Files:**
- Create: `backend/internal/db/schema.go`
- Create: `backend/internal/db/db.go`

**Schema:**
- traces: id, trace_id (UUID), model, provider, prompt_tokens, completion_tokens, total_tokens, latency_ms, time_to_first_token_ms, cost, status, error_message, prompt_hash, metadata (JSON), created_at
- completion_tokens default 0, cost 0.0, status 'success'/'error'

### Task 3: Data Models

**Objective:** Define Go structs for trace ingestion and query responses

**Files:**
- Create: `backend/internal/models/trace.go`
- Create: `backend/internal/models/stats.go`

### Task 4: Trace Ingestion API

**Objective:** POST /api/v1/traces to receive LLM call data

**Files:**
- Create: `backend/internal/api/router.go`
- Create: `backend/internal/api/handlers.go`
- Create: `backend/internal/api/middleware.go`

### Task 5: Stats & Aggregation API

**Objective:** GET /api/v1/stats/overview and /api/v1/stats/timeseries

**Files:**
- Modify: `backend/internal/api/handlers.go` (add stats handlers)
- Create: `backend/internal/stats/aggregator.go`

### Task 6: Frontend Foundation

**Objective:** Set up React + Vite + Tailwind + Recharts with clean, mature design

**Files:**
- Create: `frontend/` (Vite scaffold)
- Create: `frontend/src/components/Dashboard.tsx`
- Create: `frontend/src/components/Cards.tsx`
- Create: `frontend/src/components/TimeSeriesChart.tsx`
- Create: `frontend/src/components/TracesTable.tsx`
- Create: `frontend/src/api/client.ts`

### Task 7: Dashboard Cards (Overview)

**Objective:** Stat cards showing total tokens, cost, avg latency, error rate, request count

### Task 8: Time-Series Charts

**Objective:** Recharts line/area charts for tokens, latency, cost over time

### Task 9: Traces Table with Detail

**Objective:** Sortable, filterable trace list with expandable detail rows

### Task 10: Polish & Integration

**Objective:** Wire frontend to backend, refine UI, test end-to-end

---

## API Design

```
POST   /api/v1/traces          — ingest trace
GET    /api/v1/traces          — list traces (pagination, filters)
GET    /api/v1/traces/:id     — single trace detail
GET    /api/v1/stats/overview  — aggregate cards data
GET    /api/v1/stats/timeseries?range=24h&interval=1h — time-series buckets
GET    /api/v1/stats/models    — per-model breakdown
```

## Dashboard Layout

```
┌──────────────────────────────────────────────────────┐
│  LLM Observability                          [24h ▼]  │
│──────────────────────────────────────────────────────│
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Requests │ │  Tokens  │ │ Avg Lat  │ │  Cost   │ │
│  │  12,847  │ │  3.2M    │ │  1.4s    │ │ $42.18  │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Err Rate │ │ Avg TTFT │ │ Tok/Req  │ │ Models  │ │
│  │  0.3%    │ │  210ms   │ │  249     │ │   5     │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
│──────────────────────────────────────────────────────│
│  Latency Over Time                                   │
│  ┌────────────────────────────────────────────────┐  │
│  │  ▓▓▓▓▓▓▓▓      ▓▓▓▓▓▓▓▓▓▓                     │  │
│  │  ▓▓▓▓▓▓▓▓    ▓▓▓▓▓▓▓▓▓▓▓▓▓  (area chart)      │  │
│  └────────────────────────────────────────────────┘  │
│──────────────────────────────────────────────────────│
│  Token Usage Over Time                               │
│  ┌────────────────────────────────────────────────┐  │
│  │  ▓ prompt   ▓ completion  (stacked area)       │  │
│  └────────────────────────────────────────────────┘  │
│──────────────────────────────────────────────────────│
│  Recent Traces                              [Filter] │
│  ┌────────────────────────────────────────────────┐  │
│  │ Time    │ Model    │ Tokens │ Latency │ Status  │  │
│  │ 12:34   │ gpt-4o   │ 1,245  │ 1.2s    │ ✓      │  │
│  │ 12:32   │ claude   │ 892    │ 0.8s    │ ✓      │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```
