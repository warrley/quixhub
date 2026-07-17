// Generic normal-distribution helpers — used to plot IRA against the
// program's assumed grade distribution (see src/data/iraDistribution.ts).

// Abramowitz & Stegun 7.1.26 approximation (max error ~1.5e-7).
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function normalPdf(x: number, mean: number, std: number): number {
  const z = (x - mean) / std;
  return Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI));
}

export function normalCdf(x: number, mean: number, std: number): number {
  return 0.5 * (1 + erf((x - mean) / (std * Math.SQRT2)));
}

export function zScore(x: number, mean: number, std: number): number {
  return (x - mean) / std;
}

// Grades are truncated at `cap` (no IRA can exceed 10), so the raw normal
// CDF overstates how much of the distribution sits below a given value —
// mass above the cap doesn't exist and needs to be excluded from the total.
// Renormalizing by the CDF at the cap redistributes that excluded mass
// across the valid range, giving the true percentile within [-inf, cap].
export function truncatedNormalCdf(x: number, mean: number, std: number, cap: number): number {
  return normalCdf(x, mean, std) / normalCdf(cap, mean, std);
}

// Grades (and therefore IRA) are bounded at 10 — computeIra's weighted
// average has no hard cap, so malformed input (e.g. a manually entered
// grade > 10) could push it past that. Clamp here rather than in
// computeIra itself, which is verified exact against a real transcript.
export function clampIra(value: number): number {
  return Math.min(value, 10);
}
