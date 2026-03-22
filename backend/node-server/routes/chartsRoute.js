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
    const limit = parseInt(req.query.limit) || 500;
        const result = data.slice(-limit);
        res.json({ "candles": result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/test', (req, res) => {
    res.json({ message: 'Hello World' });
})

export default router;