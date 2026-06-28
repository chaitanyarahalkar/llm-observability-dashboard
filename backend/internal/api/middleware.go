package api

import (
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"sync"
	"time"
)

// ── Duration parsing ──

var durationRe = regexp.MustCompile(`^(\d+)(h|d|m)$`)

func parseDuration(s string) (time.Duration, error) {
	matches := durationRe.FindStringSubmatch(s)
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

// ── CORS ──

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

// ── Structured request logging ──

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(wrapped, r)

		slog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", wrapped.statusCode,
			"duration_ms", time.Since(start).Milliseconds(),
			"remote", r.RemoteAddr,
		)
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// ── Simple token-bucket rate limiter ──

func rateLimitMiddleware(rps int, burst int) func(http.Handler) http.Handler {
	type clientState struct {
		tokens   float64
		lastSeen time.Time
	}
	var mu sync.Mutex
	clients := map[string]*clientState{}

	// Cleanup goroutine
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			mu.Lock()
			cutoff := time.Now().Add(-10 * time.Minute)
			for ip, state := range clients {
				if state.lastSeen.Before(cutoff) {
					delete(clients, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr

			mu.Lock()
			state, exists := clients[ip]
			if !exists {
				state = &clientState{tokens: float64(burst), lastSeen: time.Now()}
				clients[ip] = state
			}

			// Refill tokens
			elapsed := time.Since(state.lastSeen).Seconds()
			state.tokens += elapsed * float64(rps)
			if state.tokens > float64(burst) {
				state.tokens = float64(burst)
			}
			state.lastSeen = time.Now()

			if state.tokens < 1 {
				mu.Unlock()
				w.Header().Set("Retry-After", "1")
				slog.Warn("rate limited", "ip", ip)
				http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
				return
			}
			state.tokens--
			mu.Unlock()

			next.ServeHTTP(w, r)
		})
	}
}
