import { supabase } from "../utils/supabase/supaSetup.js";
import { type AngelExchange, type AngelInterval } from "./angelHistoricalService.js";

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

type GetStoredCandlesParams = {
  exchange: AngelExchange;
  symbolToken: string;
  interval: AngelInterval;
  start: number;
  limit: number;
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

async function getStockByExchangeAndToken(exchange: AngelExchange, symbolToken: string) {
  const { data, error } = await supabase
    .from("stocks")
    .select("id, exchange, symbol_token, trading_symbol, name, is_active")
    .eq("exchange", exchange)
    .eq("symbol_token", symbolToken)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase stock lookup failed: ${error.message}`);
  }

  return data as StockRecord | null;
}

export async function getStoredCandles({
  exchange,
  symbolToken,
  interval,
  start,
  limit,
}: GetStoredCandlesParams) {
  const stock = await getStockByExchangeAndToken(exchange, symbolToken);

  if (!stock) {
    return {
      rows: [],
      total: 0,
    };
  }

  const safeStart = Math.max(0, start);
  const safeLimit = Math.max(1, limit);
  const end = safeStart + safeLimit - 1;

  const { data, error, count } = await supabase
    .from("historical_candles")
    .select("candle_time, open, high, low, close, volume", { count: "exact" })
    .eq("stock_id", stock.id)
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
