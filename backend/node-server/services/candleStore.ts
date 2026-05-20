import { supabase } from "../utils/supabase/supaSetup.js";
import { type AngelInterval } from "./angelHistoricalService.js";

export type StockRecord = {
  id: number;
  exchange: string;
  symbol_token: string;
  trading_symbol: string;
  name: string | null;
  is_active: boolean;
};

export type StoredCandle = {
  stock_id: number;
  interval: AngelInterval;
  candle_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export function mapAngelCandleToRow(
  stockId: number,
  interval: AngelInterval,
  candle: [string, number, number, number, number, number],
): StoredCandle {
  const [candleTime, open, high, low, close, volume] = candle;

  return {
    stock_id: stockId,
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
      onConflict: "stock_id,interval,candle_time",
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  return rows.length;
}

export async function listActiveStocks() {
  const { data, error } = await supabase
    .from("stocks")
    .select("id, exchange, symbol_token, trading_symbol, name, is_active")
    .eq("is_active", true)
    .order("trading_symbol", { ascending: true });

  if (error) {
    throw new Error(`Supabase stock fetch failed: ${error.message}`);
  }

  return (data ?? []) as StockRecord[];
}
