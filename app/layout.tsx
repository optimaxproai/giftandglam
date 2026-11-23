import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Mountains_of_Christmas } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const christmas = Mountains_of_Christmas({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-christmas", display: "swap" });

export const metadata: Metadata = {
  title: "Virtual Angel Tree",
  description: "Choose an angel, shop their wish list, and bless a child this Christmas.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${christmas.variable}`}>
      <body>{children}</body>
    </html>
  );
}
