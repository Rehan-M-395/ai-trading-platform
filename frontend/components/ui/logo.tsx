export function Logo() {
  return (
    <div className="flex items-center gap-3">

      {/* Icon */}
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 shadow-[0_0_40px_rgba(217,70,239,0.15)]">
        <span className="font-display text-lg font-bold text-fuchsia-300">
          AI
        </span>
      </div>

      {/* Brand Name */}
      <div className="flex items-center">
        <p className="font-display text-lg font-semibold tracking-tight text-white">
          Signal
          <span className="ml-1 text-white/40">X</span>
        </p>
      </div>
    </div>
  );
}