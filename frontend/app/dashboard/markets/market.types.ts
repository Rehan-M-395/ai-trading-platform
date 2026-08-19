import type { UTCTimestamp } from "lightweight-charts";

export type CandleData = {
  time: number;
  date?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type ChartPoint = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ChartTf = "1m" | "5m" | "15m" | "30m" | "1h" | "1d";

export type IntervalOption = {
  label: string;
  tf: ChartTf;
};

export type CandleResponse = {
  data?: CandleData[];
  nextStart?: number;
  hasMore?: boolean;
  total?: number;
};

export type StockMeta = {
  id: number;
  exchange: string;
  symbol_token: string;
  trading_symbol: string;
  name: string | null;
};

export type MarketSnapshot = {
  price: string;
  change: string;
  high: string;
  low: string;
};