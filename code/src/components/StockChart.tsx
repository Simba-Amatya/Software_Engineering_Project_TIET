// ============================================================
// StockChart.tsx — Interactive stock price chart
// ============================================================
// Professor explanation: This component uses the recharts library
// to draw a line chart of stock prices. The user can switch between
// different timeframes (1D, 1W, 1M, 1Y) and see the data change.
// ============================================================

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { chartData } from "@/data/mockData";

interface StockChartProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

// Custom tooltip that shows on hover over the chart
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border-2 border-ink/10 rounded-xl px-4 py-3 shadow-lg">
        <p className="text-xs text-ink/60 font-medium">{label}</p>
        <p className="text-lg font-bold text-ink font-heading">
          ₹{payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
}

export default function StockChart({ symbol, name, price, change }: StockChartProps) {
  const [timeframe, setTimeframe] = useState("1D");

  // Get chart data for the selected stock and timeframe
  const data = chartData[symbol]?.[timeframe] ?? [];
  const isPositive = change >= 0;

  const timeframes = ["1D", "1W", "1M", "1Y"];

  return (
    <div className="bg-card rounded-2xl border-2 border-ink/10 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 notebook-card">
      {/* Header: stock info and price */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-ink font-heading">Market Performance</h2>
          </div>
          <p className="text-ink/50 text-sm mt-1">
            {symbol} — {name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-ink font-heading">₹{price.toFixed(2)}</p>
          <p className={`text-sm font-semibold ${isPositive ? "text-green-600" : "text-red-500"}`}>
            {isPositive ? "+" : ""}{change.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Timeframe selector buttons */}
      <div className="flex gap-2 mb-6">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              timeframe === tf
                ? "bg-blue-ink text-white shadow-md"
                : "bg-ink/5 text-ink/60 hover:bg-ink/10"
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* The chart itself */}
      <div className="h-[300px] sm:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "#2563eb" : "#ef4444"} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isPositive ? "#2563eb" : "#ef4444"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#d4c5a9" opacity={0.4} />
            <XAxis
              dataKey="time"
              stroke="#8b7355"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#d4c5a9" }}
            />
            <YAxis
              stroke="#8b7355"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#d4c5a9" }}
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? "#2563eb" : "#ef4444"}
              strokeWidth={2.5}
              fill={`url(#gradient-${symbol})`}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
