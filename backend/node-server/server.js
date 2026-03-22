import express from "express";
import cors from "cors";
import chartsRoutes from "./routes/chartsRoute.js";
const app = express();

app.use(cors());
app.use(express.json());

// routes
app.use("/api/charts", chartsRoutes);

app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});