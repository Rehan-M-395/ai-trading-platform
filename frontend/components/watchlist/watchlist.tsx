import { BarChart3 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Stock } from "@/types/stock";
import { WatchItem } from "@/components/watchlist/watch-item";

type WatchlistProps = {
  stocks: Stock[];
};

export function Watchlist({ stocks }: WatchlistProps) {
  return (
    <Card className="h-full rounded-[2rem] p-4 lg:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Watchlist
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold text-white">
            Market Movers
          </h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
          <BarChart3 className="h-5 w-5 text-fuchsia-300" />
        </div>
      </div>
      <div className="space-y-3">
        {stocks.map((stock, index) => (
          <WatchItem key={stock.symbol} active={index === 0} stock={stock} />
        ))}
      </div>
    </Card>
  );
}
