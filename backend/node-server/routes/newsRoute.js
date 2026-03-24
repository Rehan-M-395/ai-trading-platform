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

router.get("/news", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: "API key missing" });
    }

    const url = `https://api.marketaux.com/v1/news/all`;

    const response = await axios.get(url, {
      params: {
        symbols: "TCS.NS,RELIANCE.NS",
        language: "en",
        api_token: API_KEY,
      },
    });

    const newsData = response.data.data;

    newsData.forEach((news, index) => {
      console.log(`\n📰 News ${index + 1}`);
      console.log("Title:", news.title);
      console.log("Sentiment:", news.sentiment);
      console.log("Source:", news.source);
      console.log("URL:", news.url);
    });

    res.json({ data: newsData });

  } catch (error) {
    console.error("Error fetching news:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

export default router;