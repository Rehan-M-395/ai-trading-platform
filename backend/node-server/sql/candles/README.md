# NSE candle SQL (`historical_candles`)

- **Source rows:** `interval = 'ONE_MINUTE'` only. Higher timeframes are aggregated in SQL, not stored separately.
- **Alignment:** Intraday buckets use **09:15 IST** session open per trading day (`Asia/Kolkata`), not `FLOOR(epoch / 300)` in UTC (that misaligns NSE).
- **Session window:** Regular cash session only: `09:15` inclusive through `15:30` inclusive (376 one-minute slots from open).
- **OHLC:** `open` = first minute’s open by `candle_time ASC`; `close` = last minute’s close by `candle_time DESC`; `high`/`low` = max/min; `volume` = sum.
- **API `time`:** Unix seconds at **bar open** (UTC instant) — compatible with `lightweight-charts` `UTCTimestamp`.
- **Gaps:** Missing 1m rows in the DB still produce **no bar** for that period. SQL does not synthesize empty bars (that would be a separate feature).

## Connection

`/api/candles` uses **PostgreSQL** via `DATABASE_URL` (Supabase: Project Settings → Database → URI).  
The Supabase **REST** URL alone is not enough for these queries.
