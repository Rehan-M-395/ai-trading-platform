"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Newspaper,
  ChevronDown,
  TrendingUp,
  BarChart2,
  Bitcoin,
  Droplets,
  DollarSign,
  Globe,
  Flame,
} from "lucide-react";

import { getStoredUser, type StoredUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

type News = {
  uuid: string;
  title: string;
  description?: string;
  sentiment: string;
  source: string;
  url: string;
  image_url?: string;
  published_at: string;
};

type SidebarSection = {
  id: string;
  label: string;
  icon: ReactNode;
  items: { label: string; symbol?: string }[];
};

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: "nse",
    label: "NSE Stocks",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    items: [
      { label: "Nifty 50", symbol: "^NSEI" },
      { label: "Reliance Industries", symbol: "RELIANCE" },
      { label: "TCS", symbol: "TCS" },
      { label: "Infosys", symbol: "INFY" },
      { label: "HDFC Bank", symbol: "HDFCBANK" },
      { label: "ICICI Bank", symbol: "ICICIBANK" },
      { label: "Wipro", symbol: "WIPRO" },
      { label: "Bajaj Finance", symbol: "BAJFINANCE" },
    ],
  },
  {
    id: "bse",
    label: "BSE Stocks",
    icon: <BarChart2 className="h-3.5 w-3.5" />,
    items: [
      { label: "Sensex", symbol: "^BSESN" },
      { label: "Asian Paints", symbol: "ASIANPAINT" },
      { label: "Maruti Suzuki", symbol: "MARUTI" },
      { label: "Sun Pharma", symbol: "SUNPHARMA" },
      { label: "L&T", symbol: "LT" },
      { label: "Tata Motors", symbol: "TATAMOTORS" },
      { label: "Nestle India", symbol: "NESTLEIND" },
    ],
  },
  {
    id: "crypto",
    label: "Crypto",
    icon: <Bitcoin className="h-3.5 w-3.5" />,
    items: [
      { label: "Bitcoin", symbol: "BTC" },
      { label: "Ethereum", symbol: "ETH" },
      { label: "BNB", symbol: "BNB" },
      { label: "Solana", symbol: "SOL" },
      { label: "XRP", symbol: "XRP" },
      { label: "Cardano", symbol: "ADA" },
      { label: "Dogecoin", symbol: "DOGE" },
      { label: "Polygon", symbol: "MATIC" },
    ],
  },
  {
    id: "oil",
    label: "Oil & Commodities",
    icon: <Droplets className="h-3.5 w-3.5" />,
    items: [
      { label: "Crude Oil (WTI)", symbol: "CL=F" },
      { label: "Brent Crude", symbol: "BZ=F" },
      { label: "Natural Gas", symbol: "NG=F" },
      { label: "Gold", symbol: "GC=F" },
      { label: "Silver", symbol: "SI=F" },
      { label: "Copper", symbol: "HG=F" },
    ],
  },
  {
    id: "forex",
    label: "Forex",
    icon: <DollarSign className="h-3.5 w-3.5" />,
    items: [
      { label: "USD/INR", symbol: "USDINR=X" },
      { label: "EUR/INR", symbol: "EURINR=X" },
      { label: "GBP/INR", symbol: "GBPINR=X" },
      { label: "USD/EUR", symbol: "USDEUR=X" },
      { label: "USD/JPY", symbol: "USDJPY=X" },
      { label: "USD/GBP", symbol: "USDGBP=X" },
    ],
  },
  {
    id: "global",
    label: "Global Indices",
    icon: <Globe className="h-3.5 w-3.5" />,
    items: [
      { label: "S&P 500", symbol: "^GSPC" },
      { label: "NASDAQ", symbol: "^IXIC" },
      { label: "Dow Jones", symbol: "^DJI" },
      { label: "FTSE 100", symbol: "^FTSE" },
      { label: "Nikkei 225", symbol: "^N225" },
      { label: "DAX", symbol: "^GDAXI" },
    ],
  },
];

function SidebarDropdown({
  section,
  onSelectSymbol,
}: {
  section: SidebarSection;
  onSelectSymbol: (symbol: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold uppercase tracking-widest transition-all duration-200",
          open
            ? "border border-border bg-gradient-to-r from-accent/30 to-danger/15 text-foreground shadow-soft"
            : "border border-transparent text-muted hover:border-border hover:bg-card/70 hover:text-foreground"
        )}
      >
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-lg transition-all",
              open ? "bg-accent/15 text-foreground" : "bg-card text-muted"
            )}
          >
            {section.icon}
          </span>
          {section.label}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-300",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="mt-1 ml-2 space-y-0.5 border-l border-border pl-3">
          {section.items.map((item) => (
            <button
              key={`${section.id}-${item.label}`}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-muted transition hover:bg-accent/10 hover:text-foreground"
              onClick={() => {
                if (!item.symbol) return;
                let symbol = item.symbol;
              
                if (
                  !symbol.includes(".NS") &&
                  !symbol.includes("=") &&
                  !symbol.includes("^")
                ) {
                  symbol = symbol + ".NS";
                }
              
                onSelectSymbol(symbol);
              }}>

              <span>{item.label}</span>
              {item.symbol && (
                <span className="font-mono text-[10px] text-accent/80">
                  {item.symbol}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MarketNewsPage() {
  const router = useRouter();
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<StoredUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("TCS.NS");

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    const currentUser = getStoredUser();
    if (!currentUser) {
      router.replace("/?auth=login");
      return;
    }
    setUser(currentUser);
    setHydrated(true);
  }, [router]);

  useEffect(() => {
    if (!hydrated) return;
    const fetchNews = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_URL}/api/news/marketNews?symbol=${selectedSymbol}`);
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          setError("Invalid response from server");
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch");
        setNews(data.data || []);
      } catch {
        setError("Failed to fetch news");
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [API_URL, hydrated, selectedSymbol]);

  if (!hydrated || !user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background text-foreground">
        <div className="rounded-2xl border border-border bg-card px-5 py-3 text-sm text-muted shadow-soft">
          Loading news terminal...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-terminal-grid opacity-35" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(217,70,239,0.14),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(251,113,133,0.10),transparent_45%)]" />
      </div>

      <div className="relative z-10 flex h-screen flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card/70 px-4 py-2.5 backdrop-blur-xl">
          <Link
            href="/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-muted transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>

          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-danger shadow-glow">
            <Newspaper className="h-4 w-4 text-foreground" />
          </div>

          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground">
              Market News Terminal
            </h1>
            <p className="text-[10px] text-muted">
              Live headlines · Sentiment analysis
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
              <Flame className="h-3 w-3" />
              {loading ? "Live" : `${news.length} Stories`}
            </span>
          </div>
        </header>

        {/* Main layout: sidebar + feed */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Sidebar ── */}
          <aside className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-border bg-card/60 backdrop-blur-xl">
            <div className="p-3">
              <p className="mb-2 px-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted">
                Market Watch
              </p>
              {SIDEBAR_SECTIONS.map((section) => (
                <SidebarDropdown
                    key={section.id}
                    section={section}
                    onSelectSymbol={setSelectedSymbol}
                />
                ))}
            </div>
          </aside>

          {/* ── News Feed ── */}
          <section className="flex-1 overflow-y-auto p-4">
            {loading && (
              <div className="flex h-32 items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted shadow-soft">
                Loading latest market news...
              </div>
            )}

            {error && (
              <div className="flex h-32 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-sm text-danger shadow-soft">
                {error}
              </div>
            )}

            {!loading && !error && news.length === 0 && (
              <div className="flex h-32 items-center justify-center rounded-2xl border border-border bg-card/50 text-sm text-muted">
                No market news available right now.
              </div>
            )}

            {!loading && !error && news.length > 0 && (
              <div className="space-y-2">
                {news.map((item) => (
                  <article
                    key={item.uuid}
                    className="group flex gap-3 rounded-2xl border border-border bg-card/60 p-3 shadow-soft transition-all duration-200 hover:border-accent/35 hover:bg-card"
                  >
                    {/* Thumbnail */}
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-16 w-24 shrink-0 rounded-xl object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-border bg-gradient-to-br from-accent/20 to-danger/15">
                        <Newspaper className="h-5 w-5 text-muted" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div>
                        <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-foreground">
                          {item.title}
                        </h2>
                        {item.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        {/* Sentiment badge */}
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                            item.sentiment === "positive" &&
                              "border-success/30 bg-success/10 text-success",
                            item.sentiment === "negative" &&
                              "border-danger/30 bg-danger/10 text-danger",
                            item.sentiment !== "positive" &&
                              item.sentiment !== "negative" &&
                              "border-border bg-card text-muted"
                          )}
                        >
                          {item.sentiment || "neutral"}
                        </span>

                        {/* Source */}
                        <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted">
                          {item.source}
                        </span>

                        {/* Time */}
                        <span className="text-[10px] text-muted">
                          {new Date(item.published_at).toLocaleString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        {/* Link */}
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto flex items-center gap-1 text-[11px] font-medium text-accent transition hover:opacity-90"
                        >
                          Read
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}