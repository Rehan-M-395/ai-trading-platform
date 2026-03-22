import * as React from "react";

import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass-panel panel-highlight rounded-3xl shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-fuchsia-400/20",
        className,
      )}
      {...props}
    />
  );
}
