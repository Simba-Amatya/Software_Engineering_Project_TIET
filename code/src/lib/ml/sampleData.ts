// ============================================================
// sampleData.ts — Synthetic NIFTY-style dataset for instant demos
// ============================================================
// Generates ~2 years of weekday OHLCV data for 10 well-known
// NSE stocks with a seeded random walk, formatted like the
// nifty500_stocks.csv file (DD-MM-YYYY dates).
// ============================================================

import { mulberry32, gaussian } from "./random";

interface SampleStock {
  symbol: string;
  basePrice: number;
  drift: number;
  volatility: number;
}

const SAMPLE_STOCKS: SampleStock[] = [
  { symbol: "TCS", basePrice: 3400, drift: 0.0004, volatility: 0.012 },
  { symbol: "RELIANCE", basePrice: 2450, drift: 0.0003, volatility: 0.014 },
  { symbol: "HDFCBANK", basePrice: 1520, drift: 0.0002, volatility: 0.013 },
  { symbol: "INFY", basePrice: 1450, drift: 0.0003, volatility: 0.015 },
  { symbol: "SBIN", basePrice: 620, drift: 0.0004, volatility: 0.018 },
  { symbol: "ICICIBANK", basePrice: 950, drift: 0.0003, volatility: 0.016 },
  { symbol: "ITC", basePrice: 400, drift: 0.0002, volatility: 0.011 },
  { symbol: "LT", basePrice: 3100, drift: 0.0004, volatility: 0.013 },
  { symbol: "MARUTI", basePrice: 9800, drift: 0.0002, volatility: 0.011 },
  { symbol: "BHARTIARTL", basePrice: 850, drift: 0.0005, volatility: 0.014 },
];

const TRADING_DAYS = 500;

function fmtDate(y: number, m: number, d: number): string {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${dd}-${mm}-${y}`;
}

export function generateSampleCsv(): string {
  const rng = mulberry32(20240517);
  const lines: string[] = ["Date,Symbol,Open,High,Low,Close,Volume"];

  // Build a calendar of weekdays starting 2023-01-02
  const dates: Date[] = [];
  const cursor = new Date(2023, 0, 2); // Jan 2, 2023 (a Monday)
  while (dates.length < TRADING_DAYS) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const stock of SAMPLE_STOCKS) {
    let close = stock.basePrice;
    for (let i = 0; i < dates.length; i++) {
      const d = dates[i];
      // Regime shifts every ~40 days so patterns are learnable
      const regime = i % 40 < 30 ? stock.drift : -stock.drift * 0.8;
      const shock = gaussian(rng);
      close = Math.max(close * (1 + regime + stock.volatility * shock), stock.basePrice * 0.5);
      const open = close * (1 + gaussian(rng) * 0.004);
      const high = Math.max(open, close) * (1 + Math.abs(gaussian(rng)) * 0.004);
      const low = Math.min(open, close) * (1 - Math.abs(gaussian(rng)) * 0.004);
      const volume = Math.round(
        stock.basePrice < 500
          ? 2_000_000 + rng() * 8_000_000
          : 300_000 + rng() * 2_000_000,
      );
      const r2 = (v: number) => Math.round(v * 100) / 100;
      lines.push(
        [
          fmtDate(d.getFullYear(), d.getMonth() + 1, d.getDate()),
          stock.symbol,
          r2(open),
          r2(high),
          r2(low),
          r2(close),
          volume,
        ].join(","),
      );
    }
  }

  return lines.join("\n");
}