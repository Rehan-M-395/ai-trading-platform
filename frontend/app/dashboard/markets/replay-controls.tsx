import { Pause, Play, SkipBack, SkipForward } from "lucide-react";

import { cn } from "@/lib/utils";

type ReplayControlsProps = {
  isReplay: boolean;
  isPlaying: boolean;
  isSelectingReplay: boolean;
  visibleDataLength: number;
  chartDataLength: number;
  replaySpeed: number;
  onTogglePlay: () => void;
  onSelectReplayStart: () => void;
  onStop: () => void;
  onBackward: () => void;
  onForward: () => void;
  onSetReplaySpeed: (speed: number) => void;
};

export function ReplayControls({
  isReplay,
  isPlaying,
  isSelectingReplay,
  visibleDataLength,
  chartDataLength,
  replaySpeed,
  onTogglePlay,
  onSelectReplayStart,
  onStop,
  onBackward,
  onForward,
  onSetReplaySpeed,
}: ReplayControlsProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-950/35 px-4 py-1.5 md:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-fuchsia-400/15 bg-fuchsia-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-fuchsia-200">
          Fullscreen Chart
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-400">
          AI Bias: Bullish
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent/20 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-accent">
            Replay
          </span>

          <button
            type="button"
            onClick={onTogglePlay}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-accent/30 hover:text-accent"
            disabled={!visibleDataLength || (!isReplay && !isSelectingReplay)}
            aria-label={isPlaying ? "Pause replay" : "Play replay"}
            title={isPlaying ? "Pause replay" : "Play replay"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onSelectReplayStart}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
              isSelectingReplay
                ? "border-fuchsia-400/25 bg-fuchsia-400/12 text-fuchsia-200"
                : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-accent/30 hover:text-accent",
            )}
            disabled={!chartDataLength}
          >
            Select Replay Start
          </button>

          <button
            type="button"
            onClick={onStop}
            disabled={!isReplay && !isSelectingReplay}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-rose-400/30 hover:text-rose-300 disabled:opacity-40 disabled:hover:border-white/10"
          >
            Stop
          </button>

          <button
            type="button"
            onClick={onBackward}
            disabled={!isReplay}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-accent/30 hover:text-accent disabled:opacity-40 disabled:hover:border-white/10"
            aria-label="Replay backward"
            title="Replay backward"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onForward}
            disabled={!isReplay}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:border-accent/30 hover:text-accent disabled:opacity-40 disabled:hover:border-white/10"
            aria-label="Replay forward"
            title="Replay forward"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <div className="ml-1 flex items-center gap-1">
            {[1000, 500, 200].map((ms) => {
              const label = ms === 1000 ? "1x" : ms === 500 ? "2x" : "5x";
              const active = replaySpeed === ms;
              return (
                <button
                  key={ms}
                  type="button"
                  onClick={() => onSetReplaySpeed(ms)}
                  disabled={!isReplay}
                  className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                    active
                      ? "border-accent/30 bg-accent/10 text-accent"
                      : "border-white/10 bg-transparent text-slate-400 hover:text-foreground"
                  } disabled:opacity-40`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
