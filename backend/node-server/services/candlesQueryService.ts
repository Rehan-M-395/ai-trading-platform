import { getPgPool } from "../db/pool.js";
import { CANDLE_QUERIES, type CandleTimeframe } from "../sql/candles/index.js";

export type CandleRow = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function num(v: unknown): number {
  if (typeof v === "number") {
    return v;
  }
  if (typeof v === "string") {
    return Number.parseFloat(v);
  }
  return Number.NaN;
}

export async function assertActiveStock(stockId: number): Promise<boolean> {
  const pool = getPgPool();
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM public.stocks WHERE id = $1 AND is_active = true LIMIT 1`,
    [stockId],
  );
  return rows.length > 0;
}

export type FetchCandlesParams = {
  stockId: number;
  tf: CandleTimeframe;
  start: number;
  limit: number;
  from?: string | null;
  to?: string | null;
};

/**
 * Paginated OHLCV from 1m base table. `time` is Unix seconds (UTC instant of bar open) for lightweight-charts.
 * `start` is the SQL OFFSET into ascending candles for this timeframe.
 * `nextStart` = max(0, start - limit) for loading older bars when scrolling left.
 */
export async function fetchCandles(params: FetchCandlesParams): Promise<{
  data: CandleRow[];
  total: number;
  nextStart: number;
  hasMore: boolean;
}> {
  const { stockId, tf, start, limit, from, to } = params;
  const safeLimit = Math.max(1, limit);
  const readStart = Math.max(0, start);

  const fromTs = from?.trim() ? from.trim() : null;
  const toTs = to?.trim() ? to.trim() : null;

  const sql = CANDLE_QUERIES[tf];
  const pool = getPgPool();

  console.log("[candles] query", { stockId, tf, readStart, safeLimit, from: fromTs, to: toTs });

  const { rows } = await pool.query<{
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    full_count: string | number;
  }>(sql, [stockId, fromTs, toTs, safeLimit, readStart]);

  if (!rows.length) {
    return {
      data: [],
      total: 0,
      nextStart: Math.max(0, readStart - safeLimit),
      hasMore: readStart > 0,
    };
  }

  const total = Number(rows[0].full_count);
  const data: CandleRow[] = rows.map((r) => ({
    time: num(r.time),
    open: num(r.open),
    high: num(r.high),
    low: num(r.low),
    close: num(r.close),
    volume: num(r.volume),
  }));

  const nextStart = Math.max(0, readStart - safeLimit);
  const hasMore = readStart > 0;

  return { data, total, nextStart, hasMore };
}
