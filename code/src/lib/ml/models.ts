// ============================================================
// models.ts — ML models implemented in pure TypeScript
// ============================================================
// Everything runs locally in the browser (no Python needed):
//   1. Linear Regression        — closed-form ridge solution
//   2. SVR                      — RBF kernel ridge regression
//      (the browser-native equivalent of kernel SVR)
//   3. Gradient Boosting        — gradient-boosted regression trees
//   4. XGBoost-style GBM        — boosting + row/column subsampling
//      (mirrors the notebook's XGBRegressor parameters)
// ============================================================

import { mulberry32, sampleIndices, type Rng } from "./random";

export interface TrainedModel {
  key: string;
  name: string;
  note: string;
  predict: (X: number[][]) => number[];
  /** Per-feature normalized importance (tree models only) */
  featureImportance: number[] | null;
}

// ------------------------------------------------------------
// Small linear-algebra helpers
// ------------------------------------------------------------

/** Solve A x = b via Gauss–Jordan elimination with partial pivoting */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  if (n === 0) return [];
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-13) continue;
    if (pivot !== col) {
      const tmp = M[col];
      M[col] = M[pivot];
      M[pivot] = tmp;
    }
    const diag = M[col][col];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / diag;
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    x[i] = Math.abs(M[i][i]) > 1e-13 ? M[i][n] / M[i][i] : 0;
  }
  return x;
}

function mean(v: number[]): number {
  if (v.length === 0) return 0;
  let s = 0;
  for (const x of v) s += x;
  return s / v.length;
}

// ------------------------------------------------------------
// 1. Linear Regression (ridge, closed form, with intercept)
// ------------------------------------------------------------

export function trainLinearRidge(
  X: number[][],
  y: number[],
  lambda = 1e-6,
): TrainedModel {
  const n = X.length;
  const p = X[0].length;
  const q = p + 1; // + intercept column

  const XtX: number[][] = Array.from({ length: q }, () => new Array(q).fill(0));
  const Xty: number[] = new Array(q).fill(0);

  for (let i = 0; i < n; i++) {
    const row = X[i];
    for (let r = 0; r < q; r++) {
      const xr = r < p ? row[r] : 1;
      Xty[r] += xr * y[i];
      for (let c = 0; c < q; c++) {
        const xc = c < p ? row[c] : 1;
        XtX[r][c] += xr * xc;
      }
    }
  }
  for (let r = 0; r < q; r++) XtX[r][r] += lambda;
  const w = solveLinear(XtX, Xty);

  return {
    key: "lr",
    name: "Linear Regression",
    note: "Closed-form ridge regression on MA20, returns, volatility and volume change — the notebook's baseline model.",
    predict: (Xp) =>
      Xp.map((row) => {
        let s = w[q - 1];
        for (let j = 0; j < p; j++) s += w[j] * row[j];
        return s;
      }),
    featureImportance: null,
  };
}

// ------------------------------------------------------------
// 2. SVR — RBF kernel ridge regression
// ------------------------------------------------------------

export interface KrrOptions {
  /** Max support rows kept for the dense kernel matrix */
  maxSamples?: number;
  lambda?: number;
}

export function trainKernelRidgeRBF(
  X: number[][],
  y: number[],
  opts: KrrOptions = {},
): TrainedModel {
  const n = X.length;
  const p = X[0].length;
  const maxSamples = opts.maxSamples ?? 500;
  // Small λ ≈ large C: kernel ridge with a standardized target behaves
  // like RBF SVR with a soft margin (C ≈ 1/λ).
  const lambda = opts.lambda ?? 0.1;

  // Standardize with stats from the full training set
  const means = new Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    for (let i = 0; i < n; i++) means[j] += X[i][j];
    means[j] /= n;
  }
  const variances = new Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    for (let i = 0; i < n; i++) {
      const d = X[i][j] - means[j];
      variances[j] += d * d;
    }
    variances[j] /= n;
  }
  const stds = variances.map((v) => (v > 1e-12 ? Math.sqrt(v) : 1));
  // Inputs are standardized, so each feature has variance 1 —
  // gamma = 1/(p · 1), matching sklearn's gamma='scale' on scaled data.
  const gamma = 1 / p;

  const rbf = (a: number[], b: number[]): number => {
    let d2 = 0;
    for (let j = 0; j < a.length; j++) {
      const d = a[j] - b[j];
      d2 += d * d;
    }
    return Math.exp(-gamma * d2);
  };
  const standardize = (row: number[]): number[] =>
    row.map((v, j) => (v - means[j]) / stds[j]);

  // Pick support rows (evenly spread if the dataset is large)
  const idx: number[] = [];
  if (n <= maxSamples) {
    for (let i = 0; i < n; i++) idx.push(i);
  } else {
    const step = n / maxSamples;
    for (let k = 0; k < maxSamples; k++) {
      idx.push(Math.min(n - 1, Math.floor(k * step)));
    }
  }
  const Xs = idx.map((i) => standardize(X[i]));
  // Standardize the target so λ means the same thing across stocks
  const yMean = mean(y);
  const yVar = y.reduce((acc, yi) => acc + (yi - yMean) ** 2, 0) / n;
  const yStd = yVar > 1e-12 ? Math.sqrt(yVar) : 1;
  const ys = idx.map((i) => (y[i] - yMean) / yStd);

  // K = RBF kernel matrix, solve (K + λI) α = y
  const K: number[][] = [];
  for (let i = 0; i < Xs.length; i++) {
    K.push(new Array(Xs.length).fill(0));
    for (let j = 0; j < Xs.length; j++) {
      K[i][j] = rbf(Xs[i], Xs[j]);
    }
    K[i][i] += lambda;
  }
  const alpha = solveLinear(K, ys);

  return {
    key: "svr",
    name: "SVR (RBF kernel)",
    note: "RBF kernel ridge regression — the browser-native equivalent of kernel SVR (γ = 1/(p·Var), C ≈ 10 via λ = 0.1).",
    predict: (Xp) =>
      Xp.map((row) => {
        const z = standardize(row);
        let s = 0;
        for (let j = 0; j < Xs.length; j++) s += alpha[j] * rbf(z, Xs[j]);
        return s * yStd + yMean;
      }),
    featureImportance: null,
  };
}

// ------------------------------------------------------------
// Regression decision tree (squared-error splits)
// ------------------------------------------------------------

export interface TreeParams {
  maxDepth: number;
  minSamplesLeaf: number;
  minSamplesSplit: number;
  /** Number of features to try per split (column subsampling) */
  maxFeatures: number | null;
}

export interface TreeNode {
  /** Leaf value (mean) */
  value: number;
  /** Samples reaching this node */
  n: number;
  feature: number;
  threshold: number;
  left: TreeNode | null;
  right: TreeNode | null;
  /** SSE reduction at this split (for feature importance) */
  gain: number;
}

interface SplitCandidate {
  feature: number;
  threshold: number;
  gain: number;
  left: number[];
  right: number[];
}

function sseOf(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  let sumSq = 0;
  for (const v of values) {
    sum += v;
    sumSq += v * v;
  }
  return sumSq - (sum * sum) / values.length;
}

function bestSplitForFeature(
  X: number[][],
  y: number[],
  order: number[],
  feature: number,
  totalSSE: number,
  minSamplesLeaf: number,
): SplitCandidate | null {
  let totalSum = 0;
  let totalSumSq = 0;
  for (const i of order) {
    totalSum += y[i];
    totalSumSq += y[i] * y[i];
  }

  let leftSum = 0;
  let leftSumSq = 0;
  let best: SplitCandidate | null = null;

  for (let i = 0; i < order.length - 1; i++) {
    const r = order[i];
    leftSum += y[r];
    leftSumSq += y[r] * y[r];
    if (X[order[i]][feature] === X[order[i + 1]][feature]) continue;
    const leftN = i + 1;
    const rightN = order.length - leftN;
    if (leftN < minSamplesLeaf || rightN < minSamplesLeaf) continue;
    const rightSum = totalSum - leftSum;
    const rightSumSq = totalSumSq - leftSumSq;
    const leftSSE = leftSumSq - (leftSum * leftSum) / leftN;
    const rightSSE = rightSumSq - (rightSum * rightSum) / rightN;
    const gain = totalSSE - leftSSE - rightSSE;
    if (best === null || gain > best.gain) {
      best = {
        feature,
        threshold: (X[order[i]][feature] + X[order[i + 1]][feature]) / 2,
        gain,
        left: order.slice(0, i + 1),
        right: order.slice(i + 1),
      };
    }
  }
  return best;
}

export function buildTree(
  X: number[][],
  y: number[],
  indices: number[],
  params: TreeParams,
  rng: Rng,
  depth: number,
): TreeNode {
  const n = indices.length;
  const values = indices.map((i) => y[i]);
  const value = mean(values);
  const leaf = (): TreeNode => ({
    value,
    n,
    feature: -1,
    threshold: 0,
    left: null,
    right: null,
    gain: 0,
  });

  if (depth >= params.maxDepth || n < params.minSamplesSplit) return leaf();

  // Stop if all targets identical
  let allSame = true;
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[0]) {
      allSame = false;
      break;
    }
  }
  if (allSame) return leaf();

  const totalSSE = sseOf(values);
  const p = X[0].length;

  let features: number[];
  if (params.maxFeatures !== null && params.maxFeatures < p) {
    features = sampleIndices(rng, p, params.maxFeatures);
  } else {
    features = new Array(p);
    for (let j = 0; j < p; j++) features[j] = j;
  }

  let best: SplitCandidate | null = null;
  for (const f of features) {
    const order = [...indices].sort((a, b) => X[a][f] - X[b][f]);
    const cand = bestSplitForFeature(X, y, order, f, totalSSE, params.minSamplesLeaf);
    if (cand && (best === null || cand.gain > best.gain)) best = cand;
  }

  if (!best || best.gain <= 1e-12) return leaf();

  return {
    value,
    n,
    feature: best.feature,
    threshold: best.threshold,
    left: buildTree(X, y, best.left, params, rng, depth + 1),
    right: buildTree(X, y, best.right, params, rng, depth + 1),
    gain: best.gain,
  };
}

export function predictTree(node: TreeNode, row: number[]): number {
  let cur = node;
  while (cur.left && cur.right) {
    cur = row[cur.feature] <= cur.threshold ? cur.left : cur.right;
  }
  return cur.value;
}

// ------------------------------------------------------------
// 3 & 4. Gradient-boosted regression trees (GBM / XGBoost-style)
// ------------------------------------------------------------

export interface GbmParams {
  nEstimators: number;
  learningRate: number;
  maxDepth: number;
  minSamplesLeaf: number;
  minSamplesSplit: number;
  /** Row subsampling fraction per tree (XGBoost subsample) */
  subsample: number;
  /** Column subsampling fraction per tree (XGBoost colsample_bytree) */
  colsampleByTree: number;
}

export interface GbmIdentity {
  key: string;
  name: string;
  note: string;
}

export function trainGradientBoostedTrees(
  X: number[][],
  y: number[],
  params: GbmParams,
  rng: Rng,
  identity: GbmIdentity,
): TrainedModel {
  const n = X.length;
  const p = X[0].length;
  const base = mean(y);
  const pred = new Array(n).fill(base);
  const trees: TreeNode[] = [];
  const importance = new Array(p).fill(0);
  const allIndices = new Array(n);
  for (let i = 0; i < n; i++) allIndices[i] = i;

  const maxFeatures =
    params.colsampleByTree > 0 && params.colsampleByTree < 1
      ? Math.max(1, Math.round(p * params.colsampleByTree))
      : null;

  for (let m = 0; m < params.nEstimators; m++) {
    // Negative gradient = residuals for squared error
    const residual = new Array(n);
    for (let i = 0; i < n; i++) residual[i] = y[i] - pred[i];

    let idx = allIndices;
    if (params.subsample > 0 && params.subsample < 1) {
      idx = sampleIndices(rng, n, Math.max(1, Math.round(n * params.subsample)));
    }

    const tree = buildTree(
      X,
      residual,
      idx,
      {
        maxDepth: params.maxDepth,
        minSamplesLeaf: params.minSamplesLeaf,
        minSamplesSplit: params.minSamplesSplit,
        maxFeatures,
      },
      rng,
      0,
    );

    // Recompute leaf values on the FULL residuals (standard GBM step)
    refineLeafValues(tree, X, residual, n);

    trees.push(tree);
    for (let i = 0; i < n; i++) {
      pred[i] += params.learningRate * predictTree(tree, X[i]);
    }
    collectImportance(tree, importance, n);
  }

  const totalImp = importance.reduce((a, b) => a + b, 0);
  const featureImportance =
    totalImp > 1e-12 ? importance.map((v) => v / totalImp) : null;

  return {
    ...identity,
    predict: (Xp) =>
      Xp.map((row) => {
        let s = base;
        for (const t of trees) s += params.learningRate * predictTree(t, row);
        return s;
      }),
    featureImportance,
  };
}

/** Re-set leaf values to the mean residual of all rows reaching each leaf */
function refineLeafValues(root: TreeNode, X: number[][], residual: number[], n: number): void {
  const sums = new Map<TreeNode, { sum: number; count: number }>();
  for (let i = 0; i < n; i++) {
    let cur = root;
    while (cur.left && cur.right) {
      cur = X[i][cur.feature] <= cur.threshold ? cur.left : cur.right;
    }
    const acc = sums.get(cur) ?? { sum: 0, count: 0 };
    acc.sum += residual[i];
    acc.count++;
    sums.set(cur, acc);
  }
  for (const [node, acc] of sums) {
    node.value = acc.count > 0 ? acc.sum / acc.count : node.value;
  }
}

function collectImportance(node: TreeNode, importance: number[], totalN: number): void {
  if (node.left && node.right) {
    const weight = node.n / totalN;
    importance[node.feature] += node.gain * weight;
    collectImportance(node.left, importance, totalN);
    collectImportance(node.right, importance, totalN);
  }
}

// ------------------------------------------------------------
// Metric helpers
// ------------------------------------------------------------

export function meanAbsError(pred: number[], actual: number[]): number {
  let s = 0;
  for (let i = 0; i < pred.length; i++) s += Math.abs(pred[i] - actual[i]);
  return s / pred.length;
}

export function rootMeanSquaredError(pred: number[], actual: number[]): number {
  let s = 0;
  for (let i = 0; i < pred.length; i++) {
    const d = pred[i] - actual[i];
    s += d * d;
  }
  return Math.sqrt(s / pred.length);
}

export function r2Score(pred: number[], actual: number[]): number {
  const m = mean(actual);
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < pred.length; i++) {
    ssRes += (actual[i] - pred[i]) ** 2;
    ssTot += (actual[i] - m) ** 2;
  }
  if (ssTot === 0) return Number.NaN;
  return 1 - ssRes / ssTot;
}

/** Percentage of times the model predicted up vs down correctly */
export function directionalAccuracy(pred: number[], actual: number[], baseline: number[]): number {
  if (pred.length === 0) return 0;
  let hits = 0;
  for (let i = 0; i < pred.length; i++) {
    const actualUp = actual[i] > baseline[i];
    const predUp = pred[i] > baseline[i];
    if (actualUp === predUp) hits++;
  }
  return (hits / pred.length) * 100;
}

export function defaultRng(): Rng {
  return mulberry32(42);
}