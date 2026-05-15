import cors from "cors";
import express from "express";

import chartsRoutes from "./routes/chartsRoute.js";
import historicalSyncRoutes from "./routes/historicalSyncRoute.js";
import newsRoutes from "./routes/newsRoute.js";
import stocksRoutes from "./routes/stocksRoute.js";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use("/api/charts", chartsRoutes);
app.use("/api/historical", historicalSyncRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/stocks", stocksRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
