import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 shadow-inner shadow-black/10 outline-none transition duration-200 placeholder:text-slate-500 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/20",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
