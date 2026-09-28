import type { Metadata, Viewport } from "next";
import { Bagel_Fat_One, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter_Tight({ subsets: ["latin"], variable: "--font-inter" });
const bubble = Bagel_Fat_One({ subsets: ["latin"], weight: "400", variable: "--font-bubble-face" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "The Yard",
  description: "Find collaborators, run lossless studio sessions, lock splits and get paid through escrow — built for the underground.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bubble.variable} ${mono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
