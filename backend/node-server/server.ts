import cors from "cors";
import express from "express";

import chartsRoutes from "./routes/chartsRoute.js";
import newsRoutes from "./routes/newsRoute.js";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use("/api/charts", chartsRoutes);
app.use("/api/news", newsRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
