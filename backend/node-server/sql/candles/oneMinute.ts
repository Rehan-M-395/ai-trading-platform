/**
 * 1-minute OHLCV from `stock_candles` (pre-filtered to NSE regular session in IST).
 * Params: $1 stock_id, $2 from (timestamptz|null), $3 to (timestamptz|null), $4 limit, $5 offset
 */
export const CANDLES_1M_SQL = `
WITH minute_rows AS (
  SELECT
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
  SELECT *
  FROM minute_rows
  WHERE candle_time >= session_open
    AND candle_time < session_open + INTERVAL '376 minutes'
),
ordered AS (
  SELECT
    candle_time,
    open,
    high,
    low,
    close,
    volume,
    COUNT(*) OVER () AS full_count
  FROM sessioned
)
SELECT
  EXTRACT(EPOCH FROM candle_time)::bigint AS time,
  open,
  high,
  low,
  close,
  volume,
  full_count
FROM ordered
ORDER BY candle_time ASC
LIMIT $4
OFFSET $5;
`;
