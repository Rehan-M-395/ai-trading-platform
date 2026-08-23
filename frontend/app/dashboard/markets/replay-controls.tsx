import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ReplayControlsProps = {
  isReplay: boolean;
  isPlaying: boolean;
  isSelectingReplay: boolean;
  visibleDataLength: number;
  chartDataLength: number;
  replaySpeed: number;
  onTogglePlay: () => void;
  onSelectReplayStart: () => void;
  onStop: () => void;
  onBackward: () => void;
  onForward: () => void;
  onSetReplaySpeed: (speed: number) => void;
};

export function ReplayControls({
  isReplay,
  isPlaying,
  isSelectingReplay,
  visibleDataLength,
  chartDataLength,
  replaySpeed,
  onTogglePlay,
  onSelectReplayStart,
  onStop,
  onBackward,
  onForward,
  onSetReplaySpeed,
}: ReplayControlsProps) {

  const [orderSide, setOrderSide] = useState<"BUY" | "SELL" | null>(null);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [quantity, setQuantity] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  return (
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
            onClick={onTogglePlay}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-accent/30 hover:text-accent"
            disabled={!visibleDataLength || (!isReplay && !isSelectingReplay)}
            aria-label={isPlaying ? "Pause replay" : "Play replay"}
            title={isPlaying ? "Pause replay" : "Play replay"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onSelectReplayStart}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
              isSelectingReplay
                ? "border-fuchsia-400/25 bg-fuchsia-400/12 text-fuchsia-200"
                : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-accent/30 hover:text-accent",
            )}
            disabled={!chartDataLength}
          >
            Select Replay Start
          </button>

          <button
            type="button"
            onClick={onStop}
            disabled={!isReplay && !isSelectingReplay}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-rose-400/30 hover:text-rose-300 disabled:opacity-40 disabled:hover:border-white/10"
          >
            Stop
          </button>

          <button
            type="button"
            onClick={onBackward}
            disabled={!isReplay}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-accent/30 hover:text-accent disabled:opacity-40 disabled:hover:border-white/10"
            aria-label="Replay backward"
            title="Replay backward"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onForward}
            disabled={!isReplay}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-accent/30 hover:text-accent disabled:opacity-40 disabled:hover:border-white/10"
            aria-label="Replay forward"
            title="Replay forward"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <div className="ml-1 flex items-center gap-1">
            {[1000, 500, 200].map((ms) => {
              const label = ms === 1000 ? "1x" : ms === 500 ? "2x" : "5x";
              const active = replaySpeed === ms;
              return (
                <button
                  key={ms}
                  type="button"
                  onClick={() => onSetReplaySpeed(ms)}
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

          <div className="ml-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOrderSide("BUY")}
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300 transition hover:border-emerald-400/40 hover:bg-emerald-400/15"
            >
              Buy
            </button>

            <button
              type="button"
              onClick={() => setOrderSide("SELL")}
              className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-rose-300 transition hover:border-rose-400/40 hover:bg-rose-400/15"
            >
              Sell
            </button>
          </div>
        </div>
      </div>

      {orderSide && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-[420px] max-h-[calc(100vh-32px)] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">

            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Paper Trading
                </p>

                <h3
                  className={`mt-1 text-lg font-bold ${orderSide === "BUY"
                      ? "text-emerald-300"
                      : "text-rose-300"
                    }`}
                >
                  {orderSide} Order
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setOrderSide(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* FORM */}
            <div className="p-5">

              {/* ORDER TYPE */}
              <div className="mb-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Order Type
                </p>

                <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                  <button
                    type="button"
                    onClick={() => setOrderType("MARKET")}
                    className={`rounded-lg py-2 text-xs font-semibold transition ${orderType === "MARKET"
                        ? "bg-white/10 text-white"
                        : "text-slate-500 hover:text-slate-300"
                      }`}
                  >
                    Market
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderType("LIMIT")}
                    className={`rounded-lg py-2 text-xs font-semibold transition ${orderType === "LIMIT"
                        ? "bg-white/10 text-white"
                        : "text-slate-500 hover:text-slate-300"
                      }`}
                  >
                    Limit
                  </button>
                </div>
              </div>

              {/* QUANTITY */}
              <div className="mb-4">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Quantity
                </label>

                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-accent/40"
                />
              </div>

              {/* ENTRY PRICE */}
              <div className="mb-4">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Entry Price
                </label>

                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="Enter price"
                  disabled={orderType === "MARKET"}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
                />

                {orderType === "MARKET" && (
                  <p className="mt-1.5 text-[10px] text-slate-600">
                    Market order uses the current market price.
                  </p>
                )}
              </div>

              {/* STOP LOSS */}
              <div className="mb-4">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Stop Loss
                </label>

                <input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="Stop loss price"
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-accent/40"
                />
              </div>

              {/* TAKE PROFIT */}
              <div className="mb-5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Take Profit
                </label>

                <input
                  type="number"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="Target price"
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-accent/40"
                />
              </div>

              {/* ORDER SUMMARY */}
              <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.02] p-3">

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-slate-500">
                    Side
                  </span>

                  <span
                    className={`text-xs font-bold ${orderSide === "BUY"
                        ? "text-emerald-300"
                        : "text-rose-300"
                      }`}
                  >
                    {orderSide}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-slate-500">
                    Type
                  </span>

                  <span className="text-xs text-slate-300">
                    {orderType}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-slate-500">
                    Quantity
                  </span>

                  <span className="text-xs text-slate-300">
                    {quantity || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-slate-500">
                    Stop Loss
                  </span>

                  <span className="text-xs text-slate-300">
                    {stopLoss || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-slate-500">
                    Take Profit
                  </span>

                  <span className="text-xs text-slate-300">
                    {takeProfit || "—"}
                  </span>
                </div>

              </div>

              {/* CONFIRM BUTTON */}
              <button
                type="button"
                disabled={!quantity || !stopLoss || !takeProfit}
                className={`h-11 w-full rounded-xl text-sm font-bold uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-40 ${orderSide === "BUY"
                    ? "bg-emerald-500 text-white hover:bg-emerald-400"
                    : "bg-rose-500 text-white hover:bg-rose-400"
                  }`}
              >
                Allow {orderSide}
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
