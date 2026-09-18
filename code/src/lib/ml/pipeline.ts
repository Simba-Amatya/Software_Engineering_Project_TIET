// ============================================================
// pipeline.ts — Full ML pipeline, mirroring the Colab notebook
// ============================================================
// Split (80/20 per symbol) → 5 models → Optuna-style random
// search over XGBoost hyperparameters → evaluation (MAE, RMSE,
// R², directional accuracy) → time-series cross-validation.
//
// Runs entirely in the browser. The pipeline yields between
// stages so the UI can show progress while training.
// ============================================================

import type { FeatureRow } from "./features";
import {
  defaultRng,
  trainGradientBoostedTrees,
  trainKernelRidgeRBF,
  trainLinearRidge,
  meanAbsError,
  rootMeanSquaredError,
  r2Score,
  directionalAccuracy,
  type TrainedModel,
} from "./models";
import { logUniform, randInt, uniform, type Rng } from "./random";

export const FEATURE_COLS = ["MA20", "Daily Return", "Volatility20", "Volume Change"];

export interface ModelResult {
  key: string;
  name: string;
  note: string;
  mae: number;
  rmse: number;
  r2: number;
  directionalAccuracy: number;
  predictions: number[];
  featureImportance: number[] | null;
}

export interface CvFold {
  fold: number;
  mae: number;
  r2: number;
}

export type Trend = "Bullish" | "Bearish" | "Neutral";

export interface StockPrediction {
  symbol: string;
  currentPrice: number;
  predictedPrice: number;
  changePct: number;
  trend: Trend;
  model: string;
  ma20: number;
  dailyReturn: number;
  volatility20: number;
  volumeChange: number;
}

export interface SeriesPoint {
  date: string;
  actual: number;
  predicted: number;
}

export interface PipelineResults {
  featureCols: string[];
  symbols: string[];
  trainRows: number;
  testRows: number;
  trainDateMin: string;
  trainDateMax: string;
  testDateMin: string;
  testDateMax: string;
  modelResults: ModelResult[];
  bestModel: ModelResult;
  stockPredictions: StockPrediction[];
  actualVsPredicted: Record<string, SeriesPoint[]>;
  cvFolds: CvFold[];
  meanCvMae: number;
  meanCvR2: number;
  tunedParams: Record<string, string>;
  tunedBestMae: number;
}

const MAX_ROWS_PER_SYMBOL = 800;
const MAX_ROWS_PER_SYMBOL_MANY = 400;
const OPTUNA_TRIALS = 10;
const OPTUNA_ROWS_PER_SYMBOL = 200;

export type StageCallback = (step: number, label: string) => void;

const yieldToUi = (ms = 0) => new Promise((r) => setTimeout(r, ms));

interface SplitData {
  symbols: string[];
  XTrain: number[][];
  yTrain: number[];
  XTest: number[][];
  yTest: number[];
  testClose: number[];
  testDate: string[];
  testSymbol: string[];
  trainRows: FeatureRow[];
  testRows: FeatureRow[];
  trainDateMin: string;
  trainDateMax: string;
  testDateMin: string;
  testDateMax: string;
}

function featuresOf(row: FeatureRow): number[] {
  return [row.ma20, row.dailyReturn, row.volatility20, row.volumeChange];
}

function buildSplit(featureRows: FeatureRow[], symbols: string[]): SplitData {
  const trainParts: FeatureRow[] = [];
  const testParts: FeatureRow[] = [];
  const usedSymbols: string[] = [];

  // Bound total work: many stocks → fewer rows per stock
  const rowsPerSymbol = symbols.length > 4 ? MAX_ROWS_PER_SYMBOL_MANY : MAX_ROWS_PER_SYMBOL;
  for (const symbol of symbols) {
    const rows = featureRows
      .filter((r) => r.symbol === symbol)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (rows.length < 25) continue;
    const capped = rows.slice(-rowsPerSymbol);
    const splitIdx = Math.floor(capped.length * 0.8);
    trainParts.push(...capped.slice(0, splitIdx));
    testParts.push(...capped.slice(splitIdx));
    usedSymbols.push(symbol);
  }

  const minMax = (rows: FeatureRow[]): [string, string] => {
    let min = "";
    let max = "";
    for (const r of rows) {
      if (!min || r.date < min) min = r.date;
      if (!max || r.date > max) max = r.date;
    }
    return [min, max];
  };

  const [trainDateMin, trainDateMax] = minMax(trainParts);
  const [testDateMin, testDateMax] = minMax(testParts);

  const XTrain = trainParts.map(featuresOf);
  const yTrain = trainParts.map((r) => r.targetNextClose);
  const XTest = testParts.map(featuresOf);
  const yTest = testParts.map((r) => r.targetNextClose);
  const testClose = testParts.map((r) => r.close);
  const testDate = testParts.map((r) => r.date);
  const testSymbol = testParts.map((r) => r.symbol);

  return {
    symbols: usedSymbols,
    XTrain,
    yTrain,
    XTest,
    yTest,
    testClose,
    testDate,
    testSymbol,
    trainRows: trainParts,
    testRows: testParts,
    trainDateMin,
    trainDateMax,
    testDateMin,
    testDateMax,
  };
}

// ------------------------------------------------------------
// Optuna-style random search (time-based validation split)
// ------------------------------------------------------------

interface TunedResult {
  params: Record<string, number>;
  bestMae: number;
}

function sampleParams(rng: Rng): Record<string, number> {
  return {
    // Ranges capped for snappy browser runs (notebook used 100–600 trees, depth 2–8)
    nEstimators: randInt(rng, 100, 300),
    learningRate: logUniform(rng, 0.01, 0.2),
    maxDepth: randInt(rng, 2, 6),
    minChildWeight: randInt(rng, 1, 10),
    subsample: uniform(rng, 0.6, 1.0),
    colsampleByTree: uniform(rng, 0.6, 1.0),
  };
}

function paramsToGbm(p: Record<string, number>) {
  return {
    nEstimators: p.nEstimators,
    learningRate: p.learningRate,
    maxDepth: p.maxDepth,
    minSamplesLeaf: p.minChildWeight,
    minSamplesSplit: 2,
    subsample: p.subsample,
    colsampleByTree: p.colsampleByTree,
  };
}

async function optunaTune(
  featureRows: FeatureRow[],
  symbols: string[],
  rng: Rng,
  onStage: StageCallback,
): Promise<TunedResult> {
  // Time-based validation split inside the training period (like the notebook)
  const oTrain: FeatureRow[] = [];
  const oValid: FeatureRow[] = [];
  for (const symbol of symbols) {
    const rows = featureRows
      .filter((r) => r.symbol === symbol)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (rows.length < 25) continue;
    const capped = rows.slice(-(symbols.length > 4 ? MAX_ROWS_PER_SYMBOL_MANY : MAX_ROWS_PER_SYMBOL));
    const splitIdx = Math.floor(capped.length * 0.8);
    const portion = capped.slice(0, splitIdx);
    const validSplit = Math.floor(portion.length * 0.8);
    oTrain.push(...portion.slice(0, validSplit).slice(-OPTUNA_ROWS_PER_SYMBOL));
    oValid.push(...portion.slice(validSplit));
  }

  const Xo = oTrain.map(featuresOf);
  const yo = oTrain.map((r) => r.targetNextClose);
  const Xv = oValid.map(featuresOf);
  const yv = oValid.map((r) => r.targetNextClose);

  let bestParams = sampleParams(rng);
  let bestMae = Number.POSITIVE_INFINITY;

  for (let t = 0; t < OPTUNA_TRIALS; t++) {
    const params = sampleParams(rng);
    const model = trainGradientBoostedTrees(Xo, yo, paramsToGbm(params), rng, {
      key: "trial",
      name: "Trial",
      note: "",
    });
    const mae = meanAbsError(model.predict(Xv), yv);
    if (mae < bestMae) {
      bestMae = mae;
      bestParams = params;
    }
    onStage(5, `Optuna-style tuning — trial ${t + 1}/${OPTUNA_TRIALS} (best validation MAE ${fmtMoney(bestMae)})`);
    await yieldToUi(10);
  }

  return { params: bestParams, bestMae };
}

function fmtMoney(v: number): string {
  return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ------------------------------------------------------------
// Main pipeline
// ------------------------------------------------------------

export async function runPipeline(
  featureRows: FeatureRow[],
  symbols: string[],
  onStage: StageCallback = () => {},
): Promise<PipelineResults> {
  const rng = defaultRng();

  onStage(0, "Splitting data into 80% train / 20% test per symbol");
  await yieldToUi(20);
  const split = buildSplit(featureRows, symbols);

  if (split.yTrain.length < 50) {
    throw new Error("Not enough cleaned rows to train on. Each selected stock needs at least ~25 rows with 20+ days of history.");
  }

  const models: TrainedModel[] = [];

  onStage(1, "Training Linear Regression (closed-form ridge)");
  await yieldToUi(20);
  models.push(trainLinearRidge(split.XTrain, split.yTrain));

  onStage(2, "Training SVR with RBF kernel (kernel ridge)");
  await yieldToUi(20);
  models.push(
    trainKernelRidgeRBF(split.XTrain, split.yTrain, { maxSamples: 500, lambda: 0.1 }),
  );

  onStage(3, "Training Gradient Boosting (200 trees, depth 3)");
  await yieldToUi(20);
  models.push(
    trainGradientBoostedTrees(
      split.XTrain,
      split.yTrain,
      {
        nEstimators: 200,
        learningRate: 0.05,
        maxDepth: 3,
        minSamplesLeaf: 1,
        minSamplesSplit: 2,
        subsample: 1,
        colsampleByTree: 1,
      },
      rng,
      {
        key: "gbr",
        name: "Gradient Boosting",
        note: "Gradient-boosted regression trees (n=200, lr=0.05, depth=3) — mirrors the notebook's GradientBoostingRegressor.",
      },
    ),
  );

  onStage(4, "Training XGBoost-style GBM (300 trees, subsample 0.8)");
  await yieldToUi(20);
  models.push(
    trainGradientBoostedTrees(
      split.XTrain,
      split.yTrain,
      {
        nEstimators: 300,
        learningRate: 0.05,
        maxDepth: 4,
        minSamplesLeaf: 1,
        minSamplesSplit: 2,
        subsample: 0.8,
        colsampleByTree: 0.8,
      },
      rng,
      {
        key: "xgb",
        name: "XGBoost",
        note: "Gradient boosting with row (0.8) and column (0.8) subsampling — the browser equivalent of XGBRegressor's defaults.",
      },
    ),
  );

  const tuned = await optunaTune(featureRows, symbols, rng, onStage);
  onStage(6, "Training Optuna-tuned XGBoost on the full training set");
  await yieldToUi(20);
  models.push(
    trainGradientBoostedTrees(
      split.XTrain,
      split.yTrain,
      paramsToGbm(tuned.params),
      rng,
      {
        key: "xgb_tuned",
        name: "Optuna-Tuned XGBoost",
        note: "Best hyperparameters from the random search, retrained on the full training set.",
      },
    ),
  );

  onStage(7, "Evaluating models and running 5-fold time-series CV");
  await yieldToUi(20);

  const modelResults: ModelResult[] = models.map((m) => {
    const predictions = m.predict(split.XTest);
    return {
      key: m.key,
      name: m.name,
      note: m.note,
      mae: meanAbsError(predictions, split.yTest),
      rmse: rootMeanSquaredError(predictions, split.yTest),
      r2: r2Score(predictions, split.yTest),
      directionalAccuracy: directionalAccuracy(predictions, split.yTest, split.testClose),
      predictions,
      featureImportance: m.featureImportance,
    };
  });

  modelResults.sort((a, b) => a.mae - b.mae);
  const bestModel = modelResults[0];

  // Winning predictions aligned to per-symbol test rows (chronological)
  const testRowsBySymbol = new Map<string, { row: FeatureRow; idx: number }[]>();
  split.testRows.forEach((row, idx) => {
    let arr = testRowsBySymbol.get(row.symbol);
    if (!arr) {
      arr = [];
      testRowsBySymbol.set(row.symbol, arr);
    }
    arr.push({ row, idx });
  });

  const stockPredictions: StockPrediction[] = [];
  const actualVsPredicted: Record<string, SeriesPoint[]> = {};

  for (const symbol of split.symbols) {
    const entries = testRowsBySymbol.get(symbol) ?? [];
    if (entries.length === 0) continue;
    entries.sort((a, b) => (a.row.date < b.row.date ? -1 : 1));

    actualVsPredicted[symbol] = entries.map(({ row, idx }) => ({
      date: row.date,
      actual: row.targetNextClose,
      predicted: bestModel.predictions[idx] ?? Number.NaN,
    }));

    const latest = entries[entries.length - 1];
    const predicted = bestModel.predictions[latest.idx];
    const changePct = ((predicted - latest.row.close) / latest.row.close) * 100;
    stockPredictions.push({
      symbol,
      currentPrice: latest.row.close,
      predictedPrice: predicted,
      changePct,
      trend: getTrend(latest.row.close, predicted),
      model: bestModel.name,
      ma20: latest.row.ma20,
      dailyReturn: latest.row.dailyReturn,
      volatility20: latest.row.volatility20,
      volumeChange: latest.row.volumeChange,
    });
  }

  // Time-series cross-validation (Linear Regression, 5 folds, chronological)
  const cvData = [...split.trainRows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const Xcv = cvData.map(featuresOf);
  const ycv = cvData.map((r) => r.targetNextClose);
  const nCv = Xcv.length;
  const testSize = Math.max(1, Math.floor(nCv / 6));
  const cvFolds: CvFold[] = [];
  for (let fold = 0; fold < 5; fold++) {
    const start = (fold + 1) * testSize;
    const end = Math.min((fold + 2) * testSize, nCv);
    if (start >= nCv || end <= start) continue;
    const Xtr = Xcv.slice(0, start);
    const ytr = ycv.slice(0, start);
    const Xte = Xcv.slice(start, end);
    const yte = ycv.slice(start, end);
    const cvModel = trainLinearRidge(Xtr, ytr);
    const p = cvModel.predict(Xte);
    cvFolds.push({
      fold: fold + 1,
      mae: meanAbsError(p, yte),
      r2: r2Score(p, yte),
    });
  }
  const meanCvMae = cvFolds.reduce((a, f) => a + f.mae, 0) / cvFolds.length;
  const meanCvR2 = cvFolds.reduce((a, f) => a + f.r2, 0) / cvFolds.length;

  return {
    featureCols: [...FEATURE_COLS],
    symbols: [...split.symbols],
    trainRows: split.trainRows.length,
    testRows: split.testRows.length,
    trainDateMin: split.trainDateMin,
    trainDateMax: split.trainDateMax,
    testDateMin: split.testDateMin,
    testDateMax: split.testDateMax,
    modelResults,
    bestModel,
    stockPredictions,
    actualVsPredicted,
    cvFolds,
    meanCvMae,
    meanCvR2,
    tunedParams: {
      n_estimators: String(Math.round(tuned.params.nEstimators)),
      learning_rate: tuned.params.learningRate.toFixed(3),
      max_depth: String(Math.round(tuned.params.maxDepth)),
      min_child_weight: String(Math.round(tuned.params.minChildWeight)),
      subsample: tuned.params.subsample.toFixed(2),
      colsample_bytree: tuned.params.colsampleByTree.toFixed(2),
    },
    tunedBestMae: tuned.bestMae,
  };
}

export function getTrend(currentPrice: number, predictedPrice: number, threshold = 0.01): Trend {
  if (!Number.isFinite(currentPrice) || currentPrice === 0) return "Neutral";
  const change = (predictedPrice - currentPrice) / currentPrice;
  if (change > threshold) return "Bullish";
  if (change < -threshold) return "Bearish";
  return "Neutral";
}