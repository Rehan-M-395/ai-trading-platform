import express, { type Request, type Response } from "express";
import { type AngelExchange, type AngelInterval } from "../services/angelHistoricalService.js";
import { getStoredCandles } from "../services/candleStore.js";

type CandleQuery = {
  start?: string;
  limit?: string;
  backward?: string;
  exchange?: string;
  symboltoken?: string;
  interval?: string;
};

const router = express.Router();

router.get(
  "/candles",
  async (req: Request<Record<string, never>, unknown, unknown, CandleQuery>, res: Response) => {
    try {
      const start = Number.parseInt(req.query.start ?? "0", 10) || 0;
      const limit = Number.parseInt(req.query.limit ?? "200", 10) || 200;
      const backward = req.query.backward === "1";
      const exchange = (req.query.exchange ?? process.env.DEFAULT_EXCHANGE ?? "NSE") as AngelExchange;
      const symbolToken = req.query.symboltoken ?? process.env.DEFAULT_SYMBOL_TOKEN;
      const interval = (req.query.interval ?? process.env.DEFAULT_INTERVAL ?? "FIFTEEN_MINUTE") as AngelInterval;

      if (!symbolToken) {
        return res.status(400).json({ error: "Missing symboltoken query or DEFAULT_SYMBOL_TOKEN env" });
      }

      const readStart = backward ? Math.max(0, start - limit) : start;
      const { rows, total } = await getStoredCandles({
        exchange,
        symbolToken,
        interval,
        start: readStart,
        limit,
      });

      const nextStart = backward ? Math.max(0, readStart - limit) : readStart + limit;
      const hasMore = backward ? readStart > 0 : readStart + limit < total;

      res.json({
        data: rows,
        nextStart,
        hasMore,
        total,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  },
);

export default router;
