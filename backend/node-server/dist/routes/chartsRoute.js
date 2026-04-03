import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, "../../cleaned_data.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
router.get("/candles", (req, res) => {
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: message });
    }
});
export default router;
