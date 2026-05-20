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

type FetchStats = {
  fetched: number;
  inserted: number;
  skippedExisting: number;
  noDataDays: string[];
};

const INTERVAL: AngelInterval = "ONE_MINUTE";
const MAX_DAYS_PER_REQUEST = 30;
const IST_TIMEZONE = "Asia/Kolkata";
const MARKET_OPEN = "09:15";
const MARKET_CLOSE = "15:30";
const EXISTING_TIMES_CHUNK = 200;

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toIstDateKey(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: IST_TIMEZONE });
}

function candleTimeToIstDateKey(candleTime: string) {
  return new Date(candleTime).toLocaleDateString("en-CA", { timeZone: IST_TIMEZONE });
}

function isWeekendIst(dateKey: string) {
  const noonIst = new Date(`${dateKey}T12:00:00+05:30`);
  const day = noonIst.getUTCDay();
  return day === 0 || day === 6;
}

function listWeekdayDateKeys(from: Date, to: Date) {
  const keys: string[] = [];
  let cursor = new Date(from);

  while (cursor <= to) {
    const key = toIstDateKey(cursor);
    if (!isWeekendIst(key)) {
      keys.push(key);
    }
    cursor = addDays(cursor, 1);
  }

  return keys;
}

function groupConsecutiveDateKeys(dateKeys: string[]) {
  if (!dateKeys.length) {
    return [] as string[][];
  }

  const sorted = [...dateKeys].sort();
  const groups: string[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = new Date(`${sorted[i - 1]}T12:00:00+05:30`);
    const current = new Date(`${sorted[i]}T12:00:00+05:30`);
    const dayDiff = Math.round(
      (current.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (dayDiff === 1) {
      groups[groups.length - 1].push(sorted[i]);
    } else {
      groups.push([sorted[i]]);
    }
  }

  return groups;
}

function buildWindowsForMissingDays(missingDateKeys: string[]) {
  const groups = groupConsecutiveDateKeys(missingDateKeys);
  const windows: Array<{ fromdate: string; todate: string; dateKeys: string[] }> = [];

  for (const group of groups) {
    let chunkStart = 0;

    while (chunkStart < group.length) {
      const chunk = group.slice(chunkStart, chunkStart + MAX_DAYS_PER_REQUEST);
      const first = chunk[0];
      const last = chunk[chunk.length - 1];

      windows.push({
        fromdate: `${first} ${MARKET_OPEN}`,
        todate: `${last} ${MARKET_CLOSE}`,
        dateKeys: chunk,
      });

      chunkStart += MAX_DAYS_PER_REQUEST;
    }
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

async function getCoveredIstDateKeys(stockId: number, from: Date, to: Date) {
  const covered = new Set<string>();
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("historical_candles")
      .select("candle_time")
      .eq("stock_id", stockId)
      .eq("interval", INTERVAL)
      .gte("candle_time", from.toISOString())
      .lte("candle_time", to.toISOString())
      .order("candle_time", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Supabase candle lookup failed: ${error.message}`);
    }

    const rows = data ?? [];
    if (!rows.length) {
      break;
    }

    for (const row of rows) {
      covered.add(candleTimeToIstDateKey(row.candle_time));
    }

    if (rows.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return covered;
}

async function filterRowsNotInDatabase(stockId: number, rows: CandleInsertRow[]) {
  if (!rows.length) {
    return { newRows: [], skippedExisting: 0 };
  }

  const existingTimes = new Set<string>();

  for (let i = 0; i < rows.length; i += EXISTING_TIMES_CHUNK) {
    const chunk = rows.slice(i, i + EXISTING_TIMES_CHUNK);
    const candleTimes = chunk.map((row) => row.candle_time);

    const { data, error } = await supabase
      .from("historical_candles")
      .select("candle_time")
      .eq("stock_id", stockId)
      .eq("interval", INTERVAL)
      .in("candle_time", candleTimes);

    if (error) {
      throw new Error(`Supabase duplicate check failed: ${error.message}`);
    }

    for (const row of data ?? []) {
      existingTimes.add(row.candle_time);
    }
  }

  const newRows = rows.filter((row) => !existingTimes.has(row.candle_time));

  return {
    newRows,
    skippedExisting: rows.length - newRows.length,
  };
}

async function insertCandles(rows: CandleInsertRow[]) {
  if (!rows.length) {
    return 0;
  }

  const { error } = await supabase.from("historical_candles").insert(rows);

  if (error) {
    throw new Error(`Supabase candle insert failed: ${error.message}`);
  }

  return rows.length;
}

async function fetchAndStoreStock(stock: StockRow, totalDays: number) {
  const now = new Date();
  const rangeStart = addDays(now, -totalDays);
  const weekdayKeys = listWeekdayDateKeys(rangeStart, now);
  const coveredDateKeys = await getCoveredIstDateKeys(stock.id, rangeStart, now);
  const missingDateKeys = weekdayKeys.filter((key) => !coveredDateKeys.has(key));

  const stats: FetchStats = {
    fetched: 0,
    inserted: 0,
    skippedExisting: 0,
    noDataDays: [],
  };

  console.log(
    `\n${stock.trading_symbol} -> token ${stock.symbol_token} -> stock_id ${stock.id}`,
  );
  console.log(
    `Last ${totalDays} day(s): ${weekdayKeys.length} weekday(s), ${coveredDateKeys.size} already in DB, ${missingDateKeys.length} to fetch`,
  );

  if (!missingDateKeys.length) {
    console.log("All weekday data already present. Skipping API calls.");
    return {
      stockId: stock.id,
      tradingSymbol: stock.trading_symbol,
      symbolToken: stock.symbol_token,
      ...stats,
    };
  }

  console.log(`Missing dates: ${missingDateKeys.join(", ")}`);

  const windows = buildWindowsForMissingDays(missingDateKeys);

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
    stats.fetched += candles.length;

    const rows = candles.map((candle) =>
      mapAngelCandleToInsertRow(stock.id, INTERVAL, candle),
    );
    const { newRows, skippedExisting } = await filterRowsNotInDatabase(stock.id, rows);
    stats.skippedExisting += skippedExisting;

    const inserted = await insertCandles(newRows);
    stats.inserted += inserted;

    const returnedDateKeys = new Set(rows.map((row) => candleTimeToIstDateKey(row.candle_time)));
    for (const dateKey of window.dateKeys) {
      if (!returnedDateKeys.has(dateKey)) {
        stats.noDataDays.push(dateKey);
        console.log(`No candles for ${dateKey} (weekend/holiday or market closed)`);
      }
    }

    console.log(
      `Fetched ${candles.length}, inserted ${inserted}, skipped existing ${skippedExisting}`,
    );
  }

  return {
    stockId: stock.id,
    tradingSymbol: stock.trading_symbol,
    symbolToken: stock.symbol_token,
    ...stats,
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
  console.log(
    "Only missing weekdays are fetched. Weekends are skipped. Rows already in DB are not inserted again.",
  );

  for (const stock of stocks) {
    const result = await fetchAndStoreStock(stock, totalDays);
    results.push(result);
  }

  console.log("\nSummary");
  for (const result of results) {
    const holidayNote =
      result.noDataDays.length > 0
        ? ` | no API data: ${[...new Set(result.noDataDays)].join(", ")}`
        : "";

    console.log(
      `${result.tradingSymbol} (${result.symbolToken}) -> stock_id ${result.stockId} -> fetched ${result.fetched}, inserted ${result.inserted}, skipped existing ${result.skippedExisting}${holidayNote}`,
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
