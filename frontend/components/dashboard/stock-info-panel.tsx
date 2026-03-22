import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Stock } from "@/types/stock";

type StockInfoPanelProps = {
  stock: Stock;
};

export function StockInfoPanel({ stock }: StockInfoPanelProps) {
  const positive = stock.change >= 0;

  return (
    <Card className="rounded-[2rem] p-5">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Instrument Stats</p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-white">
          {stock.symbol} Snapshot
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Last Traded Price</p>
          <p className="mt-3 text-2xl font-semibold text-white">
            ₹{stock.price.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Session Change</p>
          <div className="mt-3">
            <Badge positive={positive}>
              {positive ? "+" : ""}
              {stock.change.toFixed(2)}%
            </Badge>
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">VWAP</p>
          <p className="mt-3 text-lg font-semibold text-white">₹2,932.80</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">AI Risk Meter</p>
          <p className="mt-3 text-lg font-semibold text-emerald-300">Moderate</p>
        </div>
      </div>
    </Card>
  );
}
