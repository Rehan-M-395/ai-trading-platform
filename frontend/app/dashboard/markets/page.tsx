"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  createSeriesMarkers,
} from "lightweight-charts";
import {
  ArrowLeft,
  CandlestickChart,
  Crosshair,
  Maximize2,
  Move3D,
  Pause,
  Play,
  Search,
  Settings2,
  SkipBack,
  SkipForward,
  Sparkles,
  TrendingUp,
  Waves,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { getStoredUser, type StoredUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useReplay } from "../../../components/hooks/useReplay";
 
type CandleData = {
  time: number;
  date?: string;
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

type ChartTf = "1m" | "5m" | "15m" | "30m" | "1h" | "1d";

type IntervalOption = {
  label: string;
  tf: ChartTf;
};

const intervalOptions: IntervalOption[] = [
  { label: "1m", tf: "1m" },
  { label: "5m", tf: "5m" },
  { label: "15m", tf: "15m" },
  { label: "30m", tf: "30m" },
  { label: "1H", tf: "1h" },
  { label: "1D", tf: "1d" },
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

const PAGE_LIMIT = 200;
const INITIAL_LIMIT = 300;
const LOAD_MORE_THRESHOLD = 50;

type CandleResponse = {
  data?: CandleData[];
  nextStart?: number;
  hasMore?: boolean;
  total?: number;
};

type StockMeta = {
  id: number;
  exchange: string;
  symbol_token: string;
  trading_symbol: string;
  name: string | null;
};

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

function toChartTimestamp(point: CandleData): UTCTimestamp {
  const timestampMs = point.date
    ? new Date(point.date).getTime()
    : Number(point.time) * 1000;

  return Math.floor(timestampMs / 1000) as UTCTimestamp;
}

function buildCandlesUrl(
  apiUrl: string,
  stockId: number,
  tf: ChartTf,
  opts: { start?: number; limit?: number },
) {
  const params = new URLSearchParams();
  params.set("stockId", String(stockId));
  params.set("tf", tf);
  if (opts.start !== undefined) {
    params.set("start", String(opts.start));
  }
  if (opts.limit !== undefined) {
    params.set("limit", String(opts.limit));
  }
  return `${apiUrl}/api/candles?${params.toString()}`;
}

async function fetchCandlesJson(url: string, label: string): Promise<CandleResponse> {
  console.log(`[chart] ${label} → GET`, url);
  const res = await fetch(url);
  const text = await res.text();
  let json: CandleResponse & { error?: string };
  try {
    json = text ? (JSON.parse(text) as CandleResponse & { error?: string }) : {};
  } catch {
    console.error(`[chart] ${label} invalid JSON`, { status: res.status, bodyPreview: text.slice(0, 500) });
    throw new Error(`${label}: invalid response (${res.status})`);
  }
  console.log(`[chart] ${label} ←`, {
    status: res.status,
    ok: res.ok,
    total: json.total,
    dataLength: json.data?.length ?? 0,
    nextStart: json.nextStart,
    hasMore: json.hasMore,
    error: json.error,
  });
  if (!res.ok) {
    throw new Error(json.error ?? `${label} failed (${res.status})`);
  }
  return json;
}

function isSameUtcSession(left: UTCTimestamp, right: UTCTimestamp): boolean {
  const leftDate = new Date(Number(left) * 1000);
  const rightDate = new Date(Number(right) * 1000);

  return (
    leftDate.getUTCFullYear() === rightDate.getUTCFullYear() &&
    leftDate.getUTCMonth() === rightDate.getUTCMonth() &&
    leftDate.getUTCDate() === rightDate.getUTCDate()
  );
}

function addSessionBreaks<T extends { time: UTCTimestamp }>(
  data: T[],
  getValue: (point: T) => number,
) {
  const result: Array<{ time: UTCTimestamp; value: number } | { time: UTCTimestamp }> = [];

  for (let index = 0; index < data.length; index += 1) {
    const point = data[index];
    const nextPoint = data[index + 1];

    result.push({
      time: point.time,
      value: getValue(point),
    });

    if (nextPoint && !isSameUtcSession(point.time, nextPoint.time)) {
      result.push({
        time: (Number(point.time) + 60) as UTCTimestamp,
      });
    }
  }

  return result;
}

function formatDateLabel(time: UTCTimestamp) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(Number(time) * 1000));
}

function formatChartAxisTime(time: UTCTimestamp) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date(Number(time) * 1000));
}

export default function MarketsPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const replayMarkerRef = useRef<ReturnType<typeof createSeriesMarkers<UTCTimestamp>> | null>(
    null,
  );
  const isSelectingReplayRef = useRef(false);
  const stopReplayRef = useRef<() => void>(() => {});

  const [user, setUser] = useState<StoredUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [stocks, setStocks] = useState<StockMeta[]>([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [selectedStockToken, setSelectedStockToken] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedInterval, setSelectedInterval] = useState<IntervalOption>(intervalOptions[0]);
  const [showSma, setShowSma] = useState(false);
  const [showEma, setShowEma] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [showArea, setShowArea] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [isSelectingReplay, setIsSelectingReplay] = useState(false);
  const [hoveredTime, setHoveredTime] = useState<UTCTimestamp | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const lastFitKeyRef = useRef<string>("");

  const selectedStock = useMemo(
    () => stocks.find((stock) => stock.symbol_token === selectedStockToken) ?? null,
    [selectedStockToken, stocks],
  );

  const handleAIAnalysis = useCallback(() => {
    if (!selectedStock) return;
    router.push(
      `/dashboard/markets/ai-analysis?exchange=${selectedStock.exchange}&symboltoken=${selectedStock.symbol_token}&symbol=${encodeURIComponent(selectedStock.trading_symbol)}&stockId=${selectedStock.id}`,
    );
  }, [router, selectedStock]);

  useEffect(() => {
    isSelectingReplayRef.current = isSelectingReplay;
  }, [isSelectingReplay]);

  // Replay/backtesting state (drives candle + indicator rendering).
  const {
    isReplay,
    isPlaying,
    currentIndex: replayIndex,
    speed: replaySpeed,
    visibleData,
    play,
    pause,
    stop,
    forward,
    backward,
    setIndex: setReplayIndex,
    setSpeed: setReplaySpeed,
  } = useReplay(chartData);
  const chartDataRef = useRef<ChartPoint[]>([]);
  useEffect(() => {
    chartDataRef.current = chartData;
  }, [chartData]);

  useEffect(() => {
    stopReplayRef.current = stop;
  }, [stop]);

  useEffect(() => {
    setChartData([]);
    setHoveredPoint(null);
    setHoveredTime(null);
    setError("");
    setLoading(Boolean(selectedStock));
    loadedStartsRef.current.clear();
    paginationRef.current = {
      hasMore: false,
      isLoading: false,
      nextStart: 0,
    };
    hasFittedRef.current = false;
    lastFitKeyRef.current = "";
    stopReplayRef.current();
  }, [selectedStock?.symbol_token, selectedInterval.tf]);

  // If replay advances and the hovered candle is no longer in the visible slice,
  // clear the hover overlay to avoid showing stale OHLC values.
  useEffect(() => {
    if (!hoveredPoint) return;
    if (!visibleData.length) {
      setHoveredPoint(null);
      return;
    }
    const first = visibleData[0].time;
    const last = visibleData[visibleData.length - 1].time;
    if (hoveredPoint.time < first || hoveredPoint.time > last) {
      setHoveredPoint(null);
    }
  }, [hoveredPoint, visibleData]);

  const hasFittedRef = useRef(false);
  const loadedStartsRef = useRef<Set<number>>(new Set());
  const paginationRef = useRef({
    hasMore: false,
    isLoading: false,
    nextStart: 0,
  });

  const mapToChartPoints = useCallback((raw: CandleData[]) => {
    const mapped = raw.map((point, index) => {
      const timestamp = toChartTimestamp(point);

      return {
        time: timestamp,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume ?? buildFallbackVolume(point, index),
      } satisfies ChartPoint;
    });
    mapped.sort((a, b) => a.time - b.time);
    return mapped;
  }, []);

  const loadPreviousData = useCallback(async () => {
    const chart = chartApiRef.current;
    const { hasMore, isLoading, nextStart } = paginationRef.current;

    if (!chart || isLoading || !hasMore) return;
    if (isReplay) return; // disable pagination while replay mode is active
    if (loadedStartsRef.current.has(nextStart)) return;
    if (!selectedStock) return;

    paginationRef.current.isLoading = true;
    loadedStartsRef.current.add(nextStart);

    try {
      const url = buildCandlesUrl(apiUrl, selectedStock.id, selectedInterval.tf, {
        start: nextStart,
        limit: PAGE_LIMIT,
      });
      const json = await fetchCandlesJson(url, "loadPrevious");
      const olderRaw = json.data ?? [];

      if (!olderRaw.length) {
        paginationRef.current.hasMore = false;
        return;
      }

      const olderPoints = mapToChartPoints(olderRaw);
      const currentRange = chart.timeScale().getVisibleLogicalRange();
      const shift = olderPoints.length;

      setChartData((previous) => {
        const existingTimes = new Set(previous.map((point) => point.time));
        const uniqueOlder = olderPoints.filter((point) => !existingTimes.has(point.time));
        return uniqueOlder.length ? [...uniqueOlder, ...previous] : previous;
      });

      paginationRef.current.nextStart = json.nextStart ?? nextStart;
      paginationRef.current.hasMore = Boolean(json.hasMore);

      if (currentRange) {
        queueMicrotask(() => {
          const latestChart = chartApiRef.current;
          if (!latestChart) return;
          latestChart.timeScale().setVisibleLogicalRange({
            from: currentRange.from + shift,
            to: currentRange.to + shift,
          });
        });
      }
    } catch (err: unknown) {
      console.error("[chart] loadPrevious failed", {
        stockId: selectedStock.id,
        tf: selectedInterval.tf,
        nextStart,
        err,
      });
      loadedStartsRef.current.delete(nextStart);
      setError(err instanceof Error ? err.message : "Failed to load previous candles");
    } finally {
      paginationRef.current.isLoading = false;
    }
  }, [apiUrl, isReplay, mapToChartPoints, selectedInterval.tf, selectedStock]);

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
    if (!hydrated) return;

    setStockLoading(true);

    (async () => {
      try {
        const response = await fetch(`${apiUrl}/api/stocks`);
        if (!response.ok) {
          throw new Error("Failed to fetch stocks");
        }

        const json = (await response.json()) as { data?: StockMeta[]; error?: string };
        const fetchedStocks = json.data ?? [];
        setStocks(fetchedStocks);

        if (fetchedStocks.length) {
          setSelectedStockToken((current) => current || fetchedStocks[0].symbol_token);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to fetch stocks");
      } finally {
        setStockLoading(false);
      }
    })();
  }, [apiUrl, hydrated]);

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
      localization: {
        timeFormatter: (time: number) => formatDateLabel(time as UTCTimestamp),
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
        tickMarkFormatter: (time: number) => formatChartAxisTime(time as UTCTimestamp),
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
    replayMarkerRef.current = createSeriesMarkers(
      candles,
      [],
    ) as ReturnType<typeof createSeriesMarkers<UTCTimestamp>>;
    setChartReady(true);

    const handleCrosshairMove = (param: MouseEventParams) => {
      if (isSelectingReplayRef.current) {
        setHoveredTime((param.time as UTCTimestamp | undefined) ?? null);
      }

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
      replayMarkerRef.current = null;
      setChartReady(false);
    };
  }, [hydrated, selectedStock?.symbol_token]);

  useEffect(() => {
    if (!hydrated || !selectedStock) return;

    setLoading(true);
    setError("");
    loadedStartsRef.current.clear();
    hasFittedRef.current = false;
    let cancelled = false;

    (async () => {
      try {
        console.log("[chart] initial load", {
          apiUrl,
          stockId: selectedStock.id,
          symbol: selectedStock.trading_symbol,
          tf: selectedInterval.tf,
        });

        const metaUrl = buildCandlesUrl(apiUrl, selectedStock.id, selectedInterval.tf, {
          start: 0,
          limit: 1,
        });
        const metaJson = await fetchCandlesJson(metaUrl, "meta");
        const total = metaJson.total ?? 0;
        if (!total) {
          console.warn("[chart] meta ok but total=0", { stockId: selectedStock.id, tf: selectedInterval.tf });
          throw new Error("No market data received (total=0)");
        }

        const start = Math.max(0, total - INITIAL_LIMIT);
        const dataUrl = buildCandlesUrl(apiUrl, selectedStock.id, selectedInterval.tf, {
          start,
          limit: INITIAL_LIMIT,
        });
        const dataJson = await fetchCandlesJson(dataUrl, "initial");
        const raw = dataJson.data ?? [];
        if (!raw.length) {
          console.warn("[chart] initial ok but empty data", { start, total });
          throw new Error("No market data received (empty data array)");
        }
        if (cancelled) return;

        console.log("[chart] initial load success", {
          points: raw.length,
          firstTime: raw[0]?.time,
          lastTime: raw[raw.length - 1]?.time,
        });
        setChartData(mapToChartPoints(raw));
        paginationRef.current.nextStart = dataJson.nextStart ?? start;
        paginationRef.current.hasMore = Boolean(dataJson.hasMore);
        loadedStartsRef.current.add(start);
      } catch (err: unknown) {
        if (cancelled) return;
        console.error("[chart] initial load failed", {
          stockId: selectedStock.id,
          tf: selectedInterval.tf,
          err,
        });
        setError(err instanceof Error ? err.message : "Failed to load data");
        setChartData([]);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiUrl, hydrated, mapToChartPoints, selectedInterval.tf, selectedStock]);

  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart || !chartReady) return;

    const handleRangeChange = (range: { from: number; to: number } | null) => {
      if (!range) return;
      if (isReplay) return; // disable pagination during replay
      if (range.from < LOAD_MORE_THRESHOLD) {
        void loadPreviousData();
      }
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
    };
  }, [chartReady, isReplay, loadPreviousData]);

  useEffect(() => {
    const replayMarker = replayMarkerRef.current;

    if (!replayMarker) return;

    if (!isSelectingReplay || !hoveredTime) {
      replayMarker.setMarkers([]);
      return;
    }

    replayMarker.setMarkers([
      {
        time: hoveredTime,
        position: "inBar",
        color: "#d946ef",
        shape: "circle",
        text: "Replay",
      },
    ]);
  }, [hoveredTime, isSelectingReplay]);

  // Click only confirms replay start while selection mode is active.
  useEffect(() => {
    const chart = chartApiRef.current;
    if (!chart || !chartReady) return;

    const handleClick = (param: MouseEventParams) => {
      if (!isSelectingReplayRef.current) return;

      const t = param.time as UTCTimestamp | undefined;
      if (!t) return;

      const points = chartDataRef.current;
      if (!points.length) return;

      const idx = points.findIndex((point) => point.time === t);
      if (idx < 0) return;

      setReplayIndex(idx);
      setHoveredTime(t);
      setIsSelectingReplay(false);
      play();
    };

    chart.subscribeClick(handleClick);
    return () => {
      chart.unsubscribeClick(handleClick);
    };
  }, [chartReady, play, setReplayIndex]);

  useEffect(() => {
    const chart = chartApiRef.current;
    const candles = candleSeriesRef.current;
    const volume = volumeSeriesRef.current;
    const sma = smaSeriesRef.current;
    const ema = emaSeriesRef.current;
    const area = areaSeriesRef.current;

    if (!chart || !candles || !volume || !sma || !ema || !area) return;

    candles.setData(visibleData);

    const volumeData = visibleData.map((point) => ({
      time: point.time,
      value: point.volume,
      color:
        point.close >= point.open
          ? "rgba(34,197,94,0.42)"
          : "rgba(251,113,133,0.38)",
    }));
    volume.setData(volumeData);
    volume.applyOptions({ visible: showVolume });

    sma.setData(addSessionBreaks(simpleMovingAverage(visibleData, 20), (point) => point.value));
    sma.applyOptions({ visible: showSma });

    ema.setData(addSessionBreaks(exponentialMovingAverage(visibleData, 50), (point) => point.value));
    ema.applyOptions({ visible: showEma });

    const areaData = addSessionBreaks(visibleData, (point) => point.close);
    area.setData(areaData);
    area.applyOptions({ visible: showArea });

    const fitKey =
      selectedStock != null ? `${selectedStock.symbol_token}:${selectedInterval.tf}` : "";

    if (selectedStock && visibleData.length > 0 && lastFitKeyRef.current !== fitKey) {
      chart.timeScale().fitContent();
      hasFittedRef.current = true;
      lastFitKeyRef.current = fitKey;
      return;
    }

    if (!hasFittedRef.current && visibleData.length > 0) {
      chart.timeScale().fitContent();
      hasFittedRef.current = true;
    }
  }, [selectedStock, selectedInterval.tf, visibleData, showArea, showEma, showSma, showVolume]);

  const marketSnapshot = useMemo(() => {
    const latest = visibleData[visibleData.length - 1];
    const previous = visibleData[visibleData.length - 2];
    const delta = latest && previous ? latest.close - previous.close : 0;
    const deltaPct = previous?.close ? (delta / previous.close) * 100 : 0;

    return {
      price: latest ? latest.close.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "--",
      change: `${delta >= 0 ? "+" : ""}${deltaPct.toFixed(2)}%`,
      high: latest ? latest.high.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "--",
      low: latest ? latest.low.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "--",
    };
  }, [visibleData]);

  const activePoint = hoveredPoint ?? visibleData[visibleData.length - 1] ?? null;
  const filteredStocks = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return stocks;
    }

    return stocks.filter((stock) => {
      const haystack = `${stock.trading_symbol} ${stock.name ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [searchTerm, stocks]);

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
                  <h1 className="font-display text-2xl font-semibold text-white">
                    {selectedStock?.trading_symbol ?? "Select Symbol"}
                  </h1>
                  <span className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                    {marketSnapshot.change}
                  </span>
                  <span className="text-sm text-slate-400">{selectedStock?.exchange ?? "--"}</span>
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
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <select
                className="h-11 min-w-[240px] rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-fuchsia-400/40"
                value={selectedStockToken}
                onChange={(event) => {
                  setSelectedStockToken(event.target.value);
                }}
                disabled={stockLoading || !filteredStocks.length}
              >
                {filteredStocks.length ? (
                  filteredStocks.map((stock) => (
                    <option key={stock.id} value={stock.symbol_token} className="bg-slate-950">
                      {stock.trading_symbol} {stock.name ? `- ${stock.name}` : ""}
                    </option>
                  ))
                ) : (
                  <option value="" className="bg-slate-950">
                    {stockLoading ? "Loading stocks..." : "No stocks found"}
                  </option>
                )}
              </select>

              <div className="flex flex-wrap gap-2">
                {intervalOptions.map((option) => (
                  <button
                    key={option.tf}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition disabled:cursor-not-allowed disabled:opacity-40",
                      selectedInterval.label === option.label
                        ? "border-fuchsia-400/25 bg-fuchsia-400/12 text-fuchsia-200"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white",
                    )}
                    onClick={() => setSelectedInterval(option)}
                    disabled={!selectedStock || isReplay}
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

              <button
                onClick={handleAIAnalysis}
                type="button"
                disabled={!selectedStock}
                className="h-11 rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200 transition hover:border-sky-300/40 hover:bg-sky-500/15"
              >
                AI Analysis
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

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-accent/20 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-accent">
                    Replay
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isReplay) return;
                      if (isPlaying) {
                        pause();
                        return;
                      }
                      play();
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-accent/30 hover:text-accent"
                    disabled={!visibleData.length || (!isReplay && !isSelectingReplay)}
                    aria-label={isPlaying ? "Pause replay" : "Play replay"}
                    title={isPlaying ? "Pause replay" : "Play replay"}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      pause();
                      setIsSelectingReplay(true);
                      setHoveredTime(null);
                    }}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
                      isSelectingReplay
                        ? "border-fuchsia-400/25 bg-fuchsia-400/12 text-fuchsia-200"
                        : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-accent/30 hover:text-accent",
                    )}
                    disabled={!chartData.length}
                  >
                    Select Replay Start
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stop();
                      setIsSelectingReplay(false);
                      setHoveredTime(null);
                    }}
                    disabled={!isReplay && !isSelectingReplay}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-rose-400/30 hover:text-rose-300 disabled:opacity-40 disabled:hover:border-white/10"
                  >
                    Stop
                  </button>

                  <button
                    type="button"
                    onClick={backward}
                    disabled={!isReplay}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-accent/30 hover:text-accent disabled:opacity-40 disabled:hover:border-white/10"
                    aria-label="Replay backward"
                    title="Replay backward"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={forward}
                    disabled={!isReplay}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-accent/30 hover:text-accent disabled:opacity-40 disabled:hover:border-white/10"
                    aria-label="Replay forward"
                    title="Replay forward"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-1 ml-1">
                    {[1000, 500, 200].map((ms) => {
                      const label = ms === 1000 ? "1x" : ms === 500 ? "2x" : "5x";
                      const active = replaySpeed === ms;
                      return (
                        <button
                          key={ms}
                          type="button"
                          onClick={() => setReplaySpeed(ms)}
                          disabled={!isReplay}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                            active
                              ? "border-accent/30 bg-accent/10 text-accent"
                              : "border-white/10 bg-transparent text-slate-400 hover:text-foreground"
                          } disabled:opacity-40`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
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

              {!loading && !selectedStock ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 text-sm text-slate-400 backdrop-blur-sm">
                  Select a stock to load candles.
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
