import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "China Compliance Self-Check | SinoTrade Compliance",
  description: "Check if your product needs GACC registration, CCC certification, or NMPA filing for export to China.",
};

// Root layout is a pass-through — actual layout is in [locale]/
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
