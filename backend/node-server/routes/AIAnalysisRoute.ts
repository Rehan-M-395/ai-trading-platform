import express, { type Request, type Response } from "express";
import axios from "axios";
import { getPool } from "../db/pool.js";

const router = express.Router();

router.post(
    "/Sup-Res",
    async (req: Request, res: Response) => {
        try {
            console.log("Node route hit");

            const { stockId, timeframe } = req.body;

            if (!stockId || !timeframe) {
                return res.status(400).json({
                    message: "stockId and timeframe are required",
                });
            }

            console.log("Stock ID:", stockId);
            console.log("Timeframe:", timeframe);

            const pool = getPool();

            let query = "";

            // =========================
            // 1 MINUTE
            // =========================

            if (timeframe === "1m") {
                query = `
          SELECT
            candle_time AS timestamp,
            open,
            high,
            low,
            close,
            volume
          FROM stock_candles
          WHERE stock_id = $1
            AND interval = 'ONE_MINUTE'
          ORDER BY candle_time DESC
          LIMIT 400
        `;
            }

            // =========================
            // 5 MINUTE
            // =========================

            else if (timeframe === "5m") {
                query = `
          WITH minute_data AS (
            SELECT *
            FROM stock_candles
            WHERE stock_id = $1
              AND interval = 'ONE_MINUTE'
            ORDER BY candle_time DESC
            LIMIT 2500
          ),
          grouped AS (
            SELECT
              date_trunc('hour', candle_time)
              + floor(
                  date_part('minute', candle_time) / 5
                ) * interval '5 minutes'
              AS bucket,
              *
            FROM minute_data
          )
          SELECT
            bucket AS timestamp,
            (array_agg(open ORDER BY candle_time ASC))[1] AS open,
            MAX(high) AS high,
            MIN(low) AS low,
            (array_agg(close ORDER BY candle_time DESC))[1] AS close,
            SUM(volume) AS volume
          FROM grouped
          GROUP BY bucket
          ORDER BY bucket DESC
          LIMIT 400
        `;
            }

            // =========================
            // 15 MINUTE
            // =========================

            else if (timeframe === "15m") {
                query = `
          WITH minute_data AS (
            SELECT *
            FROM stock_candles
            WHERE stock_id = $1
              AND interval = 'ONE_MINUTE'
            ORDER BY candle_time DESC
            LIMIT 7500
          ),
          grouped AS (
            SELECT
              date_trunc('hour', candle_time)
              + floor(
                  date_part('minute', candle_time) / 15
                ) * interval '15 minutes'
              AS bucket,
              *
            FROM minute_data
          )
          SELECT
            bucket AS timestamp,
            (array_agg(open ORDER BY candle_time ASC))[1] AS open,
            MAX(high) AS high,
            MIN(low) AS low,
            (array_agg(close ORDER BY candle_time DESC))[1] AS close,
            SUM(volume) AS volume
          FROM grouped
          GROUP BY bucket
          ORDER BY bucket DESC
          LIMIT 400
        `;
            }

            // =========================
            // 30 MINUTE
            // =========================

            else if (timeframe === "30m") {
                query = `
          WITH minute_data AS (
            SELECT *
            FROM stock_candles
            WHERE stock_id = $1
              AND interval = 'ONE_MINUTE'
            ORDER BY candle_time DESC
            LIMIT 15000
          ),
          grouped AS (
            SELECT
              date_trunc('hour', candle_time)
              + floor(
                  date_part('minute', candle_time) / 30
                ) * interval '30 minutes'
              AS bucket,
              *
            FROM minute_data
          )
          SELECT
            bucket AS timestamp,
            (array_agg(open ORDER BY candle_time ASC))[1] AS open,
            MAX(high) AS high,
            MIN(low) AS low,
            (array_agg(close ORDER BY candle_time DESC))[1] AS close,
            SUM(volume) AS volume
          FROM grouped
          GROUP BY bucket
          ORDER BY bucket DESC
          LIMIT 400
        `;
            }

            // =========================
            // 1 HOUR
            // =========================

            else if (timeframe === "1h") {
                query = `
          WITH minute_data AS (
            SELECT *
            FROM stock_candles
            WHERE stock_id = $1
              AND interval = 'ONE_MINUTE'
            ORDER BY candle_time DESC
            LIMIT 30000
          )
          SELECT
            date_trunc('hour', candle_time) AS timestamp,
            (array_agg(open ORDER BY candle_time ASC))[1] AS open,
            MAX(high) AS high,
            MIN(low) AS low,
            (array_agg(close ORDER BY candle_time DESC))[1] AS close,
            SUM(volume) AS volume
          FROM minute_data
          GROUP BY date_trunc('hour', candle_time)
          ORDER BY timestamp DESC
          LIMIT 400
        `;
            }

            // =========================
            // INVALID TIMEFRAME
            // =========================

            else {
                return res.status(400).json({
                    message: `Invalid timeframe: ${timeframe}`,
                });
            }

            // Execute query
            const result = await pool.query(query, [stockId]);

            // Convert newest → oldest
            // into oldest → newest
            const candles = result.rows.reverse();

            console.log(
                `Sending ${candles.length} ${timeframe} candles to Python`
            );

            console.log("First candle:", candles[0]);
            console.log("Last candle:", candles[candles.length - 1]);

            // =========================
            // SEND TO PYTHON
            // =========================

            const pythonResponse = await axios.post(
                "http://127.0.0.1:8000/analyse",
                {
                    candles,
                }
            );

            console.log(
                "Python response:",
                pythonResponse.data
            );

            // Return analysis to frontend
            return res.json({
                ...pythonResponse.data,
                timeframe,
                candleCount: candles.length,
            });

        } catch (error) {
            console.error("Error:", error);

            return res.status(500).json({
                message: "Analysis failed",
            });
        }
    }
);

export default router;