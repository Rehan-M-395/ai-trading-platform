"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost" | "buy" | "sell";
};

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-fuchsia-500 text-white shadow-[0_12px_30px_rgba(217,70,239,0.25)] hover:bg-fuchsia-400",
  secondary:
    "border border-white/10 bg-slate-900 text-slate-100 hover:bg-slate-800",
  ghost: "bg-transparent text-slate-200 hover:bg-white/5",
  buy: "bg-emerald-500/90 text-emerald-950 hover:bg-emerald-400",
  sell: "bg-orange-500/90 text-orange-950 hover:bg-orange-400"
};

export function Button({
  className,
  variant = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60 disabled:pointer-events-none disabled:opacity-50",
        variantStyles[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
