import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "WasteWise AI — Waste Intelligence Platform",
  description: "Turn waste data into smarter decisions with AI-powered waste analytics, forecasting, and recommendations.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-sand-50 text-charcoal-800 antialiased">{children}</body>
    </html>
  );
}
