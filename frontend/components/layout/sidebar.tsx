import {
  Activity,
  BriefcaseBusiness,
  CandlestickChart,
  LayoutGrid
} from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { Watchlist } from "@/components/watchlist/watchlist";
import { Stock } from "@/types/stock";

type SidebarProps = {
  stocks: Stock[];
};

const navItems = [
  { label: "Dashboard", icon: LayoutGrid },
  { label: "Markets", icon: CandlestickChart },
  { label: "Signals", icon: Activity },
  { label: "Portfolio", icon: BriefcaseBusiness }
];

export function Sidebar({ stocks }: SidebarProps) {
  return (
    <aside className="w-full shrink-0 lg:sticky lg:top-0 lg:h-screen lg:w-[320px] lg:border-r lg:border-white/10 lg:bg-slate-950/45 lg:p-5 lg:backdrop-blur-xl">
      <div className="flex h-full flex-col gap-5">
        <div className="glass-panel rounded-[2rem] p-5">
          <Logo />
          <nav className="mt-8 space-y-2">
            {navItems.map(({ label, icon: Icon }, index) => (
              <button
                key={label}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  index === 0
                    ? "bg-fuchsia-400/10 text-fuchsia-200"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                }`}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="min-h-0 flex-1">
          <Watchlist stocks={stocks} />
        </div>
      </div>
    </aside>
  );
}
