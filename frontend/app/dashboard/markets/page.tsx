"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  AreaSeries,
  CandlestickSeries,
  type CandlestickData,
  type HistogramData,
  HistogramSeries,
  LineSeries,
  type MouseEventParams,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  ArrowLeft,
  CandlestickChart,
  Crosshair,
  Maximize2,
  Move3D,
  Search,
  Settings2,
  Sparkles,
  TrendingUp,
  Waves,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { getStoredUser, type StoredUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

type CandleData = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type ChartPoint = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type IntervalOption = {
  label: string;
  groupBy: number | "day" | "month";
};

const intervalOptions: IntervalOption[] = [
  { label: "15m", groupBy: 1 },
  { label: "30m", groupBy: 2 },
  { label: "1H", groupBy: 4 },
  { label: "1D", groupBy: "day" },
  { label: "1M", groupBy: "month" },
];

const sidebarTools = [
  { label: "Crosshair", icon: Crosshair },
  { label: "Trend", icon: TrendingUp },
  { label: "Pattern", icon: Waves },
  { label: "Layout", icon: Maximize2 },
  { label: "Trade", icon: Move3D },
];

const indicatorOptions = [
  { label: "SMA 20", key: "sma" },
  { label: "EMA 50", key: "ema" },
  { label: "Volume", key: "volume" },
  { label: "Trend Area", key: "area" },
];

function simpleMovingAverage(data: ChartPoint[], period: number) {
  return data
    .map((point, index) => {
      if (index + 1 < period) {
        return null;
      }

      const slice = data.slice(index - period + 1, index + 1);
      const total = slice.reduce((sum, item) => sum + item.close, 0);

      return { time: point.time, value: Number((total / period).toFixed(2)) };
    })
    .filter((value): value is { time: UTCTimestamp; value: number } => value !== null);
}

function exponentialMovingAverage(data: ChartPoint[], period: number) {
  const multiplier = 2 / (period + 1);
  let ema = data[0]?.close ?? 0;

  return data.map((point, index) => {
    ema = index === 0 ? point.close : (point.close - ema) * multiplier + ema;

    return {
      time: point.time,
      value: Number(ema.toFixed(2)),
    };
  });
}

function buildFallbackVolume(point: CandleData, index: number) {
  const movement = Math.abs(point.close - point.open);
  return Math.round((movement + point.high - point.low) * 12000 + (index + 1) * 180);
}

function formatDateLabel(time: UTCTimestamp) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(Number(time) * 1000));
}

function aggregateChunk(points: ChartPoint[]) {
  const first = points[0];
  const last = points[points.length - 1];

  return {
    time: first.time,
    open: first.open,
    high: Math.max(...points.map((point) => point.high)),
    low: Math.min(...points.map((point) => point.low)),
    close: last.close,
    volume: points.reduce((sum, point) => sum + point.volume, 0),
  } satisfies ChartPoint;
}

function aggregateChartData(data: ChartPoint[], groupBy: IntervalOption["groupBy"]) {
  if (groupBy === 1) {
    return data;
  }

  if (groupBy === "day" || groupBy === "month") {
    const buckets = new Map<string, ChartPoint[]>();

    for (const point of data) {
      const date = new Date(Number(point.time) * 1000);
      const key =
        groupBy === "day"
          ? `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
          : `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
      const bucket = buckets.get(key);

      if (bucket) {
        bucket.push(point);
      } else {
        buckets.set(key, [point]);
      }
    }

    return Array.from(buckets.values()).map(aggregateChunk);
  }

  const aggregated: ChartPoint[] = [];

  for (let index = 0; index < data.length; index += groupBy) {
    const chunk = data.slice(index, index + groupBy);

    if (chunk.length) {
      aggregated.push(aggregateChunk(chunk));
    }
  }

  return aggregated;
}

export default function MarketsPage() {
  const router = useRouter();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  const [user, setUser] = useState<StoredUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [rawChartData, setRawChartData] = useState<ChartPoint[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedInterval, setSelectedInterval] = useState<IntervalOption>(intervalOptions[0]);
  const [showSma, setShowSma] = useState(false);
  const [showEma, setShowEma] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [showArea, setShowArea] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  useEffect(() => {
    const currentUser = getStoredUser();

    if (!currentUser) {
      router.replace("/?auth=login");
      return;
    }

    setUser(currentUser);
    setHydrated(true);
  }, [router]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !hydrated) return;

    const chart = createChart(container, {
      width: Math.max(container.clientWidth, 400),
      height: Math.max(container.clientHeight, 400),
      layout: {
        background: { color: "transparent" },
        textColor: "#94a3b8",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.08)" },
        horzLines: { color: "rgba(148,163,184,0.08)" },
      },
      crosshair: {
        vertLine: {
          color: "rgba(217,70,239,0.28)",
          labelBackgroundColor: "#d946ef",
        },
        horzLine: {
          color: "rgba(217,70,239,0.22)",
          labelBackgroundColor: "#7c3aed",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(148,163,184,0.14)",
      },
      timeScale: {
        borderColor: "rgba(148,163,184,0.14)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#fb7185",
      borderUpColor: "#22c55e",
      borderDownColor: "#fb7185",
      wickUpColor: "#22c55e",
      wickDownColor: "#fb7185",
      priceLineColor: "#d946ef",
      lastValueVisible: true,
    });

    const volume = chart.addSeries(HistogramSeries, {
      color: "rgba(217,70,239,0.20)",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });

    volume.priceScale().applyOptions({
      scaleMargins: {
        top: 0.78,
        bottom: 0,
      },
    });

    const sma = chart.addSeries(LineSeries, {
      color: "#f0abfc",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ema = chart.addSeries(LineSeries, {
      color: "#60a5fa",
      lineWidth: 2,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const area = chart.addSeries(AreaSeries, {
      lineColor: "#8b5cf6",
      topColor: "rgba(139,92,246,0.18)",
      bottomColor: "rgba(139,92,246,0.01)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartApiRef.current = chart;
    candleSeriesRef.current = candles;
    volumeSeriesRef.current = volume;
    smaSeriesRef.current = sma;
    emaSeriesRef.current = ema;
    areaSeriesRef.current = area;

    const handleCrosshairMove = (param: MouseEventParams) => {
      const candleData = param.seriesData.get(candles) as CandlestickData<UTCTimestamp> | undefined;
      const volumeData = param.seriesData.get(volume) as HistogramData<UTCTimestamp> | undefined;

      if (!candleData || !("open" in candleData)) {
        setHoveredPoint(null);
        return;
      }

      setHoveredPoint({
        time: candleData.time,
        open: candleData.open,
        high: candleData.high,
        low: candleData.low,
        close: candleData.close,
        volume: volumeData?.value ?? 0,
      });
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      chart.applyOptions({
        width: Math.max(entry.contentRect.width, 400),
        height: Math.max(entry.contentRect.height, 400),
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
      chartApiRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      smaSeriesRef.current = null;
      emaSeriesRef.current = null;
      areaSeriesRef.current = null;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    setLoading(true);
    setError("");

    fetch("http://localhost:5000/api/charts/candles")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch chart data");
        return res.json();
      })
      .then((json: { data?: CandleData[] }) => {
        const raw = json.data ?? [];

        if (!raw.length) {
          throw new Error("No market data received");
        }

        setRawChartData(
          raw.map((point, index) => ({
            time: point.time as UTCTimestamp,
            open: point.open,
            high: point.high,
            low: point.low,
            close: point.close,
            volume: point.volume ?? buildFallbackVolume(point, index),
          })),
        );
      })
      .catch((err: Error) => {
        setError(err.message ?? "Failed to load data");
        setRawChartData([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [hydrated]);

  useEffect(() => {
    setChartData(aggregateChartData(rawChartData, selectedInterval.groupBy));
  }, [rawChartData, selectedInterval]);

  useEffect(() => {
    const chart = chartApiRef.current;
    const candles = candleSeriesRef.current;
    const volume = volumeSeriesRef.current;
    const sma = smaSeriesRef.current;
    const ema = emaSeriesRef.current;
    const area = areaSeriesRef.current;

    if (!chart || !candles || !volume || !sma || !ema || !area) return;

    candles.setData(chartData);

    const volumeData = chartData.map((point) => ({
      time: point.time,
      value: point.volume,
      color:
        point.close >= point.open
          ? "rgba(34,197,94,0.42)"
          : "rgba(251,113,133,0.38)",
    }));
    volume.setData(volumeData);
    volume.applyOptions({ visible: showVolume });

    sma.setData(simpleMovingAverage(chartData, 20));
    sma.applyOptions({ visible: showSma });

    ema.setData(exponentialMovingAverage(chartData, 50));
    ema.applyOptions({ visible: showEma });

    const areaData = chartData.map((point) => ({
      time: point.time,
      value: point.close,
    }));
    area.setData(areaData);
    area.applyOptions({ visible: showArea });

    chart.timeScale().fitContent();
  }, [chartData, showArea, showEma, showSma, showVolume]);

  const marketSnapshot = useMemo(() => {
    const latest = chartData[chartData.length - 1];
    const previous = chartData[chartData.length - 2];
    const delta = latest && previous ? latest.close - previous.close : 0;
    const deltaPct = previous?.close ? (delta / previous.close) * 100 : 0;

    return {
      price: latest ? latest.close.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "--",
      change: `${delta >= 0 ? "+" : ""}${deltaPct.toFixed(2)}%`,
      high: latest ? latest.high.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "--",
      low: latest ? latest.low.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "--",
    };
  }, [chartData]);

  const activePoint = hoveredPoint ?? chartData[chartData.length - 1] ?? null;

  if (!hydrated || !user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#06030b]">
        <div className="glass-panel rounded-3xl px-6 py-4 text-sm text-slate-300">
          Loading chart workspace...
        </div>
      </div>
    );
  }

  return (
    <main className="fixed inset-0 flex overflow-hidden bg-[linear-gradient(180deg,#06030b_0%,#020106_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.18),transparent_22%),radial-gradient(circle_at_top_right,rgba(236,72,153,0.12),transparent_24%),linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[length:auto,auto,44px_44px,44px_44px] opacity-70" />

      <aside className="relative z-10 hidden w-[88px] shrink-0 border-r border-white/10 bg-slate-950/70 px-3 py-4 backdrop-blur-xl lg:flex lg:flex-col lg:justify-between">
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-fuchsia-400/20 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {sidebarTools.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className="group flex w-full flex-col items-center gap-2 rounded-2xl border border-transparent bg-white/[0.02] px-2 py-3 text-slate-400 transition hover:border-fuchsia-400/15 hover:bg-white/[0.05] hover:text-white"
              type="button"
            >
              <Icon className="h-4 w-4 text-fuchsia-300/85 transition group-hover:text-fuchsia-200" />
              <span className="text-[10px] uppercase tracking-[0.24em]">{label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2 rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Indicators</p>
          {indicatorOptions.map((option) => {
            const active =
              (option.key === "sma" && showSma) ||
              (option.key === "ema" && showEma) ||
              (option.key === "volume" && showVolume) ||
              (option.key === "area" && showArea);

            return (
              <button
                key={option.key}
                className={cn(
                  "w-full rounded-xl border px-2 py-2 text-left text-[11px] font-medium transition",
                  active
                    ? "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200"
                    : "border-white/10 bg-transparent text-slate-400 hover:text-white",
                )}
                onClick={() => {
                  if (option.key === "sma") setShowSma((value) => !value);
                  if (option.key === "ema") setShowEma((value) => !value);
                  if (option.key === "volume") setShowVolume((value) => !value);
                  if (option.key === "area") setShowArea((value) => !value);
                }}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </aside>

      <section className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-white/10 bg-slate-950/55 px-4 py-2 backdrop-blur-xl md:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200">
                <CandlestickChart className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-2xl font-semibold text-white">RELIANCE</h1>
                  <span className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                    {marketSnapshot.change}
                  </span>
                  <span className="text-sm text-slate-400">NSE</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Rs. {marketSnapshot.price} | H {marketSnapshot.high} | L {marketSnapshot.low}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-[220px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  className="h-11 rounded-xl border-white/10 bg-white/[0.03] pl-11 focus:border-fuchsia-400/40 focus:ring-fuchsia-400/20"
                  placeholder="Search symbol"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {intervalOptions.map((option) => (
                  <button
                    key={option.label}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition",
                      selectedInterval.label === option.label
                        ? "border-fuchsia-400/25 bg-fuchsia-400/12 text-fuchsia-200"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white",
                    )}
                    onClick={() => setSelectedInterval(option)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <button
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:text-white"
                type="button"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-950/35 px-4 py-1.5 md:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-fuchsia-400/15 bg-fuchsia-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-fuchsia-200">
                  Fullscreen Chart
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                  AI Bias: Bullish
                </span>
              </div>

              <div className="hidden items-center gap-2 md:flex">
                {showSma ? (
                  <span className="rounded-full bg-fuchsia-400/10 px-3 py-1 text-xs text-fuchsia-200">
                    SMA 20
                  </span>
                ) : null}
                {showEma ? (
                  <span className="rounded-full bg-sky-400/10 px-3 py-1 text-xs text-sky-200">
                    EMA 50
                  </span>
                ) : null}
                {showVolume ? (
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                    Volume
                  </span>
                ) : null}
              </div>
            </div>

            <div className="relative min-h-0 flex-1">
              <div
                ref={chartContainerRef}
                className="absolute inset-0 w-full"
              />

              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 text-sm text-slate-400 backdrop-blur-sm">
                  Loading market data...
                </div>
              ) : null}

              {error ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/65 px-6 text-center text-sm text-rose-300 backdrop-blur-sm">
                  {error}
                </div>
              ) : null}

              <div className="pointer-events-none absolute left-4 top-4 hidden md:block">
                <div className="flex items-stretch gap-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-xl">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Session</p>
                    <p className="mt-2 text-xl font-semibold text-white">Rs. {marketSnapshot.price}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
                      Adaptive chart workspace
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-xl">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                      {hoveredPoint ? "Hovered Candle" : "Latest Candle"}
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {activePoint ? formatDateLabel(activePoint.time) : "--"}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <span className="text-slate-300">
                        O{" "}
                        <span className="font-semibold text-white">
                          {activePoint?.open.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "--"}
                        </span>
                      </span>
                      <span className="text-slate-300">
                        H{" "}
                        <span className="font-semibold text-emerald-300">
                          {activePoint?.high.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "--"}
                        </span>
                      </span>
                      <span className="text-slate-300">
                        L{" "}
                        <span className="font-semibold text-rose-300">
                          {activePoint?.low.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "--"}
                        </span>
                      </span>
                      <span className="text-slate-300">
                        C{" "}
                        <span className="font-semibold text-white">
                          {activePoint?.close.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "--"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
