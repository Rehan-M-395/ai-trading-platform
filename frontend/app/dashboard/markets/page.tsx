"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  type UTCTimestamp,
} from "lightweight-charts";

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export default function MarketsPage() {
  const chartRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!chartRef.current) return;

    // ✅ Create chart
    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: "#0f172a" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      timeScale: {
        timeVisible: true,
      },
    });

    // ✅ Create candlestick series (v5 API)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    // ✅ Fetch data from backend
    fetch("http://localhost:5000/api/charts/candles")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch data");
        return res.json();
      })
      .then((json) => {
        // 🔥 FIX: use candles (not data)
        const raw = json.candles || [];

        // ✅ Format data (time already in seconds)
        const formatted = raw.map((d: CandleData) => ({
          time: d.time as UTCTimestamp,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }));

        if (formatted.length === 0) {
          throw new Error("No data received");
        }

        // ✅ Set chart data
        candleSeries.setData(formatted);
        chart.timeScale().fitContent();

        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });

    // ✅ Cleanup
    return () => {
      chart.remove();
    };
  }, []);

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white">
      <h1 className="text-xl mb-4">Candlestick Chart</h1>

      <div className="relative w-full h-[500px] border border-slate-800 rounded-xl">
        <div ref={chartRef} className="w-full h-full" />

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            Loading chart...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}