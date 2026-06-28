package api

import (
	"fmt"
	"net/http"
	"regexp"
	"time"
)

// parseDuration handles strings like "24h", "7d", "30m"
func parseDuration(s string) (time.Duration, error) {
	re := regexp.MustCompile(`^(\d+)(h|d|m)$`)
	matches := re.FindStringSubmatch(s)
	if matches == nil {
		return 0, fmt.Errorf("invalid duration: %s", s)
	}

	val := matches[1]
	unit := matches[2]

	switch unit {
	case "h":
		return time.ParseDuration(val + "h")
	case "d":
		d, _ := time.ParseDuration(val + "h")
		return d * 24, nil
	case "m":
		return time.ParseDuration(val + "m")
	}
	return 0, fmt.Errorf("invalid duration")
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		fmt.Printf("%s %s %s\n", r.Method, r.URL.Path, time.Since(start))
	})
}
