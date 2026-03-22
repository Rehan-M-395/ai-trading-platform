"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stock } from "@/types/stock";

type TradePanelProps = {
  stock: Stock;
};

export function TradePanel({ stock }: TradePanelProps) {
  const [quantity, setQuantity] = useState("10");
  const [limitPrice, setLimitPrice] = useState(stock.price.toFixed(2));

  const total = Number(quantity || 0) * Number(limitPrice || 0);

  return (
    <Card className="rounded-[2rem] p-5">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Trade Panel</p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-white">
          Place Order
        </h3>
      </div>

      <div className="space-y-4">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Symbol</p>
          <p className="mt-2 text-lg font-semibold text-white">{stock.symbol}</p>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400" htmlFor="quantity">
            Quantity
          </label>
          <Input
            id="quantity"
            min="1"
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400" htmlFor="limitPrice">
            Limit Price
          </label>
          <Input
            id="limitPrice"
            min="1"
            step="0.01"
            type="number"
            value={limitPrice}
            onChange={(event) => setLimitPrice(event.target.value)}
          />
        </div>

        <div className="rounded-[1.5rem] border border-fuchsia-400/15 bg-fuchsia-400/10 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
            Estimated Value
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            ₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="buy">Buy</Button>
          <Button variant="sell">Sell</Button>
        </div>
      </div>
    </Card>
  );
}
