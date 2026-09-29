// ============================================================
// visuals.tsx — Charts & diagrams for the ML Lab
// ============================================================
// Reusable pieces: pipeline flow diagram, model comparison bar
// chart, actual-vs-predicted line chart, feature importance,
// trend badges and stat cards. Styled to the notebook theme.
// ============================================================

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ModelResult, SeriesPoint, Trend } from "@/lib/ml/pipeline";

// ------------------------------------------------------------
// Formatting helpers
// ------------------------------------------------------------

export function fmtMoney(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return "—";
  return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPct(v: number, digits = 2, signed = false): string {
  if (!Number.isFinite(v)) return "—";
  const sign = signed && v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

export function fmtNum(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

// ------------------------------------------------------------
// Small building blocks
// ------------------------------------------------------------

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function StatCard({
  label,
  value,
  sub,
  accent = "text-ink",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-card rounded-2xl border-2 border-ink/10 p-4 shadow-sm notebook-card">
      <p className="text-xs font-semibold text-ink/40 font-mono uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 font-heading ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-ink/40 mt-0.5">{sub}</p>}
    </div>
  );
}

const trendStyles: Record<Trend, { chip: string; label: string }> = {
  Bullish: { chip: "bg-green-100 text-green-700 border-green-300", label: "Bullish" },
  Bearish: { chip: "bg-red-50 text-red-600 border-red-300", label: "Bearish" },
  Neutral: { chip: "bg-amber-50 text-amber-700 border-amber-300", label: "Neutral" },
};

export function TrendBadge({ trend }: { trend: Trend }) {
  const s = trendStyles[trend];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.chip}`}>
      {trend === "Bullish" ? "▲" : trend === "Bearish" ? "▼" : "◆"} {s.label}
    </span>
  );
}

// ------------------------------------------------------------
// Pipeline diagram
// ------------------------------------------------------------

export interface PipelineStep {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export function PipelineDiagram({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
      {steps.map((step, i) => (
        <motion.div
          key={step.title}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ ...fadeInUp, visible: { ...fadeInUp.visible, transition: { delay: i * 0.08 } } }}
          className="relative"
        >
          <div className="bg-card rounded-2xl border-2 border-ink/10 p-4 h-full shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 notebook-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-ink/10 flex items-center justify-center">
                <step.icon size={18} className="text-blue-ink" />
              </div>
              <span className="text-xs font-mono font-bold text-ink/30">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <p className="font-bold text-sm text-ink font-heading leading-tight">{step.title}</p>
            <p className="text-xs text-ink/45 mt-1.5 leading-relaxed">{step.desc}</p>
          </div>
          {/* Arrow connector */}
          {i < steps.length - 1 && (
            <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-ink/25">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Model comparison bar chart (MAE vs RMSE)
// ------------------------------------------------------------

export function ModelComparisonChart({ results }: { results: ModelResult[] }) {
  const data = results.map((r) => ({
    name: r.name.length > 22 ? r.name.slice(0, 21) + "…" : r.name,
    MAE: Math.round(r.mae * 100) / 100,
    RMSE: Math.round(r.rmse * 100) / 100,
  }));

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d4c5a9" opacity={0.4} horizontal={false} />
          <XAxis type="number" stroke="#8b7355" fontSize={12} tickLine={false} axisLine={{ stroke: "#d4c5a9" }} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#8b7355"
            fontSize={12}
            width={120}
            tickLine={false}
            axisLine={{ stroke: "#d4c5a9" }}
          />
          <Tooltip
            formatter={(value, name) => [`${fmtMoney(Number(value))}`, String(name)]}
            contentStyle={{
              backgroundColor: "#fffdf8",
              border: "2px solid #d4c5a9",
              borderRadius: 12,
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="MAE" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={14} />
          <Bar dataKey="RMSE" fill="#d97706" radius={[0, 6, 6, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ------------------------------------------------------------
// Actual vs predicted line chart
// ------------------------------------------------------------

export function ActualVsPredictedChart({
  points,
  symbol,
}: {
  points: SeriesPoint[];
  symbol: string;
}) {
  const data = points.map((p) => ({ date: p.date, Actual: p.actual, Predicted: p.predicted }));
  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d4c5a9" opacity={0.4} />
          <XAxis
            dataKey="date"
            stroke="#8b7355"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#d4c5a9" }}
            tickFormatter={(v: string) => fmtDateShort(v)}
            minTickGap={28}
          />
          <YAxis
            stroke="#8b7355"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: "#d4c5a9" }}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`}
            width={70}
          />
          <Tooltip
            formatter={(value, name) => [
              `${fmtMoney(Number(value))}`,
              String(name) === "Actual" ? "Actual next close" : "Predicted close",
            ]}
            labelFormatter={(label) => fmtDateShort(String(label))}
            contentStyle={{
              backgroundColor: "#fffdf8",
              border: "2px solid #d4c5a9",
              borderRadius: 12,
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Line
            type="monotone"
            dataKey="Actual"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
            animationDuration={700}
          />
          <Line
            type="monotone"
            dataKey="Predicted"
            stroke="#d97706"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 4 }}
            animationDuration={700}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ------------------------------------------------------------
// Feature importance chart
// ------------------------------------------------------------

export function FeatureImportanceChart({
  items,
}: {
  items: { feature: string; importance: number }[];
}) {
  const data = [...items].sort((a, b) => a.importance - b.importance);

  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d4c5a9" opacity={0.4} horizontal={false} />
          <XAxis
            type="number"
            stroke="#8b7355"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: "#d4c5a9" }}
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
            domain={[0, 1]}
          />
          <YAxis
            type="category"
            dataKey="feature"
            stroke="#8b7355"
            fontSize={12}
            width={110}
            tickLine={false}
            axisLine={{ stroke: "#d4c5a9" }}
          />
          <Tooltip
            formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, "Importance"]}
            contentStyle={{
              backgroundColor: "#fffdf8",
              border: "2px solid #d4c5a9",
              borderRadius: 12,
              fontSize: 13,
            }}
          />
          <Bar dataKey="importance" name="Importance" fill="#7c3aed" radius={[0, 6, 6, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}