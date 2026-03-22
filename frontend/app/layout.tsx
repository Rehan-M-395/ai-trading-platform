import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "SignalX | AI Trading Platform",
  description: "Premium frontend interface for an AI-powered trading terminal."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html className="dark" lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
