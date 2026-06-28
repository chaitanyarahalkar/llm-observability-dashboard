package models

import "time"

// StatsRange defines the time window for aggregation queries
type StatsRange struct {
	From     time.Time
	To       time.Time
	Interval string // e.g. "1h", "30m", "1d"
}
