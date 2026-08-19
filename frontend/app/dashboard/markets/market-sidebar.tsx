import { ArrowLeft, Crosshair, Maximize2, Move3D, TrendingUp, Waves } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type SidebarTool = {
  label: string;
  icon: typeof Crosshair;
};

type MarketSidebarProps = {
  showSma: boolean;
  showEma: boolean;
  showVolume: boolean;
  showArea: boolean;
  onToggleSma: () => void;
  onToggleEma: () => void;
  onToggleVolume: () => void;
  onToggleArea: () => void;
};

const sidebarTools: SidebarTool[] = [
  { label: "Crosshair", icon: Crosshair },
  { label: "Trend", icon: TrendingUp },
  { label: "Pattern", icon: Waves },
  { label: "Layout", icon: Maximize2 },
  { label: "Trade", icon: Move3D },
];

const indicatorOptions = [
  { label: "SMA 20", key: "sma" },
  { label: "EMA 50", key: "ema" },
  { label: "Volume", key: "volume" },
  { label: "Trend Area", key: "area" },
] as const;

export function MarketSidebar({
  showSma,
  showEma,
  showVolume,
  showArea,
  onToggleSma,
  onToggleEma,
  onToggleVolume,
  onToggleArea,
}: MarketSidebarProps) {
  return (
    <aside className="relative z-10 hidden w-[88px] shrink-0 border-r border-white/10 bg-slate-950/70 px-3 py-4 backdrop-blur-xl lg:flex lg:flex-col lg:justify-between">
      <div className="space-y-3">
        <Link
          href="/dashboard"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-fuchsia-400/20 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        {sidebarTools.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="group flex w-full flex-col items-center gap-2 rounded-2xl border border-transparent bg-white/[0.02] px-2 py-3 text-slate-400 transition hover:border-fuchsia-400/15 hover:bg-white/[0.05] hover:text-white"
            type="button"
          >
            <Icon className="h-4 w-4 text-fuchsia-300/85 transition group-hover:text-fuchsia-200" />
            <span className="text-[10px] uppercase tracking-[0.24em]">{label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2 rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3">
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Indicators</p>
        {indicatorOptions.map((option) => {
          const active =
            (option.key === "sma" && showSma) ||
            (option.key === "ema" && showEma) ||
            (option.key === "volume" && showVolume) ||
            (option.key === "area" && showArea);

          return (
            <button
              key={option.key}
              className={cn(
                "w-full rounded-xl border px-2 py-2 text-left text-[11px] font-medium transition",
                active
                  ? "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200"
                  : "border-white/10 bg-transparent text-slate-400 hover:text-white",
              )}
              onClick={() => {
                if (option.key === "sma") onToggleSma();
                if (option.key === "ema") onToggleEma();
                if (option.key === "volume") onToggleVolume();
                if (option.key === "area") onToggleArea();
              }}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
