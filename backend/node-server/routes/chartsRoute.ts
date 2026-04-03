import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express, { type Request, type Response } from "express";

type Candle = {
  time: number;
  date?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type CandleQuery = {
  start?: string;
  limit?: string;
  backward?: string;
};

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, "../../cleaned_data.json");

const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Candle[];

router.get(
  "/candles",
  (req: Request<Record<string, never>, unknown, unknown, CandleQuery>, res: Response) => {
    try {
      const start = Number.parseInt(req.query.start ?? "0", 10) || 0;
      const limit = Number.parseInt(req.query.limit ?? "200", 10) || 200;
      const backward = req.query.backward === "1";

      const result = data.slice(start, start + limit);
      const nextStart = backward ? Math.max(0, start - limit) : start + limit;
      const hasMore = backward ? start > 0 : start + limit < data.length;

      res.json({
        data: result,
        nextStart,
        hasMore,
        total: data.length,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  },
);

export default router;
