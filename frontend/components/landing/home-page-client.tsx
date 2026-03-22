"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CandlestickChart,
  ShieldCheck,
  X,
  Zap
} from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { getStoredUser } from "@/lib/auth";

type HomePageClientProps = {
  initialAuthMode: "login" | "register" | null;
};

const stats = [
  { label: "Signals processed", value: "12.4M+" },
  { label: "Strategy latency", value: "42ms" },
  { label: "Terminal uptime", value: "99.98%" }
];

const features = [
  {
    icon: Bot,
    title: "AI-assisted execution",
    description:
      "Layer signal scoring, momentum bias, and trader context into one decision surface built for high-focus sessions."
  },
  {
    icon: CandlestickChart,
    title: "Terminal-grade visualization",
    description:
      "Monitor structured market panels, watchlists, chart surfaces, and trade controls in a layout tuned for active trading."
  },
  {
    icon: ShieldCheck,
    title: "Fast simulated onboarding",
    description:
      "Authentication now opens directly from the landing page, keeping the onboarding flow inside one premium entry experience."
  }
];

const metrics = [
  { title: "Alpha engine", value: "Bullish skew", tone: "from-fuchsia-500/20 to-pink-500/10" },
  { title: "Risk band", value: "Controlled", tone: "from-violet-500/20 to-fuchsia-500/10" }
];

export function HomePageClient({ initialAuthMode }: HomePageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [hasSession, setHasSession] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(initialAuthMode);

  useEffect(() => {
    setHasSession(Boolean(getStoredUser()));
  }, []);

  function openAuthModal(mode: "login" | "register") {
    setAuthMode(mode);
    router.replace(`${pathname}?auth=${mode}`, { scroll: false });
  }

  function closeAuthModal() {
    setAuthMode(null);
    router.replace(pathname, { scroll: false });
  }

  function handlePrimaryAction() {
    if (hasSession) {
      router.push("/dashboard");
      return;
    }

    openAuthModal("register");
  }

  const loginOpen = authMode === "login";
  const registerOpen = authMode === "register";
  const primaryLabel = hasSession ? "Open Dashboard" : "Start Trading";

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(236,72,153,0.20),transparent_25%),radial-gradient(circle_at_85%_15%,rgba(168,85,247,0.20),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(192,38,211,0.14),transparent_30%)]" />

      <section className="relative mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 pb-6 pt-20 md:px-8 lg:px-10">
        <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-white/10 bg-white/10 shadow-sm backdrop-blur-xl">
          <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6 md:px-10">
            <div className="flex items-center gap-2">
              <Logo />
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={() => openAuthModal("login")}
                variant="ghost"
                className="px-4 text-sm text-white/70 transition-colors hover:text-white"
              >
                Login
              </Button>

              <Button
                onClick={handlePrimaryAction}
                variant="ghost"
                className="group relative px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
              >
                {primaryLabel}
                <span className="absolute -bottom-0.5 left-0 h-[1px] w-0 bg-white/70 transition-all duration-300 group-hover:w-full" />
              </Button>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-10 pb-10 pt-0 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-14 lg:pt-0">
          <div className="animate-slideUp">
            <h1 className="-mt-2 max-w-3xl font-display text-5xl font-semibold leading-[1.02] text-white md:text-6xl lg:text-7xl">
              Trade with a premium terminal built around
              <span className="bg-gradient-to-r from-fuchsia-300 via-pink-300 to-violet-300 bg-clip-text text-transparent">
                {" "}
                machine-guided conviction
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              SignalX is a dark, high-end trading workspace designed for execution,
              watchlist depth, and AI-enhanced signal clarity. The current build is
              frontend-first and ready for rapid product iteration.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button onClick={handlePrimaryAction} className="w-full min-w-[190px] gap-2 sm:w-auto">
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => openAuthModal("login")}
                className="w-full min-w-[190px] sm:w-auto"
                variant="secondary"
              >
                Explore Access Flow
              </Button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur-xl"
                >
                  <p className="text-2xl font-semibold text-white">{stat.value}</p>
                  <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="absolute bottom-12 right-8 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-transparent bg-transparent p-4 shadow-none backdrop-blur-none">
              <div className="rounded-[1.5rem] border border-fuchsia-400/15 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-violet-500/10 p-4">
                <div className="flex items-center justify-between rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                      Strategy Feed
                    </p>
                    <p className="mt-2 text-xl font-semibold text-white">RELIANCE Long Bias</p>
                  </div>
                  <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-2 text-sm font-medium text-fuchsia-200">
                    +1.86%
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
                  <div className="rounded-[1.5rem] border border-white/10 bg-[#090311]/80 p-5">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                          AI Signal Map
                        </p>
                        <p className="mt-3 text-3xl font-semibold text-white">Rs. 2,948.30</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-emerald-300">Momentum positive</p>
                        <p className="text-xs text-slate-500">Updated 2s ago</p>
                      </div>
                    </div>

                    <div className="mt-6 flex h-56 items-end gap-2">
                      {[46, 64, 59, 78, 73, 96, 86, 110, 94, 124, 108, 134].map((bar, index) => (
                        <div
                          key={`${bar}-${index}`}
                          className="flex-1 rounded-t-[1rem] bg-gradient-to-t from-violet-700/50 via-fuchsia-500/70 to-pink-300 shadow-[0_10px_24px_rgba(217,70,239,0.18)]"
                          style={{ height: `${bar}px` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {metrics.map((metric) => (
                      <div
                        key={metric.title}
                        className={`rounded-[1.5rem] border border-white/10 bg-gradient-to-br ${metric.tone} px-4 py-5`}
                      >
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                          {metric.title}
                        </p>
                        <p className="mt-3 text-lg font-semibold text-white">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {features.map(({ icon: Icon, title, description }) => (
                    <div
                      key={title}
                      className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-400/10 text-fuchsia-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-5 pb-8 lg:grid-cols-3">
          {[
            {
              title: "Built for dark-mode focus",
              description:
                "Deep blacks, violet glows, and pink highlights keep the interface premium without losing information density."
            },
            {
              title: "Modular frontend architecture",
              description:
                "The app is already structured for scaling into real charts, live feeds, portfolio data, and authenticated APIs."
            },
            {
              title: "Ready for user onboarding",
              description:
                "Login and registration already work from the landing experience, so users never leave the home page before entering the dashboard."
            }
          ].map((item) => (
            <div
              key={item.title}
              className="glass-panel rounded-[2rem] px-5 py-6 transition duration-300 hover:-translate-y-1"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] text-pink-200">
                <Zap className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{item.description}</p>
            </div>
          ))}
        </section>
      </section>

      {loginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xl">
          <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-black/60 p-8 shadow-2xl backdrop-blur-xl">
            <button
              onClick={closeAuthModal}
              className="absolute right-4 top-4 text-white/60 transition-colors hover:text-white"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
            <AuthForm mode="login" onModeChange={openAuthModal} />
          </div>
        </div>
      )}

      {registerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xl">
          <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-black/60 p-8 shadow-2xl backdrop-blur-xl">
            <button
              onClick={closeAuthModal}
              className="absolute right-4 top-4 text-white/60 transition-colors hover:text-white"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
            <AuthForm mode="register" onModeChange={openAuthModal} />
          </div>
        </div>
      )}
    </main>
  );
}
