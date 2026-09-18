// ============================================================
// MlLab.tsx — MarketLens ML Lab
// ============================================================
// The full machine-learning pipeline from the notebook, running
// 100% in the browser: upload a NIFTY CSV (or load a sample),
// pick stocks, and train five models (Linear Regression, SVR,
// Gradient Boosting, XGBoost, Optuna-tuned XGBoost) with charts,
// tables and diagnostics for every stage.
// ============================================================

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Database,
  FileSpreadsheet,
  FlaskConical,
  GitBranch,
  Info,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Trophy,
  UploadCloud,
  X,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  parseDataset,
  buildFeatures,
  summarizeSymbols,
  describeDataset,
} from "@/lib/ml/features";
import type { DatasetInfo, FeatureRow, SymbolMeta } from "@/lib/ml/features";
import { runPipeline } from "@/lib/ml/pipeline";
import type { PipelineResults } from "@/lib/ml/pipeline";
import { generateSampleCsv } from "@/lib/ml/sampleData";
import {
  ActualVsPredictedChart,
  FeatureImportanceChart,
  ModelComparisonChart,
  PipelineDiagram,
  StatCard,
  TrendBadge,
  fmtDateShort,
  fmtMoney,
  fmtNum,
  fmtPct,
} from "@/components/ml/visuals";
import type { PipelineStep } from "@/components/ml/visuals";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const MAX_SYMBOLS = 8;

const PIPELINE_STEPS: PipelineStep[] = [
  { icon: FileSpreadsheet, title: "Upload CSV", desc: "Drop your nifty500_stocks.csv — Symbol, Date, Close and Volume are detected automatically." },
  { icon: Database, title: "Feature Engineering", desc: "Per stock: 20-day moving average, daily return, 20-day volatility and volume change." },
  { icon: GitBranch, title: "Train / Test Split", desc: "Earliest 80% of each stock trains, the newest 20% is held out for honest evaluation." },
  { icon: Cpu, title: "5 ML Models", desc: "Linear Regression, SVR (RBF), Gradient Boosting, XGBoost and a tuned XGBoost variant." },
  { icon: FlaskConical, title: "Optuna-Style Tuning", desc: "Random search over 6 hyperparameters on a time-based validation split." },
  { icon: Trophy, title: "Evaluate & Predict", desc: "MAE, RMSE, R², directional accuracy, time-series CV and next-day forecasts." },
];

const STAGE_LABELS = [
  "Split & feature preparation",
  "Linear Regression",
  "SVR (RBF kernel)",
  "Gradient Boosting",
  "XGBoost",
  "Optuna-style tuning",
  "Optuna-tuned XGBoost",
  "Evaluation & cross-validation",
];

export default function MlLab() {
  const [phase, setPhase] = useState<"idle" | "ready" | "running" | "done" | "error">("idle");
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [symbols, setSymbols] = useState<SymbolMeta[]>([]);
  const [featureRows, setFeatureRows] = useState<FeatureRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [stageStep, setStageStep] = useState(0);
  const [stageLabel, setStageLabel] = useState("");
  const [results, setResults] = useState<PipelineResults | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [chartSymbol, setChartSymbol] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ------------------------------------------------------------
  // Data ingestion
  // ------------------------------------------------------------

  const ingest = async (text: string, fileName: string) => {
    setPhase("ready");
    setError("");
    setResults(null);
    await new Promise((r) => setTimeout(r, 30));
    try {
      const { rawRows, columnsFound } = parseDataset(text);
      const featureRows = buildFeatures(rawRows);
      const meta = summarizeSymbols(featureRows);
      if (meta.length === 0) {
        throw new Error(
          "No stocks with enough history (25+ rows) were found. The dataset needs at least 21 consecutive days per symbol.",
        );
      }
      setFeatureRows(featureRows);
      setSymbols(meta);
      setDataset(describeDataset(fileName, rawRows, featureRows, columnsFound));

      const preferred = ["TCS", "RELIANCE", "HDFCBANK"];
      const available = new Set(meta.map((m) => m.symbol));
      const init = preferred.filter((s) => available.has(s));
      setSelected(init.length > 0 ? init.slice(0, MAX_SYMBOLS) : meta.slice(0, 3).map((m) => m.symbol));
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Failed to read the file. Make sure it is valid CSV.");
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      file.text().then((text) => ingest(text, file.name));
    }
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) file.text().then((text) => ingest(text, file.name));
  };

  const loadSample = async () => {
    setPhase("ready");
    setError("");
    setResults(null);
    await new Promise((r) => setTimeout(r, 30));
    try {
      const csv = generateSampleCsv();
      await ingest(csv, "nifty500_sample.csv");
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Failed to generate sample data.");
    }
  };

  const toggleSymbol = (symbol: string) => {
    setSelected((prev) => {
      if (prev.includes(symbol)) return prev.filter((s) => s !== symbol);
      if (prev.length >= MAX_SYMBOLS) return prev;
      return [...prev, symbol];
    });
  };

  // ------------------------------------------------------------
  // Run the pipeline
  // ------------------------------------------------------------

  const handleRun = async () => {
    if (featureRows.length === 0 || selected.length === 0) return;
    setPhase("running");
    setResults(null);
    setError("");
    setStageStep(0);
    setStageLabel("Preparing…");
    try {
      const res = await runPipeline(featureRows, selected, (step, label) => {
        setStageStep(step);
        setStageLabel(label);
      });
      setResults(res);
      setChartSymbol(res.stockPredictions[0]?.symbol ?? res.symbols[0] ?? "");
      setPhase("done");
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Training failed. Try fewer stocks or a smaller file.");
    }
  };

  const bestModel = results?.bestModel;
  const lrResult = results?.modelResults.find((r) => r.key === "lr");

  return (
    <div className="min-h-screen bg-cream text-ink">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ============ TITLE ============ */}
        <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-ink/10 text-blue-ink rounded-full text-sm font-medium mb-4">
            <BrainCircuit size={14} />
            Machine Learning Lab
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-ink font-heading">
            Predict Next-Day Stock Prices
          </h1>
          <p className="text-ink/50 mt-2 max-w-2xl leading-relaxed">
            Upload your <span className="font-mono text-ink/70">nifty500_stocks.csv</span> (or load the sample),
            pick the stocks you care about, and MarketLens trains five models — Linear Regression, SVR,
            Gradient Boosting, XGBoost and an Optuna-tuned XGBoost — entirely in your browser.
            Your data never leaves the page.
          </p>
        </motion.div>

        {/* ============ PIPELINE DIAGRAM ============ */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
          <div className="bg-card rounded-2xl border-2 border-ink/10 p-6 sm:p-8 shadow-sm notebook-card">
            <div className="flex items-center gap-2 mb-6">
              <GitBranch size={18} className="text-blue-ink" />
              <h2 className="text-xl font-bold text-ink font-heading">How the Pipeline Works</h2>
            </div>
            <PipelineDiagram steps={PIPELINE_STEPS} />
          </div>
        </motion.section>

        {/* ============ UPLOAD + CONFIGURATION ============ */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
          <div className="bg-card rounded-2xl border-2 border-ink/10 p-6 sm:p-8 shadow-sm notebook-card">
            <div className="flex items-center gap-2 mb-6">
              <UploadCloud size={18} className="text-blue-ink" />
              <h2 className="text-xl font-bold text-ink font-heading">1 · Upload Market Data</h2>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
                dragOver
                  ? "border-blue-ink bg-blue-ink/5 scale-[1.01]"
                  : "border-ink/20 hover:border-blue-ink/50 hover:bg-ink/[0.02]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <UploadCloud size={36} className={`mx-auto mb-3 ${dragOver ? "text-blue-ink" : "text-ink/30"}`} />
              <p className="font-semibold text-ink">Drop your CSV here, or click to browse</p>
              <p className="text-sm text-ink/40 mt-1">Expects Symbol, Date, Close and Volume columns (NSE-style files work great)</p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-ink text-white text-sm font-medium rounded-xl hover:bg-blue-ink/90 transition-all duration-200 shadow"
                >
                  <FileSpreadsheet size={16} /> Browse file
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadSample();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-ink/5 text-ink text-sm font-medium rounded-xl hover:bg-ink/10 transition-all duration-200"
                >
                  <Sparkles size={16} /> Load sample data
                </button>
              </div>
            </div>

            {/* Dataset summary */}
            {dataset && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard
                  label="File"
                  value={dataset.fileName.length > 22 ? dataset.fileName.slice(0, 21) + "…" : dataset.fileName}
                />
                <StatCard label="Rows" value={dataset.totalRows.toLocaleString("en-IN")} />
                <StatCard label="Symbols" value={String(dataset.symbols.length)} />
                <StatCard label="From" value={fmtDateShort(dataset.dateMin)} />
                <StatCard label="To" value={fmtDateShort(dataset.dateMax)} />
              </div>
            )}

            {/* Symbol selection */}
            {symbols.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="font-bold text-ink font-heading">2 · Choose stocks to analyze</h3>
                  <span className="text-xs text-ink/40 font-mono">
                    {selected.length}/{MAX_SYMBOLS} selected — {symbols.length} available
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {symbols.map((meta) => {
                    const isOn = selected.includes(meta.symbol);
                    return (
                      <button
                        key={meta.symbol}
                        onClick={() => toggleSymbol(meta.symbol)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                          isOn
                            ? "bg-blue-ink border-blue-ink text-white shadow-md"
                            : "bg-card border-ink/10 text-ink/60 hover:border-blue-ink/40 hover:text-ink"
                        }`}
                      >
                        <span className="font-mono">{meta.symbol}</span>
                        <span className={`ml-1.5 text-xs font-normal ${isOn ? "text-white/70" : "text-ink/30"}`}>
                          {meta.rows.toLocaleString("en-IN")}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-6">
                  <button
                    type="button"
                    onClick={handleRun}
                    disabled={selected.length === 0}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-ink text-white font-semibold rounded-xl hover:bg-blue-ink/90 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play size={18} /> Run ML Analysis
                  </button>
                  <p className="text-xs text-ink/40 max-w-md leading-relaxed">
                    Trains 5 models + hyperparameter search on up to the 800 most recent rows per stock.
                    A few thousand rows typically completes in a couple of seconds.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* ============ ERROR ============ */}
        {phase === "error" && (
          <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-700 font-heading">Something went wrong</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setPhase("ready")}
                className="ml-auto text-red-400 hover:text-red-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ============ RUNNING ============ */}
        {phase === "running" && (
          <motion.section initial="hidden" animate="visible" variants={fadeInUp}>
            <div className="bg-card rounded-2xl border-2 border-ink/10 p-6 sm:p-8 shadow-sm notebook-card">
              <div className="flex items-center gap-3 mb-1">
                <Loader2 size={20} className="animate-spin text-blue-ink" />
                <h2 className="text-xl font-bold text-ink font-heading">Training models…</h2>
              </div>
              <p className="text-sm text-ink/50 mb-5">{stageLabel}</p>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
                {STAGE_LABELS.map((label, i) => {
                  const done = i < stageStep;
                  const active = i === stageStep;
                  return (
                    <div
                      key={label}
                      className={`flex items-center gap-2 text-sm ${
                        done ? "text-green-600" : active ? "text-blue-ink font-semibold" : "text-ink/25"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 size={16} className="shrink-0" />
                      ) : active ? (
                        <Loader2 size={16} className="animate-spin shrink-0" />
                      ) : (
                        <span className="w-4 shrink-0 text-center text-xs font-mono">{i + 1}</span>
                      )}
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.section>
        )}

        {/* ================================================================
            RESULTS
            ================================================================ */}
        {phase === "done" && results && bestModel && (
          <>
            {/* ---- Best model callout ---- */}
            <motion.section initial="hidden" animate="visible" variants={fadeInUp}>
              <div className="bg-blue-ink text-white rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" />
                <div className="absolute -bottom-16 right-24 w-40 h-40 bg-white/5 rounded-full" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy size={20} />
                    <span className="text-white/70 text-sm font-medium uppercase tracking-wider">
                      Best model by test MAE
                    </span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold font-heading mb-6">{bestModel.name}</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                      <p className="text-xs text-white/60 font-mono uppercase tracking-wider">Test MAE</p>
                      <p className="text-2xl font-bold mt-1">{fmtMoney(bestModel.mae)}</p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                      <p className="text-xs text-white/60 font-mono uppercase tracking-wider">Test RMSE</p>
                      <p className="text-2xl font-bold mt-1">{fmtMoney(bestModel.rmse)}</p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                      <p className="text-xs text-white/60 font-mono uppercase tracking-wider">R² Score</p>
                      <p className="text-2xl font-bold mt-1">{fmtNum(bestModel.r2, 4)}</p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                      <p className="text-xs text-white/60 font-mono uppercase tracking-wider">Directional Acc.</p>
                      <p className="text-2xl font-bold mt-1">{fmtPct(bestModel.directionalAccuracy)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-6">
                    <span className="text-xs text-white/60">Tuned hyperparameters:</span>
                    {Object.entries(results.tunedParams).map(([k, v]) => (
                      <span key={k} className="px-2.5 py-1 bg-white/10 rounded-lg text-xs font-mono">
                        {k} = {v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>

            {/* ---- Model comparison ---- */}
            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
              <div className="bg-card rounded-2xl border-2 border-ink/10 p-6 sm:p-8 shadow-sm notebook-card">
                <h2 className="text-xl font-bold text-ink font-heading mb-1">Model Comparison</h2>
                <p className="text-sm text-ink/40 mb-6">
                  All five models evaluated on the untouched 20% test period. Lower MAE / RMSE is better; R² closer to 1 and higher directional accuracy are better.
                </p>
                <div className="grid lg:grid-cols-2 gap-8">
                  <ModelComparisonChart results={results.modelResults} />
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead className="text-right">MAE</TableHead>
                          <TableHead className="text-right">RMSE</TableHead>
                          <TableHead className="text-right">R²</TableHead>
                          <TableHead className="text-right">Dir. Acc.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.modelResults.map((r, i) => (
                          <TableRow
                            key={r.key}
                            className={i === 0 ? "bg-blue-ink/5" : ""}
                          >
                            <TableCell className="font-mono text-ink/40">{i + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-ink">{r.name}</span>
                                {i === 0 && (
                                  <span className="text-[10px] font-bold bg-blue-ink text-white px-1.5 py-0.5 rounded-full">
                                    BEST
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{fmtNum(r.mae)}</TableCell>
                            <TableCell className="text-right font-mono">{fmtNum(r.rmse)}</TableCell>
                            <TableCell className={`text-right font-mono ${r.r2 >= 0 ? "text-green-600" : "text-red-500"}`}>
                              {fmtNum(r.r2, 4)}
                            </TableCell>
                            <TableCell className="text-right font-mono">{fmtPct(r.directionalAccuracy)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 space-y-1.5">
                      {results.modelResults.map((r) => (
                        <p key={r.key} className="text-xs text-ink/40 leading-relaxed">
                          <span className="font-semibold text-ink/60">{r.name}:</span> {r.note}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* ---- Next-day predictions ---- */}
            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
              <div className="bg-card rounded-2xl border-2 border-ink/10 p-6 sm:p-8 shadow-sm notebook-card">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={18} className="text-blue-ink" />
                  <h2 className="text-xl font-bold text-ink font-heading">Next-Day Forecasts</h2>
                </div>
                <p className="text-sm text-ink/40 mb-6">
                  Latest trading day in the test period, using the winning model. Trend threshold: ±1% expected move.
                </p>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {results.stockPredictions.map((p) => (
                    <div key={p.symbol} className="rounded-2xl border-2 border-ink/10 p-5 shadow-sm hover:shadow-md transition-all duration-200 bg-card notebook-card">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-mono font-bold text-ink text-lg">{p.symbol}</span>
                        <TrendBadge trend={p.trend} />
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <p className="text-xs text-ink/40 font-mono uppercase">Current</p>
                          <p className="text-xl font-bold text-ink">{fmtMoney(p.currentPrice)}</p>
                        </div>
                        <span className="text-ink/30 pb-1">→</span>
                        <div className="text-right">
                          <p className="text-xs text-ink/40 font-mono uppercase">Predicted</p>
                          <p className="text-xl font-bold text-blue-ink">{fmtMoney(p.predictedPrice)}</p>
                        </div>
                      </div>
                      <div className={`mt-3 text-sm font-semibold ${p.changePct >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {fmtPct(p.changePct, 2, true)} expected move
                      </div>
                    </div>
                  ))}
                </div>

                {/* Latest feature values */}
                <h3 className="font-bold text-ink font-heading mb-3">Latest Engineered Features</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Stock</TableHead>
                        <TableHead className="text-right">MA20</TableHead>
                        <TableHead className="text-right">Daily Return</TableHead>
                        <TableHead className="text-right">Volatility 20</TableHead>
                        <TableHead className="text-right">Volume Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.stockPredictions.map((p) => (
                        <TableRow key={p.symbol}>
                          <TableCell className="font-mono font-semibold text-ink">{p.symbol}</TableCell>
                          <TableCell className="text-right font-mono">{fmtMoney(p.ma20)}</TableCell>
                          <TableCell className={`text-right font-mono ${p.dailyReturn >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {fmtPct(p.dailyReturn * 100)}
                          </TableCell>
                          <TableCell className="text-right font-mono">{fmtPct(p.volatility20 * 100)}</TableCell>
                          <TableCell className={`text-right font-mono ${p.volumeChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {fmtPct(p.volumeChange * 100)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </motion.section>

            {/* ---- Actual vs predicted ---- */}
            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
              <div className="bg-card rounded-2xl border-2 border-ink/10 p-6 sm:p-8 shadow-sm notebook-card">
                <h2 className="text-xl font-bold text-ink font-heading mb-1">Actual vs Predicted</h2>
                <p className="text-sm text-ink/40 mb-4">
                  {bestModel.name} on the held-out test period — solid orange is the dashed prediction, blue is what actually happened next day.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {results.stockPredictions.map((p) => (
                    <button
                      key={p.symbol}
                      onClick={() => setChartSymbol(p.symbol)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold font-mono transition-all duration-200 ${
                        chartSymbol === p.symbol
                          ? "bg-blue-ink text-white shadow-md"
                          : "bg-ink/5 text-ink/60 hover:bg-ink/10"
                      }`}
                    >
                      {p.symbol}
                    </button>
                  ))}
                </div>
                {chartSymbol && results.actualVsPredicted[chartSymbol] && (
                  <ActualVsPredictedChart points={results.actualVsPredicted[chartSymbol]} symbol={chartSymbol} />
                )}
              </div>
            </motion.section>

            {/* ---- Feature importance ---- */}
            {bestModel.featureImportance && (
              <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
                <div className="bg-card rounded-2xl border-2 border-ink/10 p-6 sm:p-8 shadow-sm notebook-card">
                  <h2 className="text-xl font-bold text-ink font-heading mb-1">Feature Importance</h2>
                  <p className="text-sm text-ink/40 mb-4">
                    How much each engineered feature contributed to reducing prediction error in {bestModel.name}
                    (accumulated split-gain, normalized to 100%).
                  </p>
                  <div className="max-w-2xl">
                    <FeatureImportanceChart
                      items={results.featureCols.map((f, i) => ({
                        feature: f,
                        importance: bestModel.featureImportance?.[i] ?? 0,
                      }))}
                    />
                  </div>
                </div>
              </motion.section>
            )}

            {/* ---- Diagnostics ---- */}
            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
              <div className="bg-card rounded-2xl border-2 border-ink/10 p-6 sm:p-8 shadow-sm notebook-card">
                <h2 className="text-xl font-bold text-ink font-heading mb-6">Diagnostics & Validation</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <StatCard
                    label="Linear Reg. R²"
                    value={lrResult ? fmtNum(lrResult.r2, 4) : "—"}
                    sub="Baseline model on the test set"
                    accent={lrResult && lrResult.r2 >= 0 ? "text-green-600" : "text-red-500"}
                  />
                  <StatCard
                    label="Directional Acc."
                    value={fmtPct(bestModel.directionalAccuracy)}
                    sub={`${bestModel.name} on test set`}
                    accent="text-blue-ink"
                  />
                  <StatCard
                    label="Mean CV MAE"
                    value={fmtMoney(results.meanCvMae)}
                    sub="5-fold time-series CV, Linear Regression"
                    accent="text-ink"
                  />
                  <StatCard
                    label="Mean CV R²"
                    value={fmtNum(results.meanCvR2, 4)}
                    sub="Chronological folds — no shuffling"
                    accent={results.meanCvR2 >= 0 ? "text-green-600" : "text-red-500"}
                  />
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  {/* CV table */}
                  <div>
                    <h3 className="font-bold text-ink font-heading mb-3">Time-Series Cross-Validation</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Fold</TableHead>
                            <TableHead className="text-right">MAE</TableHead>
                            <TableHead className="text-right">R²</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.cvFolds.map((f) => (
                            <TableRow key={f.fold}>
                              <TableCell className="font-mono text-ink/60">{f.fold}</TableCell>
                              <TableCell className="text-right font-mono">{fmtNum(f.mae)}</TableCell>
                              <TableCell className={`text-right font-mono ${f.r2 >= 0 ? "text-green-600" : "text-red-500"}`}>
                                {fmtNum(f.r2, 4)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t-2 border-ink/10 font-bold">
                            <TableCell className="font-heading">Mean</TableCell>
                            <TableCell className="text-right font-mono">{fmtNum(results.meanCvMae)}</TableCell>
                            <TableCell className={`text-right font-mono ${results.meanCvR2 >= 0 ? "text-green-600" : "text-red-500"}`}>
                              {fmtNum(results.meanCvR2, 4)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Data + methodology */}
                  <div>
                    <h3 className="font-bold text-ink font-heading mb-3">Data Used</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard label="Training rows" value={results.trainRows.toLocaleString("en-IN")} sub={`${fmtDateShort(results.trainDateMin)} → ${fmtDateShort(results.trainDateMax)}`} />
                      <StatCard label="Test rows" value={results.testRows.toLocaleString("en-IN")} sub={`${fmtDateShort(results.testDateMin)} → ${fmtDateShort(results.testDateMax)}`} />
                      <StatCard label="Stocks analyzed" value={String(results.symbols.length)} sub={results.symbols.join(", ")} />
                      <StatCard label="Optuna trials" value="10" sub={`best validation MAE ${fmtMoney(results.tunedBestMae)}`} />
                    </div>

                    <div className="mt-4 bg-ink/[0.02] border-2 border-ink/10 rounded-xl p-4 flex items-start gap-2">
                      <Info size={16} className="text-blue-ink shrink-0 mt-0.5" />
                      <p className="text-xs text-ink/50 leading-relaxed">
                        <span className="font-semibold text-ink/70">Implementation notes:</span> SVR runs as RBF kernel
                        ridge regression (the browser-native cousin of kernel SVR); “XGBoost” is gradient boosting with
                        row/column subsampling matching the notebook's XGBRegressor; tuning uses a time-based validation
                        split with 10 seeded random-search trials. Everything executes locally — no data is uploaded.
                        Educational prototype, not financial advice.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-8">
                  <button
                    onClick={handleRun}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-ink text-white text-sm font-semibold rounded-xl hover:bg-blue-ink/90 transition-all duration-200 shadow"
                  >
                    <RefreshCw size={16} /> Run again
                  </button>
                  <button
                    onClick={() => {
                      setResults(null);
                      setPhase("ready");
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink/5 text-ink text-sm font-semibold rounded-xl hover:bg-ink/10 transition-all duration-200"
                  >
                    <UploadCloud size={16} /> Upload a different file
                  </button>
                </div>
              </div>
            </motion.section>
          </>
        )}
      </main>

      {/* ============ FOOTER ============ */}
      <footer className="border-t-2 border-ink/10 bg-ink/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-xs text-ink/30">
            MarketLens ML Lab is an educational prototype — predictions are not financial advice.
            All computation happens locally in your browser.
          </p>
        </div>
      </footer>
    </div>
  );
}