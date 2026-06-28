package db

import (
	"database/sql"
	"fmt"
)

func Init(dsn string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open: %w", err)
	}

	db.SetMaxOpenConns(1)

	if err := migrate(db); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}

	return db, nil
}

type Trace struct {
	ID             int64          `json:"id"`
	TraceID        string         `json:"trace_id"`
	Model          string         `json:"model"`
	Provider       string         `json:"provider"`
	PromptTokens   sql.NullInt64  `json:"prompt_tokens"`
	CompletionTokens sql.NullInt64 `json:"completion_tokens"`
	LatencyMs      int64          `json:"latency_ms"`
	TTFTMs         sql.NullInt64  `json:"time_to_first_token_ms"`
	Cost           float64        `json:"cost"`
	Status         string         `json:"status"`
	ErrorMessage   sql.NullString `json:"error_message"`
	PromptHash     string         `json:"prompt_hash"`
	Metadata       sql.NullString `json:"metadata"`
	CreatedAt      string         `json:"created_at"`
}
