/**
 * The privacy firewall.
 *
 * Takes the raw, PII-bearing CreditInput and returns DeidentifiedFeatures:
 * derived ratios + the deterministic score, with every direct identifier
 * (company name, tax id, NIB, address, debtor name) DROPPED. This is the only
 * artefact allowed to cross to an external LLM. Pure + isomorphic so the UI can
 * preview ratios client-side and the server can re-run it authoritatively.
 */

import { scoreCredit } from "./scoring";
import type { CreditInput, DeidentifiedFeatures } from "./types";

const ratio = (a: number, b: number) => (b ? a / b : 0);

export function computeRatios(input: CreditInput) {
  return {
    currentRatio: ratio(input.currentAssets, input.currentLiabilities),
    quickRatio: ratio(input.currentAssets - input.inventory, input.currentLiabilities),
    cashRatio: ratio(input.cash, input.currentLiabilities),
    debtToEquity: ratio(input.totalLiabilities, input.totalEquity),
    debtToAsset: ratio(input.totalLiabilities, input.totalAssets),
    debtToEbitda: ratio(input.totalLiabilities, input.ebitda),
    interestCoverage: ratio(input.ebitda, input.interestExpense),
    netMargin: ratio(input.netIncome, input.revenue),
    operatingMargin: ratio(input.operatingProfit, input.revenue),
    returnOnAssets: ratio(input.netIncome, input.totalAssets),
    returnOnEquity: ratio(input.netIncome, input.totalEquity),
    collateralCoverageMarket: ratio(input.collateralMarketValue, input.plafonApproved),
    collateralCoverageLiquidation: ratio(input.collateralLiquidationValue, input.plafonApproved),
  };
}

export function deidentify(input: CreditInput): DeidentifiedFeatures {
  const r = computeRatios(input);

  const result = scoreCredit({
    dscrModerate: input.dscrModerate,
    dscrPessimistic: input.dscrPessimistic,
    debtToEquity: r.debtToEquity,
    debtToAsset: r.debtToAsset,
    currentRatio: r.currentRatio,
    quickRatio: r.quickRatio,
    cashRatio: r.cashRatio,
    netMargin: r.netMargin,
    operatingMargin: r.operatingMargin,
    returnOnAssets: r.returnOnAssets,
    interestCoverage: r.interestCoverage,
    collateralCoverageLiquidation: r.collateralCoverageLiquidation,
    slikQuality: input.slikQuality,
    hasNpl: input.hasNpl,
    yearsInBusiness: input.yearsInBusiness,
    sector: input.sector,
    plafonRequested: input.plafonRequested,
    plafonApproved: input.plafonApproved,
    repaymentScheme: input.repaymentScheme,
  });

  return {
    // non-identifying context
    sector: input.sector,
    industry: input.industry,
    companyAgeYears: input.yearsInBusiness,
    requestedPlafonIdr: input.plafonRequested,
    approvedPlafonIdr: input.plafonApproved,
    tenorMonths: input.tenorMonths,
    interestRatePct: input.interestRate,
    repaymentScheme: input.repaymentScheme,

    // derived ratios
    dscrModerate: round(input.dscrModerate),
    dscrOptimistic: round(input.dscrOptimistic),
    dscrPessimistic: round(input.dscrPessimistic),
    currentRatio: round(r.currentRatio),
    quickRatio: round(r.quickRatio),
    cashRatio: round(r.cashRatio),
    debtToEquity: round(r.debtToEquity),
    debtToAsset: round(r.debtToAsset),
    debtToEbitda: round(r.debtToEbitda),
    interestCoverage: round(r.interestCoverage),
    netMargin: round(r.netMargin),
    operatingMargin: round(r.operatingMargin),
    returnOnAssets: round(r.returnOnAssets),
    returnOnEquity: round(r.returnOnEquity),
    collateralCoverageMarket: round(r.collateralCoverageMarket),
    collateralCoverageLiquidation: round(r.collateralCoverageLiquidation),
    slikQuality: input.slikQuality,
    hasNpl: input.hasNpl,

    // deterministic scoring output
    baselineScore: result.score,
    baselineBand: result.band,
    probabilityOfDefaultPct: result.probabilityOfDefaultPct,
    pillars: result.pillars,
    reasonCodes: result.reasonCodes,
    flags: result.flags,
  };
}

/**
 * The set of raw input keys that are DIRECT IDENTIFIERS. The server asserts none
 * of these strings appear in the de-identified payload before it leaves the
 * boundary — a runtime guarantee that the firewall held.
 */
export const PII_KEYS: (keyof CreditInput)[] = [
  "companyName",
  "debtorName",
  "npwp",
  "nib",
  "companyAddress",
  "establishedDate",
];

function round(n: number, dp = 4): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
