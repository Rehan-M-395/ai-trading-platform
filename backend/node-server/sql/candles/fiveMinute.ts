/**
 * 5-minute bars, bucket open anchored to NSE 09:15 IST (not UTC epoch).
 * Params: $1 stock_id, $2 from, $3 to, $4 limit, $5 offset
 */
export const CANDLES_5M_SQL = `
WITH minute_rows AS (
  SELECT
    c.stock_id,
    c.candle_time,
    c.open,
    c.high,
    c.low,
    c.close,
    c.volume,
    ((c.candle_time AT TIME ZONE 'Asia/Kolkata')::date + TIME '09:15:00') AT TIME ZONE 'Asia/Kolkata' AS session_open
  FROM stock_candles c
  WHERE c.stock_id = $1
    AND c.interval = 'ONE_MINUTE'
    AND ($2::timestamptz IS NULL OR c.candle_time >= $2::timestamptz)
    AND ($3::timestamptz IS NULL OR c.candle_time < $3::timestamptz)
),
sessioned AS (
  SELECT
    minute_rows.*,
    GREATEST(
      0,
      FLOOR(EXTRACT(EPOCH FROM (candle_time - session_open)) / 60.0)
    )::bigint AS min_from_open
  FROM minute_rows
  WHERE candle_time >= session_open
    AND candle_time < session_open + INTERVAL '376 minutes'
),
bucketed AS (
  SELECT
    stock_id,
    session_open
      + (FLOOR(min_from_open / 5.0)::bigint * INTERVAL '5 minutes') AS bucket_time,
    candle_time,
    open,
    high,
    low,
    close,
    volume
  FROM sessioned
  WHERE min_from_open < 376
),
agg AS (
  SELECT
    stock_id,
    bucket_time,
    (ARRAY_AGG(open ORDER BY candle_time ASC))[1] AS open,
    MAX(high) AS high,
    MIN(low) AS low,
    (ARRAY_AGG(close ORDER BY candle_time DESC))[1] AS close,
    SUM(volume)::double precision AS volume
  FROM bucketed
  GROUP BY stock_id, bucket_time
)
SELECT
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
