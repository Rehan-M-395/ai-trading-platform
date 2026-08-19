import type { RefObject } from "react";
import { Sparkles } from "lucide-react";

import type { ChartPoint } from "./market.types";

type MarketChartPanelProps = {
  chartContainerRef: RefObject<HTMLDivElement | null>;
  loading: boolean;
  selectedStock: { trading_symbol?: string } | null;
  error: string;
  marketSnapshot: { price: string };
  activePoint: ChartPoint | null;
  formatDateLabel: (time: number) => string;
};

export function MarketChartPanel({
  chartContainerRef,
  loading,
  selectedStock,
  error,
  marketSnapshot,
  activePoint,
  formatDateLabel,
}: MarketChartPanelProps) {
  return (
    <div className="relative min-h-0 flex-1">
      <div ref={chartContainerRef} className="absolute inset-0 w-full" />

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
              {activePoint ? "Hovered Candle" : "Latest Candle"}
            </p>
            <p className="mt-2 text-sm font-medium text-white">
              {activePoint ? formatDateLabel(activePoint.time) : "--"}
            </p>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="text-slate-300">
                O <span className="font-semibold text-white">{activePoint?.open.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "--"}</span>
              </span>
              <span className="text-slate-300">
                H <span className="font-semibold text-emerald-300">{activePoint?.high.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "--"}</span>
              </span>
              <span className="text-slate-300">
                L <span className="font-semibold text-rose-300">{activePoint?.low.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "--"}</span>
              </span>
              <span className="text-slate-300">
                C <span className="font-semibold text-white">{activePoint?.close.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "--"}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
