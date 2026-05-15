import express, { type Request, type Response } from "express";

import { listActiveStocks } from "../services/candleStore.js";

const router = express.Router();

router.get(
  "/",
  async (_req: Request, res: Response) => {
    try {
      const stocks = await listActiveStocks();
      res.json({ data: stocks });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  },
);

export default router;
