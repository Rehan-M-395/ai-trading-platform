import express, { type Request, type Response } from "express";

import {
  fetchAngelHistoricalCandles,
  type AngelExchange,
  type AngelHistoricalRequest,
  type AngelInterval,
} from "../services/angelHistoricalService.js";
import { mapAngelCandleToRow, upsertCandles } from "../services/candleStore.js";

const router = express.Router();

router.post(
  "/candles",
  async (
    req: Request<Record<string, never>, unknown, AngelHistoricalRequest>,
    res: Response,
  ) => {
    try {
      const { exchange, symboltoken, interval, fromdate, todate } = req.body;

      if (!exchange || !symboltoken || !interval || !fromdate || !todate) {
        return res.status(400).json({
          error: "exchange, symboltoken, interval, fromdate, and todate are required",
        });
      }

      const candles = await fetchAngelHistoricalCandles({
        exchange: exchange as AngelExchange,
        symboltoken,
        interval: interval as AngelInterval,
        fromdate,
        todate,
      });

      const rows = candles.map((candle) =>
        mapAngelCandleToRow(exchange as AngelExchange, symboltoken, interval as AngelInterval, candle),
      );

      const inserted = await upsertCandles(rows);

      return res.json({
        status: true,
        inserted,
        fetched: candles.length,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  },
);

export default router;
