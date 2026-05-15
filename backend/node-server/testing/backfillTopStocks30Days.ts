import axios from "axios";
import dotenv from "dotenv";

import {
  fetchAngelHistoricalCandles,
  type AngelExchange,
  type AngelHistoricalRequest,
  type AngelInterval,
} from "../services/angelHistoricalService.js";
import { supabase } from "../utils/supabase/supaSetup.js";

dotenv.config();

type StockRow = {
  id: number;
  exchange: string;
  symbol_token: string;
  trading_symbol: string;
  name: string | null;
  is_active: boolean;
};

type CandleInsertRow = {
  stock_id: number;
  interval: AngelInterval;
  candle_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const INTERVAL: AngelInterval = "ONE_MINUTE";
const MAX_DAYS_PER_REQUEST = 30;

function formatAngelDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function buildDateWindows(totalDays: number, maxDaysPerRequest: number) {
  const windows: Array<{ fromdate: string; todate: string }> = [];
  const now = new Date();
  let windowStart = addDays(now, -totalDays);

  while (windowStart < now) {
    const tentativeEnd = addDays(windowStart, maxDaysPerRequest);
    const windowEnd = tentativeEnd < now ? tentativeEnd : now;

    windows.push({
      fromdate: formatAngelDate(windowStart),
      todate: formatAngelDate(windowEnd),
    });

    windowStart = windowEnd;
  }

  return windows;
}

async function getStocksToBackfill() {
  const { data, error } = await supabase
    .from("stocks")
    .select("id, exchange, symbol_token, trading_symbol, name, is_active")
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Supabase stock fetch failed: ${error.message}`);
  }

  return (data ?? []) as StockRow[];
}

function mapAngelCandleToInsertRow(
  stockId: number,
  interval: AngelInterval,
  candle: [string, number, number, number, number, number],
): CandleInsertRow {
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

async function upsertCandles(rows: CandleInsertRow[]) {
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
    throw new Error(`Supabase candle upsert failed: ${error.message}`);
  }

  return rows.length;
}

async function fetchAndStoreStock(stock: StockRow, totalDays: number) {
  const windows = buildDateWindows(totalDays, MAX_DAYS_PER_REQUEST);
  let inserted = 0;

  console.log(
    `\n${stock.trading_symbol} -> token ${stock.symbol_token} -> stock_id ${stock.id}`,
  );

  for (const window of windows) {
    const request: AngelHistoricalRequest = {
      exchange: stock.exchange as AngelExchange,
      symboltoken: stock.symbol_token,
      interval: INTERVAL,
      fromdate: window.fromdate,
      todate: window.todate,
    };

    console.log(`Fetching ${request.fromdate} -> ${request.todate}`);

    const candles = await fetchAngelHistoricalCandles(request);
    const rows = candles.map((candle) =>
      mapAngelCandleToInsertRow(stock.id, INTERVAL, candle),
    );
    const upserted = await upsertCandles(rows);

    inserted += upserted;
    console.log(`Fetched ${candles.length}, upserted ${upserted}`);
  }

  return {
    stockId: stock.id,
    tradingSymbol: stock.trading_symbol,
    symbolToken: stock.symbol_token,
    inserted,
  };
}

async function main() {
  const totalDays = Number.parseInt(process.argv[2] ?? "30", 10) || 30;
  const stocks = await getStocksToBackfill();

  if (!stocks.length) {
    console.log("No active stocks found in public.stocks. Nothing to backfill.");
    return;
  }

  const results = [];

  console.log(
    `Backfilling ${INTERVAL} candles for last ${totalDays} days for ${stocks.length} stock(s) from public.stocks`,
  );

  for (const stock of stocks) {
    const result = await fetchAndStoreStock(stock, totalDays);
    results.push(result);
  }

  console.log("\nSummary");
  for (const result of results) {
    console.log(
      `${result.tradingSymbol} (${result.symbolToken}) -> stock_id ${result.stockId} -> ${result.inserted} rows processed`,
    );
  }
}

void main().catch((error: unknown) => {
  if (axios.isAxiosError(error)) {
    console.error("Request failed");
    console.error(error.response?.data ?? error.message);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Unknown error");
  }

  process.exit(1);
});
