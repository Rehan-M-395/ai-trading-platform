import type { Request, Response } from "express";

import { fetchCandles, assertActiveStock } from "../services/candlesQueryService.js";
import { isCandleTimeframe } from "../sql/candles/index.js";

type CandlesQuery = {
  stockId?: string;
  tf?: string;
  start?: string;
  limit?: string;
  from?: string;
  to?: string;
};

export async function getCandles(req: Request<unknown, unknown, unknown, CandlesQuery>, res: Response) {
  const stockIdRaw = req.query.stockId;
  const tf = (req.query.tf ?? "5m").toLowerCase();
  const start = Number.parseInt(req.query.start ?? "0", 10) || 0;
  const limit = Number.parseInt(req.query.limit ?? "200", 10) || 200;

  console.log("[candles] GET", { stockId: stockIdRaw, tf, start, limit, from: req.query.from, to: req.query.to });

  try {
    const stockId = Number.parseInt(stockIdRaw ?? "", 10);
    if (!Number.isFinite(stockId) || stockId < 1) {
      console.warn("[candles] invalid stockId", stockIdRaw);
      return res.status(400).json({ error: "Invalid or missing stockId (positive integer)." });
    }

    if (!isCandleTimeframe(tf)) {
      console.warn("[candles] invalid tf", tf);
      return res.status(400).json({
        error: `Invalid tf. Use one of: 1m, 5m, 15m, 30m, 1h, 1d.`,
      });
    }

    const exists = await assertActiveStock(stockId);
    if (!exists) {
      console.warn("[candles] stock not found", stockId);
      return res.status(404).json({ error: "Stock not found or inactive." });
    }

    const { data, total, nextStart, hasMore } = await fetchCandles({
      stockId,
      tf,
      start,
      limit,
      from: req.query.from,
      to: req.query.to,
    });

    console.log("[candles] OK", { stockId, tf, total, returned: data.length, nextStart, hasMore });

    return res.json({
      data,
      nextStart,
      hasMore,
      total,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[candles] error", { stockId: stockIdRaw, tf, start, limit, message, error });
    if (message.includes("DATABASE_URL") || message.includes("Set DATABASE_URL")) {
      return res.status(503).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
}
