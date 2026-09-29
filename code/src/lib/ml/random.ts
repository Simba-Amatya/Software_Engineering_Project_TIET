// ============================================================
// random.ts — Seeded PRNG (mulberry32) for reproducible results
// ============================================================
// Every model run uses the same seed so re-running an analysis
// on the same file gives identical numbers, like setting
// random_state=42 in the Python notebook.
// ============================================================

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform float in [min, max) */
export function uniform(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** Uniform integer in [min, max] (inclusive) */
export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(uniform(rng, min, max + 1));
}

/** Log-uniform float between min and max */
export function logUniform(rng: Rng, min: number, max: number): number {
  const lnMin = Math.log(min);
  const lnMax = Math.log(max);
  return Math.exp(lnMin + (lnMax - lnMin) * rng());
}

/**
 * Pick `k` distinct indices from 0..n-1 (partial Fisher–Yates).
 * Returns a new array of the selected indices.
 */
export function sampleIndices(rng: Rng, n: number, k: number): number[] {
  const arr = new Array(n);
  for (let i = 0; i < n; i++) arr[i] = i;
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (n - i));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr.slice(0, k);
}

/** Standard normal via Box–Muller */
export function gaussian(rng: Rng): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}