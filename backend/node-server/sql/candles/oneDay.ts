/**
 * Daily bars: one row per US trading day, bar open at 09:30 America/New_York.
 * Params: $1 stock_id, $2 from, $3 to, $4 limit, $5 offset
 */
export const CANDLES_1D_SQL = `
WITH minute_rows AS (
  SELECT
    c.stock_id,
    c.candle_time,
    c.open,
    c.high,
    c.low,
    c.close,
    c.volume,
    (c.candle_time AT TIME ZONE 'America/New_York')::date AS trade_date,
    ((c.candle_time AT TIME ZONE 'America/New_York')::date + TIME '09:30:00') AT TIME ZONE 'America/New_York' AS session_open
  FROM candles_data c
  WHERE c.stock_id = $1
    AND ($2::timestamptz IS NULL OR c.candle_time >= $2::timestamptz)
    AND ($3::timestamptz IS NULL OR c.candle_time < $3::timestamptz)
),
sessioned AS (
  SELECT *
  FROM minute_rows
  WHERE candle_time >= session_open
    AND candle_time < session_open + INTERVAL '390 minutes'
),
agg AS (
  SELECT
    stock_id,
    (trade_date + TIME '09:30:00') AT TIME ZONE 'America/New_York' AS bucket_time,
    (ARRAY_AGG(open ORDER BY candle_time ASC))[1] AS open,
    MAX(high) AS high,
    MIN(low) AS low,
    (ARRAY_AGG(close ORDER BY candle_time DESC))[1] AS close,
    SUM(volume)::double precision AS volume
  FROM sessioned
  GROUP BY stock_id, trade_date
)
SELECT
  bucket_time AS candle_time,
  EXTRACT(EPOCH FROM bucket_time)::bigint AS time,
  open,
  high,
  low,
  close,
  volume,
  COUNT(*) OVER () AS full_count
FROM agg
ORDER BY bucket_time ASC
LIMIT $4
OFFSET $5;
`;
