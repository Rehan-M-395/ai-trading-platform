import path from "node:path";
import { fileURLToPath } from "node:url";

import axios from "axios";
import dotenv from "dotenv";
import express, { type Request, type Response } from "express";

type NewsQuery = {
  symbol?: string;
};

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const API_KEY = process.env.MARKETAUX_API_KEY;

router.get(
  "/marketNews",
  async (
    req: Request<Record<string, never>, unknown, unknown, NewsQuery>,
    res: Response,
  ) => {
    try {
      if (!API_KEY) {
        return res.status(500).json({ error: "API key missing" });
      }

      const symbol = req.query.symbol;
      const params: Record<string, string | number | boolean> = {
        language: "en",
        limit: 10,
        api_token: API_KEY,
      };

      if (symbol) {
        params.symbols = symbol;
        params.filter_entities = true;
      }

      const response = await axios.get("https://api.marketaux.com/v1/news/all", { params });

      return res.json({ data: response.data.data });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error("Error fetching news:", error.response?.data ?? error.message);
      } else {
        console.error("Error fetching news:", error);
      }
      return res.status(500).json({ error: "Failed to fetch news" });
    }
  },
);

export default router;
