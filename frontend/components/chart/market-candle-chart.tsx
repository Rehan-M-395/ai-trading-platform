"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

type Candle = {
  time?: number;
  date?: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

type Trendline = {
  startTime: number;
  startPrice: number;
  endTime: number;
  endPrice: number;
};

type Zone = {
  label: string;
  price: number;
  color: string;
};

type Signal = {
  time: number;
  price: number;
  label: string;
  color: string;
};

type AIAnalysis = {
  trendlines: Trendline[];
  zones: Zone[];
  signals: Signal[];
};

type MarketCandleChartProps = {
  data: Candle[];
  mode?: "manual" | "ai";
  analysis?: AIAnalysis;
};

function toUtcTimestamp(candle: Candle): UTCTimestamp {
  const ms = candle.date ? new Date(candle.date).getTime() : (candle.time ?? 0) * 1000;
  return Math.floor(ms / 1000) as UTCTimestamp;
}

export function MarketCandleChart({
  data,
  mode = "manual",
  analysis,
}: MarketCandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const trendlineSeriesRefs = useRef<Array<ISeriesApi<"Line">>>([]);
  const signalMarkerRef = useRef<ReturnType<typeof createSeriesMarkers<UTCTimestamp>> | null>(null);

  const normalized = useMemo(
    () =>
      data.map((candle) => ({
        time: toUtcTimestamp(candle),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
    [data],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: Math.max(container.clientWidth, 520),
      height: Math.max(container.clientHeight, 420),
      layout: {
        background: { color: "transparent" },
        textColor: "#94a3b8",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.08)" },
        horzLines: { color: "rgba(148,163,184,0.08)" },
      },
      rightPriceScale: { borderColor: "rgba(148,163,184,0.14)" },
      timeScale: {
        borderColor: "rgba(148,163,184,0.14)",
        timeVisible: true,
        secondsVisible: false,
      },
      // AI mode is read-only: no drawing/click tools attached.
      handleScroll: true,
      handleScale: true,
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#fb7185",
      borderUpColor: "#22c55e",
      borderDownColor: "#fb7185",
      wickUpColor: "#22c55e",
      wickDownColor: "#fb7185",
      lastValueVisible: true,
      priceLineColor: mode === "ai" ? "#60a5fa" : "#d946ef",
    });

    chartRef.current = chart;
    candleSeriesRef.current = candles;
    signalMarkerRef.current = createSeriesMarkers(
      candles,
      [],
    ) as ReturnType<typeof createSeriesMarkers<UTCTimestamp>>;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      chart.applyOptions({
        width: Math.max(entry.contentRect.width, 520),
        height: Math.max(entry.contentRect.height, 420),
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      trendlineSeriesRefs.current = [];
      signalMarkerRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    const chart = chartRef.current;
    const candles = candleSeriesRef.current;
    if (!chart || !candles) return;

    candles.setData(normalized);
    chart.timeScale().fitContent();
  }, [normalized]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    for (const series of trendlineSeriesRefs.current) {
      chart.removeSeries(series);
    }
    trendlineSeriesRefs.current = [];

    if (mode !== "ai" || !analysis) return;

    for (const line of analysis.trendlines) {
      const series = chart.addSeries(LineSeries, {
        color: "#60a5fa",
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      series.setData([
        {
          time: line.startTime as UTCTimestamp,
          value: line.startPrice,
        },
        {
          time: line.endTime as UTCTimestamp,
          value: line.endPrice,
        },
      ]);
      trendlineSeriesRefs.current.push(series);
    }

    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;

    for (const zone of analysis.zones) {
      candleSeries.createPriceLine({
        price: zone.price,
        color: zone.color,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: zone.label,
      });
    }

    const signalMarker = signalMarkerRef.current;
    if (signalMarker) {
      signalMarker.setMarkers(
        analysis.signals.map((signal) => ({
          time: signal.time as UTCTimestamp,
          position: signal.label === "SELL" ? "aboveBar" : "belowBar",
          color: signal.color,
          shape: signal.label === "SELL" ? "arrowDown" : "arrowUp",
          text: signal.label,
        })),
      );
    }
  }, [analysis, mode]);

  return (
    <div className="relative min-h-[560px] w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/45">
      <div ref={containerRef} className="h-[620px] w-full" />
    </div>
  );
}
