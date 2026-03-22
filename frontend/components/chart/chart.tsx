import { ArrowUpRight, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Stock } from "@/types/stock";

type ChartProps = {
  stock: Stock;
};

const chartBars = [52, 68, 54, 82, 76, 92, 74, 95, 88, 104, 96, 118];

export function Chart({ stock }: ChartProps) {
  const positive = stock.change >= 0;

  return (
    <Card className="relative overflow-hidden rounded-[2rem] p-6">
      <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-fuchsia-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Live Overview
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="font-display text-3xl font-semibold text-white">
                {stock.symbol}
              </h2>
              <Badge positive={positive}>
                {positive ? "+" : ""}
                {stock.change.toFixed(2)}%
              </Badge>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              AI confidence is elevated after strong momentum continuation signals.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/10 px-4 py-3">
            <Sparkles className="h-4 w-4 text-fuchsia-300" />
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                Signal Strength
              </p>
              <p className="text-sm font-semibold text-white">Bullish Bias</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.8fr_0.8fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-slate-950/80 to-slate-900/40 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Current Price</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-white">
                  ₹{stock.price.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-300">
                <ArrowUpRight className="h-4 w-4" />
                1D Momentum
              </div>
            </div>

            <div className="mt-8 flex h-64 items-end gap-2">
              {chartBars.map((value, index) => (
                <div
                  key={`${value}-${index}`}
                  className="flex-1 rounded-t-2xl bg-gradient-to-t from-violet-600/30 via-fuchsia-400/50 to-pink-300/90 shadow-[0_12px_30px_rgba(217,70,239,0.14)] transition duration-300 hover:scale-y-105"
                  style={{ height: `${value}%` }}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {[
              { label: "Open", value: "₹2,918.20" },
              { label: "High", value: "₹2,955.10" },
              { label: "Low", value: "₹2,901.65" },
              { label: "Volume", value: "8.24M" }
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
              >
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-3 text-xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
