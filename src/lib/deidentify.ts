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

/**
 * DSCR computed from the financials, per the standard lending definition
 * (Corporate Finance Institute): (EBITDA − cash taxes) / total debt service
 * (interest + principal due in the period). Independent of the scenario DSCRs the
 * document supplies, so an optimistic submitted DSCR can't carry the score alone.
 * Source: https://corporatefinanceinstitute.com/resources/commercial-lending/debt-service-coverage-ratio/
 */
export function computeDscr(input: CreditInput): number {
  // Cash taxes ≈ pre-tax income − net income (floored at 0).
  const pretax = input.operatingProfit - input.interestExpense;
  const cashTaxes = Math.max(0, pretax - input.netIncome);
  const noi = input.ebitda - cashTaxes;
  // Total debt service = interest + principal DUE IN THE PERIOD. Revolving /
  // bullet / interest-only / demand facilities don't amortize principal annually
  // (it's interest-only until maturity); amortizing facilities spread the
  // principal over the tenor. Treating a revolving line as fully amortized would
  // wildly overstate debt service and crush the DSCR.
  const scheme = (input.repaymentScheme || "").toLowerCase();
  const amortizes = !/revolv|bullet|interest[-\s]?only|demand|balloon/.test(scheme);
  const loanYears = Math.max(0.5, (input.tenorMonths || 12) / 12);
  const annualPrincipal = amortizes && input.plafonApproved > 0 ? input.plafonApproved / loanYears : 0;
  const debtService = input.interestExpense + annualPrincipal;
  if (!(debtService > 0)) return 0;
  const dscr = noi / debtService;
  return Number.isFinite(dscr) ? Math.max(0, dscr) : 0;
}

export function deidentify(input: CreditInput): DeidentifiedFeatures {
  const r = computeRatios(input);
  const dscrComputed = computeDscr(input);

  const result = scoreCredit({
    dscrModerate: input.dscrModerate,
    dscrPessimistic: input.dscrPessimistic,
    dscrComputed,
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
    requestedAmount: input.plafonRequested,
    approvedAmount: input.plafonApproved,
    tenorMonths: input.tenorMonths,
    interestRatePct: input.interestRate,
    repaymentScheme: input.repaymentScheme,

    // derived ratios
    dscrModerate: round(input.dscrModerate),
    dscrOptimistic: round(input.dscrOptimistic),
    dscrPessimistic: round(input.dscrPessimistic),
    dscrComputed: round(dscrComputed),
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

    // flexible context — scrubbed of identifiers before it may cross to the LLM
    extrasContext: sanitizeExtras(input.extras, input),
  };
}

/** Free-text patterns that likely encode an identifier — dropped from extras. */
const EXTRA_PII_RE = /([\w.+-]+@[\w-]+\.[\w.-]+)|(\+?\d[\d ().-]{6,}\d)|(\b\d{7,}\b)/;

/**
 * Scrub the raw `extras` bag so only NON-identifying context crosses the firewall.
 * Drops any entry whose label/value contains one of the application's known
 * identifiers (company/debtor name, tax id, NIB, address, established date) or
 * looks like an email, phone number, or long id number. The score never sees
 * extras; this only governs what qualitative context the external LLM may read.
 */
function sanitizeExtras(
  extras: Record<string, string> | undefined,
  input: CreditInput,
): Record<string, string> | undefined {
  if (!extras) return undefined;
  const identifiers = PII_KEYS.map((k) => String(input[k] ?? "").toLowerCase().trim()).filter(
    (v) => v.length >= 4,
  );
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(extras)) {
    const key = String(k).trim();
    const val = String(v ?? "").trim();
    if (!key || !val) continue;
    const hay = `${key} ${val}`.toLowerCase();
    if (identifiers.some((id) => hay.includes(id))) continue; // contains a known identifier value
    if (EXTRA_PII_RE.test(key) || EXTRA_PII_RE.test(val)) continue; // looks like email/phone/id
    out[key] = val;
  }
  return Object.keys(out).length ? out : undefined;
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
