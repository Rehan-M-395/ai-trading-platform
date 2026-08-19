import express, { type Request, type Response } from "express";
import axios from "axios";

const router = express.Router();

router.post(
    "/Sup-Res",
    async (req: Request, res: Response) => {
        try {
            console.log("Node route hit");

            // Get data sent from frontend
            const { symbol, timeframe } = req.body;

            // Temporary candle data
            const candles = [
                {
                    timestamp: "2026-08-19T10:00:00Z",
                    open: 100,
                    high: 105,
                    low: 98,
                    close: 103,
                    volume: 1000
                },
                {
                    timestamp: "2026-08-19T10:05:00Z",
                    open: 103,
                    high: 108,
                    low: 102,
                    close: 106,
                    volume: 1500
                }
            ];

            // Send request to Python server
            const pythonResponse = await axios.post(
                "http://127.0.0.1:8000/analyse",
                {
                    candles
                }
            );

            console.log("Python response:", pythonResponse.data);

            // Send Python response back to frontend
            return res.json(pythonResponse.data);

        } catch (error) {
            console.error("Error:", error);

            return res.status(500).json({
                message: "Analysis failed"
            });
        }
    }
);

export default router;