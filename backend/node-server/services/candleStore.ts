import { supabase } from "../utils/supabase/supaSetup.js";
import { type AngelExchange, type AngelInterval } from "./angelHistoricalService.js";

export type StoredCandle = {
  exchange: AngelExchange;
  symbol_token: string;
  interval: AngelInterval;
  candle_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type GetStoredCandlesParams = {
  exchange: AngelExchange;
  symbolToken: string;
  interval: AngelInterval;
  start: number;
  limit: number;
};

export function mapAngelCandleToRow(
  exchange: AngelExchange,
  symbolToken: string,
  interval: AngelInterval,
  candle: [string, number, number, number, number, number],
): StoredCandle {
  const [candleTime, open, high, low, close, volume] = candle;

  return {
    exchange,
    symbol_token: symbolToken,
    interval,
    candle_time: candleTime,
    open,
    high,
    low,
    close,
    volume,
  };
}

export async function upsertCandles(rows: StoredCandle[]) {
  if (!rows.length) {
    return 0;
  }

  const { error } = await supabase
    .from("historical_candles")
    .upsert(rows, {
      onConflict: "exchange,symbol_token,interval,candle_time",
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  return rows.length;
}

export async function getStoredCandles({
  exchange,
  symbolToken,
  interval,
  start,
  limit,
}: GetStoredCandlesParams) {
  const safeStart = Math.max(0, start);
  const safeLimit = Math.max(1, limit);
  const end = safeStart + safeLimit - 1;

  const { data, error, count } = await supabase
    .from("historical_candles")
    .select("candle_time, open, high, low, close, volume", { count: "exact" })
    .eq("exchange", exchange)
    .eq("symbol_token", symbolToken)
    .eq("interval", interval)
    .order("candle_time", { ascending: true })
    .range(safeStart, end);

  if (error) {
    throw new Error(`Supabase fetch failed: ${error.message}`);
  }

  return {
    rows:
      data?.map((row) => ({
        date: row.candle_time,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
      })) ?? [],
    total: count ?? 0,
  };
}
