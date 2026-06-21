/**
 * The validation boundary — Oblique's "Pydantic" (we use **Zod v4**, the
 * idiomatic TypeScript equivalent: schema-first, runtime-validated, type-inferred).
 *
 * QVAC parses an uploaded PDF into loosely-typed JSON whose shape varies per
 * document. Before that JSON is ever trusted — prefilled into the form, sealed on
 * Terminal 3, or scored — it passes through `parseCreditInput`, which:
 *   • coerces messy LLM/heuristic output (e.g. "$17,000,000", "1.45×", "yes")
 *     into the strict numeric/boolean types `CreditInput` requires,
 *   • clamps out-of-range values (e.g. bureau grade to 1..5),
 *   • fills anything absent with a safe default so the form always renders,
 *   • and reports which fields were missing / low-confidence so the UI can ask
 *     the user to review them before scoring.
 *
 * Pure + isomorphic: the upload route validates server-side, and the same schema
 * can guard the client.
 */

import { z } from "zod";
import type { CreditInput } from "./types";

/** Strip currency symbols, thousands separators and stray text from a numeric value. */
function toNumber(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v !== "string") return undefined;
  let s = v.trim();
  if (!s) return undefined;
  // keep a leading sign, digits, dot, comma; drop currency, ×, %, spaces, letters
  s = s.replace(/[^0-9.,-]/g, "");
  // treat comma as a thousands separator (sample data is USD-style)
  s = s.replace(/,/g, "");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

function toBoolean(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return /^(true|yes|y|1|npl|active)$/i.test(v.trim());
  return false;
}

/** A coercing number field that defaults to 0 when absent or unparseable. */
const num = z.preprocess((v) => toNumber(v) ?? 0, z.number());
/** A coercing string field that defaults to "". */
const str = z.preprocess((v) => (v == null ? "" : String(v).trim()), z.string());

export const CreditInputSchema = z.object({
  // identity (PII)
  companyName: str,
  debtorName: str,
  npwp: str,
  nib: str,
  companyAddress: str,
  establishedDate: str,

  // business profile
  sector: str,
  industry: str,
  yearsInBusiness: num,

  // facility
  loanPurpose: str,
  plafonRequested: num,
  plafonApproved: num,
  tenorMonths: z.preprocess((v) => toNumber(v) ?? 12, z.number()),
  interestRate: num,
  repaymentScheme: str,

  // latest-year financials
  revenue: num,
  cogs: num,
  operatingProfit: num,
  netIncome: num,
  ebitda: num,
  interestExpense: num,
  totalAssets: num,
  totalEquity: num,
  totalLiabilities: num,
  currentAssets: num,
  currentLiabilities: num,
  cash: num,
  inventory: num,

  // debt service coverage
  dscrOptimistic: num,
  dscrModerate: num,
  dscrPessimistic: num,

  // collateral
  collateralType: str,
  collateralMarketValue: num,
  collateralLiquidationValue: num,

  // bureau
  slikQuality: z.preprocess(
    (v) => Math.min(5, Math.max(1, Math.round(toNumber(v) ?? 1))),
    z.number().int().min(1).max(5),
  ),
  hasNpl: z.preprocess(toBoolean, z.boolean()),
});

/** Human labels per field — single source for the QVAC prompt + the review UI. */
export const FIELD_LABELS: Record<keyof CreditInput, string> = {
  companyName: "Company name",
  debtorName: "Debtor name",
  npwp: "Tax ID",
  nib: "Business registration no.",
  companyAddress: "Address",
  establishedDate: "Established date (yyyy-mm-dd)",
  sector: "Sector",
  industry: "Industry",
  yearsInBusiness: "Years in business",
  loanPurpose: "Loan purpose",
  plafonRequested: "Credit limit requested",
  plafonApproved: "Credit limit approved",
  tenorMonths: "Tenor (months)",
  interestRate: "Interest rate (% p.a.)",
  repaymentScheme: "Repayment scheme",
  revenue: "Revenue",
  cogs: "COGS",
  operatingProfit: "Operating profit",
  netIncome: "Net income",
  ebitda: "EBITDA",
  interestExpense: "Interest expense",
  totalAssets: "Total assets",
  totalEquity: "Total equity",
  totalLiabilities: "Total liabilities",
  currentAssets: "Current assets",
  currentLiabilities: "Current liabilities",
  cash: "Cash & equivalents",
  inventory: "Inventory",
  dscrOptimistic: "DSCR — optimistic",
  dscrModerate: "DSCR — moderate",
  dscrPessimistic: "DSCR — pessimistic",
  collateralType: "Collateral type",
  collateralMarketValue: "Collateral market value",
  collateralLiquidationValue: "Collateral liquidation value",
  slikQuality: "Bureau grade (1–5)",
  hasNpl: "Active NPL on bureau",
};

/** Fields a human MUST eyeball after an automated extraction (identity + the
 * load-bearing financials the score hinges on). Drives the review banner. */
const REVIEW_CRITICAL: (keyof CreditInput)[] = [
  "companyName",
  "sector",
  "plafonRequested",
  "plafonApproved",
  "revenue",
  "netIncome",
  "ebitda",
  "totalLiabilities",
  "totalEquity",
  "dscrModerate",
  "collateralLiquidationValue",
];

export interface ParseReport {
  data: CreditInput;
  /** Keys absent / blank / zero in the raw extraction — surfaced for review. */
  missing: (keyof CreditInput)[];
  /** Critical keys among `missing` the user should double-check before scoring. */
  reviewCritical: (keyof CreditInput)[];
  /** Hard validation errors (rare — the schema is lenient by design). */
  issues: string[];
}

function isBlank(raw: Record<string, unknown>, key: string): boolean {
  if (!(key in raw)) return true;
  const v = raw[key];
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (typeof v === "number") return !Number.isFinite(v) || v === 0;
  return false;
}

/**
 * Validate + coerce arbitrary parsed JSON into a strict `CreditInput`, and report
 * which fields were missing so the UI can flag them. Never throws on a malformed
 * value — it coerces or defaults; only a non-object input is rejected outright.
 */
export function parseCreditInput(raw: unknown): ParseReport {
  const obj: Record<string, unknown> =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const result = CreditInputSchema.safeParse(obj);
  const data = (result.success ? result.data : CreditInputSchema.parse({})) as CreditInput;

  const issues = result.success
    ? []
    : result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);

  const missing = (Object.keys(FIELD_LABELS) as (keyof CreditInput)[]).filter(
    (k) => k !== "hasNpl" && isBlank(obj, k),
  );
  const reviewCritical = missing.filter((k) => REVIEW_CRITICAL.includes(k));

  return { data, missing, reviewCritical, issues };
}
