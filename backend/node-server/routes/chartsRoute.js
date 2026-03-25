import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

const filePath = path.join(__dirname, "../../cleaned_data.json");

const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

router.get("/candles", (req, res) => {
  try {
    const start = parseInt(req.query.start) || 0;
    const limit = parseInt(req.query.limit) || 200;
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;