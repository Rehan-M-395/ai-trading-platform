import express, { type Request, type Response } from "express";
import axios from "axios";

import { fetchCandles } from "../services/candlesQueryService.js";
import { isCandleTimeframe, type CandleTimeframe } from "../sql/candles/index.js";

const router = express.Router();

type AnalysisCandle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function isAnalysisCandle(value: unknown): value is AnalysisCandle {
  if (!value || typeof value !== "object") return false;
  const candle = value as Partial<AnalysisCandle>;
  return (
    typeof candle.timestamp === "string" &&
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(candle.timestamp) &&
    Number.isFinite(Date.parse(candle.timestamp)) &&
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close) &&
    Number.isFinite(candle.volume)
  );
}

router.post("/Sup-Res", async (req: Request, res: Response) => {
  try {
    const stockId = Number(req.body.stockId);
    const timeframe = String(req.body.timeframe ?? "5m").toLowerCase();

    if (!Number.isInteger(stockId) || stockId < 1 || !isCandleTimeframe(timeframe)) {
      return res.status(400).json({
        message: "A valid stockId and timeframe (1m, 5m, 15m, 30m, 1h, 1d) are required",
      });
    }

    let candlesForAnalysis: AnalysisCandle[];
    if (req.body.candles !== undefined) {
      const submitted = req.body.candles as unknown;
      if (
        !Array.isArray(submitted) ||
        submitted.length === 0 ||
        submitted.length > 4000 ||
        !submitted.every(isAnalysisCandle) ||
        submitted.some((candle, index) =>
          index > 0 && Date.parse(candle.timestamp) <= Date.parse(submitted[index - 1].timestamp),
        )
      ) {
        return res.status(400).json({
          message: "candles must be 1–4000 valid, chronologically ordered candles with timezone-aware timestamps",
        });
      }
      candlesForAnalysis = submitted;
    } else {
      const metadata = await fetchCandles({
        stockId,
        tf: timeframe as CandleTimeframe,
        start: 0,
        limit: 1,
      });
      const storedCandles = await fetchCandles({
        stockId,
        tf: timeframe as CandleTimeframe,
        start: Math.max(0, metadata.total - 400),
        limit: 400,
      });
      candlesForAnalysis = storedCandles.data.map((candle) => ({
        timestamp: candle.candle_time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }));
    }

    const pythonResponse = await axios.post("http://127.0.0.1:8000/analyse", {
      candles: candlesForAnalysis,
    });

    return res.json({
      ...pythonResponse.data,
      timeframe,
      candleCount: candlesForAnalysis.length,
    });
  } catch (error) {
    console.error("Analysis failed:", error);
    return res.status(500).json({ message: "Analysis failed" });
  }
});

export default router;
