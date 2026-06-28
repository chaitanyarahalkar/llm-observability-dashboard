package api

import (
	"database/sql"
	"net/http"

	"github.com/gorilla/mux"
)

func NewRouter(db *sql.DB) http.Handler {
	r := mux.NewRouter()

	h := &Handler{db: db}

	// Middleware
	r.Use(corsMiddleware)
	r.Use(loggingMiddleware)

	// API v1
	api := r.PathPrefix("/api/v1").Subrouter()

	// Traces
	api.HandleFunc("/traces", h.IngestTrace).Methods("POST")
	api.HandleFunc("/traces", h.ListTraces).Methods("GET")
	api.HandleFunc("/traces/{id}", h.GetTrace).Methods("GET")

	// Stats
	api.HandleFunc("/stats/overview", h.GetOverview).Methods("GET")
	api.HandleFunc("/stats/timeseries", h.GetTimeSeries).Methods("GET")
	api.HandleFunc("/stats/models", h.GetModelBreakdown).Methods("GET")

	// Health
	api.HandleFunc("/health", h.Health).Methods("GET")

	return r
}
