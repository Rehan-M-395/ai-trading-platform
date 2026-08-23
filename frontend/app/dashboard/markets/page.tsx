"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
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
import { useRouter } from "next/navigation";

import { getStoredUser, type StoredUser } from "@/lib/auth";
import { useReplay } from "../../../components/hooks/useReplay";
import { analyseChart } from "../../../services/AnalysisService";
import { MarketChartPanel } from "./market-chart-panel";
import { MarketHeader } from "./market-header";
import { MarketSidebar } from "./market-sidebar";
import { ReplayControls } from "./replay-controls";
import type { CandleData, CandleResponse, ChartPoint, ChartTf, IntervalOption, StockMeta} from "./market.types";

const intervalOptions: IntervalOption[] = [
  { label: "1m", tf: "1m" },
  { label: "5m", tf: "5m" },
  { label: "15m", tf: "15m" },
  { label: "30m", tf: "30m" },
  { label: "1H", tf: "1h" },
  { label: "1D", tf: "1d" },
];

const PAGE_LIMIT = 200;
const INITIAL_LIMIT = 300;
const LOAD_MORE_THRESHOLD = 50;

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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const router = useRouter();

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [zones, setZones] = useState([]);
  const [selectedInterval, setSelectedInterval] = useState<IntervalOption>(
    () => intervalOptions.find((i) => i.tf === "5m") ?? intervalOptions[0],
  );
  const [showSma, setShowSma] = useState(false);
  const [showEma, setShowEma] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [showArea, setShowArea] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [isSelectingReplay, setIsSelectingReplay] = useState(false);
  const [hoveredTime, setHoveredTime] = useState<UTCTimestamp | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const lastFitKeyRef = useRef<string>("");
  const supportSeriesRef = useRef<ISeriesApi<"Line">[]>([]);
  const resistanceSeriesRef = useRef<ISeriesApi<"Line">[]>([]);

  const selectedStock = useMemo(
    () => stocks.find((stock) => stock.symbol_token === selectedStockToken) ?? null,
    [selectedStockToken, stocks],
  );

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

  const clearSupportResistanceSeries = useCallback(() => {
    const chart = chartApiRef.current;

    if (!chart) return;

    supportSeriesRef.current.forEach((series) => {
      try {
        chart.removeSeries(series);
      } catch (error) {
        console.warn("Failed to remove support series", error);
      }
    });

    resistanceSeriesRef.current.forEach((series) => {
      try {
        chart.removeSeries(series);
      } catch (error) {
        console.warn("Failed to remove resistance series", error);
      }
    });

    supportSeriesRef.current = [];
    resistanceSeriesRef.current = [];
  }, []);

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
    clearSupportResistanceSeries();
    stopReplayRef.current();
  }, [clearSupportResistanceSeries, selectedStock?.symbol_token, selectedInterval.tf]);

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

  // const clusterNearbyLevels = (
  //   points: SwingPoint[],
  //   tolerance: number,
  //   minTouches = 2,
  //   maxLevels = 5,
  // ): PriceLevel[] => {
  //   if (!points.length) {
  //     return [];
  //   }

  //   // Sort points by price
  //   const sortedPoints = [...points].sort(
  //     (a, b) => a.price - b.price
  //   );

  //   const clusters: SwingPoint[][] = [];

  //   // Group nearby prices
  //   for (const point of sortedPoints) {
  //     let addedToCluster = false;

  //     for (const cluster of clusters) {
  //       const averagePrice =
  //         cluster.reduce(
  //           (sum, item) => sum + item.price,
  //           0
  //         ) / cluster.length;

  //       if (
  //         Math.abs(point.price - averagePrice) <= tolerance
  //       ) {
  //         cluster.push(point);
  //         addedToCluster = true;
  //         break;
  //       }
  //     }

  //     if (!addedToCluster) {
  //       clusters.push([point]);
  //     }
  //   }

  //   // Keep clusters with enough touches
  //   // OR clusters containing an extreme point
  //   const levels: PriceLevel[] = clusters
  //     .filter((cluster) => {
  //       const hasExtreme = cluster.some(
  //         (point) => point.extreme === true
  //       );

  //       return (
  //         cluster.length >= minTouches ||
  //         hasExtreme
  //       );
  //     })
  //     .map((cluster) => {
  //       const averagePrice =
  //         cluster.reduce(
  //           (sum, point) => sum + point.price,
  //           0
  //         ) / cluster.length;

  //       const earliestIndex = Math.min(
  //         ...cluster.map((point) => point.index)
  //       );

  //       const hasExtreme = cluster.some(
  //         (point) => point.extreme === true
  //       );

  //       return {
  //         price: Number(averagePrice.toFixed(2)),
  //         index: earliestIndex,
  //         touches: cluster.length,
  //         extreme: hasExtreme,
  //       };
  //     });

  //   // Sort extreme levels first, then by touches
  //   levels.sort((a, b) => {
  //     if (a.extreme && !b.extreme) {
  //       return -1;
  //     }

  //     if (!a.extreme && b.extreme) {
  //       return 1;
  //     }

  //     if (b.touches !== a.touches) {
  //       return b.touches - a.touches;
  //     }

  //     return a.index - b.index;
  //   });

  //   return levels.slice(0, maxLevels);
  // };

  const drawSupportResistance = useCallback(
    (data: {
      resistance_zones?: Array<{
        price: number;
        index: number;
        touches: number;
        strength: number;
        zoneType: "strong" | "weak";
        extreme?: boolean;
      }>;

      support_zones?: Array<{
        price: number;
        index: number;
        touches: number;
        strength: number;
        zoneType: "strong" | "weak";
        extreme?: boolean;
      }>;
    }) => {
      const chart = chartApiRef.current;

      if (!chart) {
        console.warn("Chart is not ready");
        return;
      }

      if (!chartData.length) {
        console.warn("Chart data is empty");
        return;
      }

      // Remove old lines
      clearSupportResistanceSeries();

      const lastCandle =
        chartData[chartData.length - 1];

      if (!lastCandle) {
        return;
      }

      const lastTime = lastCandle.time;

      const createHorizontalLine = (
        seriesList: MutableRefObject<
          ISeriesApi<"Line">[]
        >,

        level: {
          price: number;
          index: number;
          strength: number;
          touches: number;
          zoneType: "strong" | "weak";
        },

        baseColor: "resistance" | "support",
      ) => {

        const startCandle =
          chartData[level.index];

        if (!startCandle) {
          console.warn(
            "Invalid candle index:",
            level.index,
          );
          return;
        }

        const startTime = startCandle.time;

        // strength is between 0 and 1
        const opacity =
          0.25 + level.strength * 0.55;

        const color =
          baseColor === "resistance"
            ? `rgba(248, 113, 113, ${opacity})`
            : `rgba(74, 222, 128, ${opacity})`;

        const lineWidth =
          level.zoneType === "strong"
            ? 2
            : 1;

        const lineSeries = chart.addSeries(
          LineSeries,
          {
            color,

            lineWidth,

            lineStyle: 2,

            priceLineVisible: false,

            lastValueVisible: false,

            title: `${level.price}`,
          }
        );

        lineSeries.setData([
          {
            time: startTime,
            value: level.price,
          },
          {
            time: lastTime,
            value: level.price,
          },
        ]);

        seriesList.current.push(
          lineSeries
        );
      };

      // =========================
      // DRAW RESISTANCE ZONES
      // =========================

      (data.resistance_zones ?? []).forEach(
        (zone) => {
          createHorizontalLine(
            resistanceSeriesRef,
            zone,
            "resistance",
          );
        }
      );

      // =========================
      // DRAW SUPPORT ZONES
      // =========================

      (data.support_zones ?? []).forEach(
        (zone) => {
          createHorizontalLine(
            supportSeriesRef,
            zone,
            "support",
          );
        }
      );

    },
    [
      chartData,
      clearSupportResistanceSeries,
    ],
  );

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
      clearSupportResistanceSeries();
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
  }, [clearSupportResistanceSeries, hydrated, selectedStock?.symbol_token]);

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

  const handleAIAnalysis = async () => {
    if (!selectedStock) {
      return;
    }

    setIsAnalyzing(true);

    try {
      const rawData = await analyseChart(selectedStock.id);

      console.log("RAW ANALYSIS:", rawData);

      const data = rawData?.zones ?? rawData;

      if (
        !data ||
        (
          !data.resistance_zones &&
          !data.support_zones
        )
      ) {
        console.warn(
          "No support/resistance zones returned",
          rawData
        );

        return;
      }

      drawSupportResistance({
        resistance_zones: data.resistance_zones ?? [],
        support_zones: data.support_zones ?? [],
      });

    } catch (error) {
      console.error(
        "AI Analysis failed:",
        error,
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

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

      <MarketSidebar
        showSma={showSma}
        showEma={showEma}
        showVolume={showVolume}
        showArea={showArea}
        onToggleSma={() => setShowSma((value) => !value)}
        onToggleEma={() => setShowEma((value) => !value)}
        onToggleVolume={() => setShowVolume((value) => !value)}
        onToggleArea={() => setShowArea((value) => !value)}
      />

      <section className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <MarketHeader
          selectedStock={selectedStock}
          marketSnapshot={marketSnapshot}
          stockLoading={stockLoading}
          filteredStocks={filteredStocks}
          selectedStockToken={selectedStockToken}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onSelectStock={setSelectedStockToken}
          intervalOptions={intervalOptions}
          selectedInterval={selectedInterval}
          onSelectInterval={setSelectedInterval}
          isReplay={isReplay}
          isAnalyzing={isAnalyzing}
          onAnalyze={handleAIAnalysis}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <ReplayControls
              isReplay={isReplay}
              isPlaying={isPlaying}
              isSelectingReplay={isSelectingReplay}
              visibleDataLength={visibleData.length}
              chartDataLength={chartData.length}
              replaySpeed={replaySpeed}
              onTogglePlay={() => {
                if (!isReplay) return;
                if (isPlaying) {
                  pause();
                  return;
                }
                play();
              }}
              onSelectReplayStart={() => {
                pause();
                setIsSelectingReplay(true);
                setHoveredTime(null);
              }}
              onStop={() => {
                stop();
                setIsSelectingReplay(false);
                setHoveredTime(null);
              }}
              onBackward={backward}
              onForward={forward}
              onSetReplaySpeed={setReplaySpeed}
            />

            <MarketChartPanel
              chartContainerRef={chartContainerRef}
              loading={loading}
              selectedStock={selectedStock}
              error={error}
              marketSnapshot={marketSnapshot}
              activePoint={activePoint}
              formatDateLabel={(time) => formatDateLabel(time as UTCTimestamp)}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
