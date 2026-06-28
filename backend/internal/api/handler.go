package api

import (
	"database/sql"

	_ "modernc.org/sqlite"
)

type Handler struct {
	db *sql.DB
}
