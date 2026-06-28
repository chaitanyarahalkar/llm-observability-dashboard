package main

import (
	"log"
	"net/http"
	"os"

	"github.com/chaitanyarahalkar/llm-observability-dashboard/internal/api"
	"github.com/chaitanyarahalkar/llm-observability-dashboard/internal/db"
)

func main() {
	dsn := os.Getenv("DATABASE_PATH")
	if dsn == "" {
		dsn = "file:observability.db?cache=shared&_journal_mode=WAL"
	}

	database, err := db.Init(dsn)
	if err != nil {
		log.Fatalf("failed to initialize database: %v", err)
	}
	defer database.Close()

	router := api.NewRouter(database)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("LLM Observability API serving on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}
