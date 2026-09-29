// ============================================================
// features.ts — Load the NIFTY CSV and engineer ML features
// ============================================================
// Mirrors the Colab notebook's preprocessing exactly:
//   - parse Symbol / Date / Close / Volume (flexible column names)
//   - per-symbol rolling MA20, daily return, 20-day volatility,
//     volume change, and next-day close as the prediction target
// ============================================================

import { parseCsv } from "@/lib/csv";

export interface RawStockRow {
  symbol: string;
  /** Normalized yyyy-mm-dd so string sort == date sort */
  date: string;
  close: number;
  volume: number;
}

export interface FeatureRow {
  date: string;
  symbol: string;
  close: number;
  volume: number;
  ma20: number;
  dailyReturn: number;
  volatility20: number;
  volumeChange: number;
  targetNextClose: number;
}

export interface SymbolMeta {
  symbol: string;
  rows: number;
  dateMin: string;
  dateMax: string;
}

export interface DatasetInfo {
  fileName: string;
  totalRows: number;
  symbols: string[];
  dateMin: string;
  dateMax: string;
  columnsFound: string[];
}

/** Find the index of a header column using case-insensitive aliases */
function findColumn(headers: string[], aliases: string[]): number {
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const alias of aliases) {
    const idx = lower.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

function toNumber(v: string): number {
  const cleaned = v.replace(/[, ]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/** Normalize common date formats to yyyy-mm-dd */
function normalizeDate(v: string): string | null {
  const s = v.trim();
  // yyyy-mm-dd
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  // dd-mm-yyyy or dd/mm/yyyy (NSE format)
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  // mm/dd/yyyy
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const mo = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
  return null;
}

/**
 * Parse raw CSV text into typed stock rows. Throws with a helpful
 * message if the expected columns can't be found.
 */
export function parseDataset(csvText: string): {
  rawRows: RawStockRow[];
  columnsFound: string[];
} {
  const { headers, rows } = parseCsv(csvText);
  if (headers.length === 0) throw new Error("The file appears to be empty or not a valid CSV.");

  const symbolIdx = findColumn(headers, ["symbol", "ticker", "security", "scrip"]);
  const dateIdx = findColumn(headers, ["date", "timestamp", "trade date"]);
  const closeIdx = findColumn(headers, ["close", "close price", "closing price", "adj close", "last"]);
  const volumeIdx = findColumn(headers, ["volume", "vol", "total trade quantity"]);

  if (symbolIdx === -1 || dateIdx === -1 || closeIdx === -1) {
    throw new Error(
      `Could not find required columns. Found: ${headers.join(", ")}. ` +
        `Expected at least "Symbol", "Date" and "Close" (plus "Volume" ideally).`,
    );
  }

  const rawRows: RawStockRow[] = [];
  for (const row of rows) {
    if (row.length <= Math.max(symbolIdx, dateIdx, closeIdx, volumeIdx)) continue;
    const symbol = row[symbolIdx]?.trim();
    const date = normalizeDate(row[dateIdx] ?? "");
    const close = toNumber(row[closeIdx] ?? "");
    const volume = volumeIdx === -1 ? 0 : toNumber(row[volumeIdx] ?? "");
    if (!symbol || !date || !Number.isFinite(close) || close <= 0) continue;
    if (volumeIdx !== -1 && !Number.isFinite(volume)) continue;
    rawRows.push({ symbol, date, close, volume });
  }

  if (rawRows.length === 0) {
    throw new Error("No usable rows found. Make sure the CSV has Symbol, Date and Close columns with numbers.");
  }

  return { rawRows, columnsFound: headers };
}

// ------------------------------------------------------------
// Rolling window helpers (pandas-compatible, ddof=1 for std)
// ------------------------------------------------------------

function rollingMean(v: number[], w: number): (number | null)[] {
  const out: (number | null)[] = new Array(v.length).fill(null);
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i];
    if (i >= w) sum -= v[i - w];
    if (i >= w - 1) out[i] = sum / w;
  }
  return out;
}

function rollingStd(v: (number | null)[], w: number): (number | null)[] {
  const out: (number | null)[] = new Array(v.length).fill(null);
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    if (x !== null && Number.isFinite(x)) {
      sum += x;
      sumSq += x * x;
      count++;
    }
    if (i >= w) {
      const old = v[i - w];
      if (old !== null && Number.isFinite(old)) {
        sum -= old;
        sumSq -= old * old;
        count--;
      }
    }
    if (count >= w) {
      const mean = sum / w;
      const variance = (sumSq - w * mean * mean) / (w - 1);
      out[i] = Math.sqrt(Math.max(variance, 0));
    }
  }
  return out;
}

function pctChange(v: number[]): (number | null)[] {
  const out: (number | null)[] = new Array(v.length).fill(null);
  for (let i = 1; i < v.length; i++) {
    if (v[i - 1] !== 0) out[i] = v[i] / v[i - 1] - 1;
  }
  return out;
}

// ------------------------------------------------------------
// Feature engineering — per symbol, chronological order
// ------------------------------------------------------------

export function buildFeatures(rawRows: RawStockRow[]): FeatureRow[] {
  const bySymbol = new Map<string, RawStockRow[]>();
  for (const r of rawRows) {
    let arr = bySymbol.get(r.symbol);
    if (!arr) {
      arr = [];
      bySymbol.set(r.symbol, arr);
    }
    arr.push(r);
  }

  const out: FeatureRow[] = [];
  for (const [symbol, rows] of bySymbol) {
    rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const n = rows.length;
    if (n < 25) continue; // need 20 rows for the rolling windows + a target

    const closes = rows.map((r) => r.close);
    const volumes = rows.map((r) => r.volume);

    const ma20 = rollingMean(closes, 20);
    const dailyReturn = pctChange(closes);
    const volatility20 = rollingStd(dailyReturn, 20);
    const volumeChange = pctChange(volumes);

    for (let i = 20; i < n - 1; i++) {
      const target = closes[i + 1];
      const ma = ma20[i];
      const vol = volatility20[i];
      const dr = dailyReturn[i];
      const vc = volumeChange[i];
      if (ma === null || vol === null || dr === null || vc === null) continue;
      if (!Number.isFinite(target)) continue;
      out.push({
        date: rows[i].date,
        symbol,
        close: closes[i],
        volume: volumes[i],
        ma20: ma,
        dailyReturn: dr,
        volatility20: vol,
        volumeChange: vc,
        targetNextClose: target,
      });
    }
  }
  return out;
}

export function summarizeSymbols(featureRows: FeatureRow[]): SymbolMeta[] {
  const bySymbol = new Map<string, { count: number; dateMin: string; dateMax: string }>();
  for (const f of featureRows) {
    let meta = bySymbol.get(f.symbol);
    if (!meta) {
      meta = { count: 0, dateMin: f.date, dateMax: f.date };
      bySymbol.set(f.symbol, meta);
    }
    meta.count++;
    if (f.date < meta.dateMin) meta.dateMin = f.date;
    if (f.date > meta.dateMax) meta.dateMax = f.date;
  }
  return [...bySymbol.entries()]
    .map(([symbol, m]) => ({
      symbol,
      rows: m.count,
      dateMin: m.dateMin,
      dateMax: m.dateMax,
    }))
    .sort((a, b) => b.rows - a.rows || (a.symbol < b.symbol ? -1 : 1));
}

export function describeDataset(
  fileName: string,
  rawRows: RawStockRow[],
  featureRows: FeatureRow[],
  columnsFound: string[],
): DatasetInfo {
  let dateMin = "";
  let dateMax = "";
  for (const r of rawRows) {
    if (!dateMin || r.date < dateMin) dateMin = r.date;
    if (!dateMax || r.date > dateMax) dateMax = r.date;
  }
  const symbols = new Set<string>();
  for (const r of rawRows) symbols.add(r.symbol);
  return {
    fileName,
    totalRows: rawRows.length,
    symbols: [...symbols].sort(),
    dateMin,
    dateMax,
    columnsFound,
  };
}