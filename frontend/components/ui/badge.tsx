import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BadgeProps = {
  children: ReactNode;
  positive?: boolean;
};

export function Badge({ children, positive }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide",
        positive
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
          : "border-orange-400/20 bg-orange-500/10 text-orange-300",
      )}
    >
      {children}
    </span>
  );
}
