import cors from "cors";
import express from "express";
import candlesRoutes from "./routes/candlesRoute.js";
import historicalSyncRoutes from "./routes/historicalSyncRoute.js";
import newsRoutes from "./routes/newsRoute.js";
import stocksRoutes from "./routes/stocksRoute.js";
import AIAnalysis from "./routes/AIAnalysisRoute.js";
const app = express();
const PORT = 5000;
app.use(cors());
app.use(express.json());
app.use("/api/candles", candlesRoutes);
app.use("/api/historical", historicalSyncRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/stocks", stocksRoutes);
app.use("/api/analysis", AIAnalysis);
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
