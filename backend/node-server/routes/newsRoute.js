import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const router = express.Router();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env correctly
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Get API key
const API_KEY = process.env.MARKETAUX_API_KEY;
console.log("API KEY:", API_KEY);

router.get("/marketNews", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: "API key missing" });
    }

    let { symbol } = req.query;

    const params = {
      language: "en",
      limit: 10,
      api_token: API_KEY,
    };

    if (symbol) {
      params.symbols = symbol;
      params.filter_entities = true; 
    }

    const response = await axios.get(
      "https://api.marketaux.com/v1/news/all",
      { params }
    );

    res.json({ data: response.data.data });

  } catch (error) {
    console.error("Error fetching news:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

export default router;