/**
 * Deterministic credit-scoring engine.
 *
 * This is the logic that runs INSIDE the confidential boundary (the Terminal 3
 * TEE). It is intentionally deterministic and auditable: credit decisions on a
 * hallucinated DSCR are unacceptable to the banks/regulators Terminal 3 serves,
 * so the *number* is pure arithmetic. The LLM only narrates the result later,
 * and only ever sees the de-identified output of this engine — never raw PII.
 *
 * Pure functions, no I/O — portable to a Rust→WASM contract later.
 */

import type { ReasonCode, RiskBand, ScorePillar, ScoreResult } from "./types";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** Piecewise-linear interpolation across (threshold → score) breakpoints. */
function curve(value: number, points: [number, number][]): number {
  if (!Number.isFinite(value)) return 0;
  const pts = [...points].sort((a, b) => a[0] - b[0]);
  if (value <= pts[0][0]) return pts[0][1];
  if (value >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (value >= x0 && value <= x1) {
      const t = (value - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
}

export interface ScoringInputs {
  dscrModerate: number;
  dscrPessimistic: number;
  debtToEquity: number;
  debtToAsset: number;
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  netMargin: number; // fraction (0.15 = 15%)
  operatingMargin: number;
  returnOnAssets: number;
  interestCoverage: number;
  collateralCoverageLiquidation: number;
  slikQuality: number; // 1..5
  hasNpl: boolean;
  yearsInBusiness: number;
  sector: string;
  plafonRequested: number;
  plafonApproved: number;
  repaymentScheme: string;
}

const CYCLICAL_SECTORS = ["konstruksi", "construction", "property", "properti", "mining", "tambang"];

function bandFor(score: number): RiskBand {
  if (score >= 88) return "AAA";
  if (score >= 80) return "AA";
  if (score >= 72) return "A";
  if (score >= 63) return "BBB";
  if (score >= 53) return "BB";
  if (score >= 42) return "B";
  return "CCC";
}

/** Through-the-cycle PD anchors per band, interpolated by intra-band position. */
function pdFor(score: number, band: RiskBand): number {
  const anchor: Record<RiskBand, number> = {
    AAA: 0.4,
    AA: 0.9,
    A: 1.8,
    BBB: 3.5,
    BB: 7,
    B: 13,
    CCC: 24,
  };
  const base = anchor[band];
  // nudge ±15% by how high within the 0..100 scale the score sits
  const adj = base * (1 + (70 - score) / 400);
  return Math.round(Math.max(0.2, adj) * 10) / 10;
}

export function scoreCredit(x: ScoringInputs): ScoreResult {
  const isCyclical = CYCLICAL_SECTORS.some((s) =>
    x.sector.toLowerCase().includes(s),
  );

  // ── Pillar 1: Debt service coverage (25%) ──
  const dscrScore = clamp(
    0.7 * curve(x.dscrModerate, [
      [0.8, 0],
      [1.0, 40],
      [1.25, 70],
      [1.5, 85],
      [2.0, 100],
    ]) +
      0.3 * curve(x.dscrPessimistic, [
        [0.8, 0],
        [1.0, 50],
        [1.25, 85],
        [1.5, 100],
      ]),
  );

  // ── Pillar 2: Leverage (15%) — lower is better ──
  const leverageScore = clamp(
    0.6 * curve(x.debtToEquity, [
      [0.3, 100],
      [1.0, 75],
      [2.0, 50],
      [3.0, 28],
      [4.0, 8],
    ]) +
      0.4 * curve(x.debtToAsset, [
        [0.1, 100],
        [0.3, 78],
        [0.5, 55],
        [0.7, 30],
        [0.9, 8],
      ]),
  );

  // ── Pillar 3: Liquidity (13%) ──
  const liquidityScore = clamp(
    0.5 * curve(x.currentRatio, [
      [0.8, 10],
      [1.0, 45],
      [1.2, 60],
      [1.5, 80],
      [2.0, 100],
    ]) +
      0.3 * curve(x.quickRatio, [
        [0.5, 15],
        [1.0, 60],
        [1.5, 90],
        [2.0, 100],
      ]) +
      0.2 * curve(x.cashRatio, [
        [0.2, 20],
        [0.5, 60],
        [1.0, 95],
        [1.3, 100],
      ]),
  );

  // ── Pillar 4: Profitability (15%) ──
  const profitabilityScore = clamp(
    0.4 * curve(x.netMargin, [
      [-0.05, 0],
      [0, 25],
      [0.05, 55],
      [0.1, 80],
      [0.15, 100],
    ]) +
      0.3 * curve(x.returnOnAssets, [
        [0, 15],
        [0.05, 50],
        [0.15, 85],
        [0.25, 100],
      ]) +
      0.3 * curve(x.operatingMargin, [
        [0, 15],
        [0.05, 50],
        [0.12, 85],
        [0.2, 100],
      ]),
  );

  // ── Pillar 5: Collateral coverage (15%) — liquidation value vs exposure ──
  const collateralScore = clamp(
    curve(x.collateralCoverageLiquidation, [
      [0.5, 10],
      [0.8, 40],
      [1.0, 65],
      [1.25, 85],
      [1.5, 100],
    ]),
  );

  // ── Pillar 6: Credit history / SLIK (12%) ──
  let historyScore = curve(x.slikQuality, [
    [1, 100],
    [2, 70],
    [3, 40],
    [4, 15],
    [5, 0],
  ]);
  if (x.hasNpl) historyScore = clamp(historyScore - 35);

  // ── Pillar 7: Business profile (5%) ──
  let profileScore = curve(x.yearsInBusiness, [
    [1, 25],
    [3, 45],
    [5, 65],
    [7, 80],
    [10, 100],
  ]);
  if (isCyclical) profileScore = clamp(profileScore - 12);

  const pillars: ScorePillar[] = [
    { key: "dscr", label: "Debt Service Coverage", weight: 0.25, score: Math.round(dscrScore), detail: `DSCR moderate ${x.dscrModerate.toFixed(2)}× · stress ${x.dscrPessimistic.toFixed(2)}×` },
    { key: "leverage", label: "Leverage", weight: 0.15, score: Math.round(leverageScore), detail: `DER ${x.debtToEquity.toFixed(2)}× · debt/asset ${x.debtToAsset.toFixed(2)}` },
    { key: "liquidity", label: "Liquidity", weight: 0.13, score: Math.round(liquidityScore), detail: `current ${x.currentRatio.toFixed(2)}× · quick ${x.quickRatio.toFixed(2)}×` },
    { key: "profitability", label: "Profitability", weight: 0.15, score: Math.round(profitabilityScore), detail: `net margin ${(x.netMargin * 100).toFixed(1)}% · ROA ${(x.returnOnAssets * 100).toFixed(1)}%` },
    { key: "collateral", label: "Collateral Coverage", weight: 0.15, score: Math.round(collateralScore), detail: `${x.collateralCoverageLiquidation.toFixed(2)}× liquidation value` },
    { key: "history", label: "Credit History (SLIK)", weight: 0.12, score: Math.round(historyScore), detail: x.hasNpl ? "active NPL flag" : `quality ${x.slikQuality} · clean` },
    { key: "profile", label: "Business Profile", weight: 0.05, score: Math.round(profileScore), detail: `${x.yearsInBusiness}y operating${isCyclical ? " · cyclical sector" : ""}` },
  ];

  const composite = pillars.reduce((sum, p) => sum + p.weight * p.score, 0);
  const score = Math.round(clamp(composite));
  const band = bandFor(score);
  const probabilityOfDefaultPct = pdFor(score, band);

  // ── Reason codes ──
  const reasonCodes: ReasonCode[] = [];
  const add = (kind: ReasonCode["kind"], code: string, message: string) =>
    reasonCodes.push({ kind, code, message });

  if (x.dscrModerate >= 1.4) add("positive", "DSCR_STRONG", `Comfortable debt-service cushion (DSCR ${x.dscrModerate.toFixed(2)}× in the moderate scenario).`);
  else if (x.dscrModerate < 1.2) add("watch", "DSCR_THIN", `Limited debt-service headroom (DSCR ${x.dscrModerate.toFixed(2)}×).`);
  if (x.dscrPessimistic <= 1.05) add("watch", "DSCR_STRESS", `Coverage collapses to ${x.dscrPessimistic.toFixed(2)}× under the pessimistic scenario — sensitive to project delays.`);

  if (x.debtToEquity <= 0.5) add("positive", "LOW_LEVERAGE", `Conservatively geared (DER ${x.debtToEquity.toFixed(2)}×).`);
  else if (x.debtToEquity >= 2) add("negative", "HIGH_LEVERAGE", `Elevated leverage (DER ${x.debtToEquity.toFixed(2)}×).`);

  if (x.currentRatio >= 1.5) add("positive", "LIQUID", `Healthy short-term liquidity (current ratio ${x.currentRatio.toFixed(2)}×).`);
  if (x.netMargin >= 0.1) add("positive", "PROFITABLE", `Solid profitability (net margin ${(x.netMargin * 100).toFixed(1)}%).`);

  if (x.collateralCoverageLiquidation < 1.1) add("watch", "COLLATERAL_THIN", `Collateral only ${x.collateralCoverageLiquidation.toFixed(2)}× the exposure at liquidation value — little margin if the facility sours.`);
  else if (x.collateralCoverageLiquidation >= 1.3) add("positive", "WELL_SECURED", `Well secured (${x.collateralCoverageLiquidation.toFixed(2)}× liquidation coverage).`);

  if (x.slikQuality === 1 && !x.hasNpl) add("positive", "CLEAN_BUREAU", "Clean credit bureau record — all facilities current.");
  if (x.hasNpl) add("negative", "ACTIVE_NPL", "Active non-performing loan on bureau record.");

  if (isCyclical) add("watch", "CYCLICAL", "Operates in a cyclical, project-based sector — revenue lumpy across the cycle.");
  if (x.plafonApproved < x.plafonRequested) add("watch", "PLAFON_CUT", `Approved facility reduced from request (${Math.round((1 - x.plafonApproved / x.plafonRequested) * 100)}% haircut) — risk already moderated by the lender.`);

  // ── Flags ──
  const flags: string[] = [];
  if (/bullet/i.test(x.repaymentScheme)) flags.push("bullet_principal_repayment");
  if (x.plafonApproved < x.plafonRequested) flags.push("plafon_reduced");
  if (isCyclical) flags.push("cyclical_sector");
  if (x.dscrPessimistic <= 1.05) flags.push("stress_dscr_near_unity");
  if (x.collateralCoverageLiquidation < 1.1) flags.push("thin_collateral_liquidation");

  return { score, band, probabilityOfDefaultPct, pillars, reasonCodes, flags };
}
