package db

import "database/sql"

func migrate(db *sql.DB) error {
	query := `
	CREATE TABLE IF NOT EXISTS traces (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		trace_id TEXT NOT NULL UNIQUE,
		model TEXT NOT NULL DEFAULT '',
		provider TEXT NOT NULL DEFAULT '',
		prompt_tokens INTEGER DEFAULT 0,
		completion_tokens INTEGER DEFAULT 0,
		total_tokens INTEGER GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
		latency_ms INTEGER NOT NULL DEFAULT 0,
		time_to_first_token_ms INTEGER,
		cost REAL NOT NULL DEFAULT 0.0,
		status TEXT NOT NULL DEFAULT 'success',
		error_message TEXT DEFAULT '',
		prompt_hash TEXT NOT NULL DEFAULT '',
		metadata TEXT DEFAULT '{}',
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE INDEX IF NOT EXISTS idx_traces_model ON traces(model);
	CREATE INDEX IF NOT EXISTS idx_traces_status ON traces(status);
	CREATE INDEX IF NOT EXISTS idx_traces_created_at ON traces(created_at);
	CREATE INDEX IF NOT EXISTS idx_traces_provider ON traces(provider);
	`

	_, err := db.Exec(query)
	return err
}
