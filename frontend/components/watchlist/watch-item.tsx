import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Stock } from "@/types/stock";

type WatchItemProps = {
  stock: Stock;
  active?: boolean;
};

export function WatchItem({ stock, active }: WatchItemProps) {
  const positive = stock.change >= 0;

  return (
    <button
      className={cn(
        "group flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition duration-200",
        active
          ? "border-fuchsia-400/30 bg-fuchsia-400/10 shadow-[0_10px_30px_rgba(217,70,239,0.15)]"
          : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]",
      )}
      type="button"
    >
      <div>
        <p className="font-semibold tracking-wide text-slate-100">{stock.symbol}</p>
        <p className="mt-1 text-xs text-slate-500">NSE Equity</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-white">
          ₹{stock.price.toLocaleString("en-IN")}
        </p>
        <div className="mt-1 flex items-center justify-end gap-2">
          {positive ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-orange-300" />
          )}
          <Badge positive={positive}>
            {positive ? "+" : ""}
            {stock.change.toFixed(2)}%
          </Badge>
        </div>
      </div>
    </button>
  );
}
