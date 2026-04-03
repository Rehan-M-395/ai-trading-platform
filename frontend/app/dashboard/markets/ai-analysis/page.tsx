"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";

import candles from "@/data/candles.json";
import { MarketCandleChart } from "@/components/chart/market-candle-chart";

type Candle = {
  time?: number;
  date?: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

type AnalysisResult = {
  trend: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
  signal: "BUY" | "SELL" | "WAIT";
  confidence: number;
  trendlines: Array<{
    startTime: number;
    startPrice: number;
    endTime: number;
    endPrice: number;
  }>;
  zones: Array<{
    label: string;
    price: number;
    color: string;
  }>;
  signals: Array<{
    time: number;
    price: number;
    label: string;
    color: string;
  }>;
};

const ANALYSIS_CANDLE_WINDOW = 300;

function toUtcTimestamp(candle: Candle): number {
  const ms = candle.date ? new Date(candle.date).getTime() : (candle.time ?? 0) * 1000;
  return Math.floor(ms / 1000);
}

function analyzeCandles(data: Candle[]): AnalysisResult {
  if (data.length < 3) {
    return {
      trend: "SIDEWAYS",
      signal: "WAIT",
      confidence: 0.5,
      trendlines: [],
      zones: [],
      signals: [],
    };
  }

  const lastCandle = data[data.length - 1];
  const prevCandle = data[data.length - 2];
  const recent = data.slice(-100);

  let trend: AnalysisResult["trend"] = "SIDEWAYS";
  if (lastCandle.close > prevCandle.close) trend = "UPTREND";
  if (lastCandle.close < prevCandle.close) trend = "DOWNTREND";

  const signal: AnalysisResult["signal"] =
    trend === "UPTREND" ? "BUY" : trend === "DOWNTREND" ? "SELL" : "WAIT";

  const support = Math.min(...recent.map((candle) => candle.low));
  const resistance = Math.max(...recent.map((candle) => candle.high));
  const start = recent[0];
  const end = recent[recent.length - 1];
  const avgRange =
    recent.reduce((sum, candle) => sum + (candle.high - candle.low), 0) / recent.length;
  const confidenceRaw = 0.62 + Math.min(avgRange / 200, 0.25);

  return {
    trend,
    signal,
    confidence: Number(Math.min(confidenceRaw, 0.9).toFixed(2)),
    trendlines: [
      {
        startTime: toUtcTimestamp(start),
        startPrice: start.low,
        endTime: toUtcTimestamp(end),
        endPrice: end.low,
      },
      {
        startTime: toUtcTimestamp(start),
        startPrice: start.high,
        endTime: toUtcTimestamp(end),
        endPrice: end.high,
      },
    ],
    zones: [
      { label: "Support", price: support, color: "#22c55e" },
      { label: "Resistance", price: resistance, color: "#f97316" },
    ],
    signals: [
      {
        time: toUtcTimestamp(lastCandle),
        price: lastCandle.close,
        label: signal,
        color: signal === "BUY" ? "#22c55e" : signal === "SELL" ? "#fb7185" : "#94a3b8",
      },
    ],
  };
}

export default function AIAnalysisPage() {
  const candleData = candles as Candle[];
  const analysisWindow = useMemo(
    () => candleData.slice(-ANALYSIS_CANDLE_WINDOW),
    [candleData],
  );
  const baseResult = useMemo(() => analyzeCandles(analysisWindow), [analysisWindow]);
  const [result, setResult] = useState<AnalysisResult>(baseResult);
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [apiMessage, setApiMessage] = useState("Waiting for analysis...");

  useEffect(() => {
    let cancelled = false;

    async function fetchTrendlineFromAI() {
      setApiStatus("loading");
      setApiMessage("Running trendline AI...");

      try {
        const payload = analysisWindow.map((candle, index) => ({
          index,
          time: toUtcTimestamp(candle),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));

        const response = await fetch("http://127.0.0.1:5000/trendline", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        console.log(response)

        const json = (await response.json()) as {
          error?: string;
          score?: number;
          trendline?: {
            start: { time: number; price: number };
            end: { time: number; price: number };
          };
        };

        if (!response.ok || !json.trendline) {
          throw new Error(json.error ?? "Trendline API failed");
        }
        const trendline = json.trendline;

        if (cancelled) return;

        setResult((prev) => ({
          ...prev,
          confidence:
            typeof json.score === "number"
              ? Number(Math.max(0.4, Math.min(0.95, (json.score + 30) / 100)).toFixed(2))
              : prev.confidence,
          trendlines: [
            {
              startTime: trendline.start.time,
              startPrice: trendline.start.price,
              endTime: trendline.end.time,
              endPrice: trendline.end.price,
            },
          ],
        }));
        setApiStatus("ok");
        setApiMessage("Trendline drawn from Python AI API.");
      } catch (error) {
        if (cancelled) return;
        setApiStatus("error");
        setApiMessage(error instanceof Error ? error.message : "Failed to fetch AI trendline");
        // Keep UI functional with local fallback analysis.
        setResult(baseResult);
      }
    }

    void fetchTrendlineFromAI();

    return () => {
      cancelled = true;
    };
  }, [analysisWindow, baseResult]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#06030b_0%,#020106_100%)] px-4 py-5 text-white md:px-6">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/markets"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-slate-500">AI Workspace</p>
              <h1 className="mt-1 font-display text-2xl font-semibold">RELIANCE AI Analysis</h1>
            </div>
          </div>
          <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-2 text-xs text-fuchsia-200">
            Read-only AI Mode
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <MarketCandleChart data={candleData} mode="ai" analysis={result} />

          <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-xl bg-fuchsia-400/10 p-2 text-fuchsia-200">
                <Bot className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold">AI Analysis</h3>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-slate-300">
                Trend: <span className="font-semibold text-white">{result.trend}</span>
              </p>
              <p className="text-slate-300">
                Signal: <span className="font-semibold text-white">{result.signal}</span>
              </p>
              <p className="text-slate-300">
                Confidence:{" "}
                <span className="font-semibold text-white">
                  {(result.confidence * 100).toFixed(0)}%
                </span>
              </p>
            </div>
            <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs leading-6 text-slate-400">
              Trendlines and support/resistance overlays are auto-generated from the same JSON
              candles used by the chart and can later be swapped to backend AI responses.
            </div>
            <div
              className={`mt-3 rounded-xl border p-3 text-xs ${
                apiStatus === "error"
                  ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                  : apiStatus === "ok"
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 bg-white/[0.03] text-slate-300"
              }`}
            >
              {apiMessage}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              AI input window: last {ANALYSIS_CANDLE_WINDOW} candles.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}
