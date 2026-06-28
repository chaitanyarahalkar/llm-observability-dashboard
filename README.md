# LLM Observability Dashboard

A clean, mature, self-hosted observability dashboard for monitoring LLM (Large Language Model) workloads. Track token usage, latency, cost, and errors across all your AI API calls — with a beautiful dark-themed dashboard.

![License: MIT](https://img.shields.io/badge/license-MIT-purple)
![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)

## What It Does

- **Ingest traces** via REST API — log every LLM call with token counts, latency, cost, and model info
- **Real-time dashboard** with stat cards, area charts, and a trace table
- **Time-series aggregation** — latency, token usage, and cost over time
- **Per-model breakdown** — compare performance across different models and providers
- **Error tracking** — error rate monitoring and failed request visibility

## Architecture

```
┌─────────────────┐     REST API      ┌──────────────┐
│  Your AI App    │ ──── POST ────────▶│  Go Backend  │
│  (instrumented) │    /api/v1/traces  │  :8080       │
└─────────────────┘                     │  SQLite DB   │
                                        └──────┬───────┘
                                               │
┌─────────────────┐                            │
│  Dashboard UI   │ ◀──── GET /api/v1/stats ───┘
│  React + Vite   │
│  :5173          │
└─────────────────┘
```

## Quick Start

### Backend

```bash
cd backend
GONOSUMCHECK='*' GONOSUMDB='*' GOPROXY='https://proxy.golang.org,direct' go mod tidy
go run ./cmd/server
# API running on :8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Dashboard at http://localhost:5173
```

### Ingest Sample Data

```bash
curl -X POST http://localhost:8080/api/v1/traces \
  -H 'Content-Type: application/json' \
  -d '[{
    "model": "gpt-4o",
    "provider": "openai",
    "prompt_tokens": 1245,
    "completion_tokens": 89,
    "latency_ms": 1234,
    "time_to_first_token_ms": 210,
    "cost": 0.0042,
    "status": "success"
  }]'
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/traces` | Ingest trace(s) — accepts array |
| `GET` | `/api/v1/traces` | List traces (paginated, filterable) |
| `GET` | `/api/v1/traces/:id` | Get single trace detail |
| `GET` | `/api/v1/stats/overview` | Aggregate stats for dashboard cards |
| `GET` | `/api/v1/stats/timeseries` | Time-series buckets for charts |
| `GET` | `/api/v1/stats/models` | Per-model breakdown |
| `GET` | `/api/v1/health` | Health check |

Query params: `since=24h`, `since=7d`, `interval=1h`, `page=1`, `limit=50`, `model=gpt-4o`, `status=success`

## Dashboard

- **Stat cards**: Total requests, tokens, avg latency, cost, error rate, avg tokens/req, unique models, avg cost/req
- **Area charts**: Latency, token usage, and cost over time
- **Stacked area**: Prompt vs completion tokens
- **Traces table**: Sortable, paginated trace list with model badges and status indicators
- **Model breakdown**: Per-model aggregate stats table
- **Dark theme** out of the box — clean, mature, readable

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Go 1.25+ (net/http, gorilla/mux) |
| Database | SQLite (modernc.org/sqlite — pure Go) |
| Frontend | React 18, TypeScript, Vite |
| Charts | Recharts |
| Styling | Tailwind CSS 4, custom dark theme |
| Icons | Lucide React |

## License

MIT
