"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Chart } from "@/components/chart/chart";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { StockInfoPanel } from "@/components/dashboard/stock-info-panel";
import { TradePanel } from "@/components/trade/trade-panel";
import { StoredUser, getStoredUser } from "@/lib/auth";
import { stocks } from "@/lib/data";

export function DashboardShell() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const currentUser = getStoredUser();

    if (!currentUser) {
      router.replace("/?auth=login");
      return;
    }

    setUser(currentUser);
    setHydrated(true);
  }, [router]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass-panel rounded-3xl px-6 py-4 text-sm text-slate-300">
          Loading terminal...
        </div>
      </div>
    );
  }

  const primaryStock = stocks[0];

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar stocks={stocks} />
      <main className="flex-1 p-4 md:p-6 lg:p-7">
        <div className="mx-auto flex max-w-[1600px] animate-slideUp flex-col gap-6">
          <Topbar user={user} />
          <Chart stock={primaryStock} />
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <StockInfoPanel stock={primaryStock} />
            <TradePanel stock={primaryStock} />
          </div>
        </div>
      </main>
    </div>
  );
}
