import { CANDLES_1M_SQL } from "./oneMinute.js";
import { CANDLES_5M_SQL } from "./fiveMinute.js";
import { CANDLES_15M_SQL } from "./fifteenMinute.js";
import { CANDLES_30M_SQL } from "./thirtyMinute.js";
import { CANDLES_1H_SQL } from "./oneHour.js";
import { CANDLES_1D_SQL } from "./oneDay.js";

export const CANDLE_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "1d"] as const;
export type CandleTimeframe = (typeof CANDLE_TIMEFRAMES)[number];

export const CANDLE_QUERIES: Record<CandleTimeframe, string> = {
  "1m": CANDLES_1M_SQL,
  "5m": CANDLES_5M_SQL,
  "15m": CANDLES_15M_SQL,
  "30m": CANDLES_30M_SQL,
  "1h": CANDLES_1H_SQL,
  "1d": CANDLES_1D_SQL,
};

export function isCandleTimeframe(value: string): value is CandleTimeframe {
  return (CANDLE_TIMEFRAMES as readonly string[]).includes(value);
}
