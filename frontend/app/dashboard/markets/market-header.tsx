import { CandlestickChart, Search, Settings2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { IntervalOption, MarketSnapshot, StockMeta } from "./market.types";

type MarketHeaderProps = {
  selectedStock: StockMeta | null;
  marketSnapshot: MarketSnapshot;
  stockLoading: boolean;
  filteredStocks: StockMeta[];
  selectedStockToken: string;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onSelectStock: (value: string) => void;
  intervalOptions: IntervalOption[];
  selectedInterval: IntervalOption;
  onSelectInterval: (option: IntervalOption) => void;
  isReplay: boolean;
  isAnalyzing: boolean;
  onAnalyze: () => void;
};

export function MarketHeader({
  selectedStock,
  marketSnapshot,
  stockLoading,
  filteredStocks,
  selectedStockToken,
  searchTerm,
  setSearchTerm,
  onSelectStock,
  intervalOptions,
  selectedInterval,
  onSelectInterval,
  isReplay,
  isAnalyzing,
  onAnalyze,
}: MarketHeaderProps) {
  return (
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
            onChange={(event) => onSelectStock(event.target.value)}
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
                onClick={() => onSelectInterval(option)}
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
            onClick={onAnalyze}
            type="button"
            disabled={isAnalyzing}
            className="h-11 rounded-xl border border-sky-400/20 bg-sky-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200 transition"
          >
            {isAnalyzing ? "Analyzing..." : "AI Analyse"}
          </button>
        </div>
      </div>
    </header>
  );
}
