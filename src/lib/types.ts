/**
 * Oblique domain model.
 *
 * Data flows through three boundaries:
 *   1. CreditInput            — raw, sensitive. Contains PII. Entered in the UI,
 *                               sealed into the Terminal 3 vault. Never reaches the LLM.
 *   2. DeidentifiedFeatures   — the privacy firewall output. Ratios + score, NO identifiers.
 *                               Safe to send to an external LLM (OpenRouter).
 *   3. CreditVerdict / VC     — the agent's analysis + a verifiable credential a lender
 *                               can check without seeing the underlying data.
 */

/** Raw, sensitive credit application. Contains direct identifiers (PII). */
export interface CreditInput {
  // ── Identity (PII — stripped before the LLM ever sees it) ──
  companyName: string;
  debtorName: string;
  npwp: string; // tax id
  nib: string; // business registration no.
  companyAddress: string;
  establishedDate: string; // ISO yyyy-mm-dd

  // ── Non-identifying business profile (safe to keep) ──
  sector: string; // e.g. "Konstruksi"
  industry: string; // e.g. "Konstruksi Gedung"
  yearsInBusiness: number;

  // ── Facility ──
  loanPurpose: string;
  plafonRequested: number; // IDR
  plafonApproved: number; // IDR
  tenorMonths: number;
  interestRate: number; // % p.a.
  repaymentScheme: string;

  // ── Latest-year financials (IDR) ──
  revenue: number;
  cogs: number;
  operatingProfit: number;
  netIncome: number;
  ebitda: number;
  interestExpense: number;
  totalAssets: number;
  totalEquity: number;
  totalLiabilities: number;
  currentAssets: number;
  currentLiabilities: number;
  cash: number;
  inventory: number;

  // ── Debt service coverage (project scenarios) ──
  dscrOptimistic: number;
  dscrModerate: number;
  dscrPessimistic: number;

  // ── Collateral ──
  collateralType: string;
  collateralMarketValue: number; // IDR
  collateralLiquidationValue: number; // IDR

  // ── Credit bureau (SLIK) ──
  slikQuality: number; // 1 (Lancar/current) .. 5 (Macet/loss)
  hasNpl: boolean;
}

/** One scored pillar of the model. */
export interface ScorePillar {
  key: string;
  label: string;
  weight: number; // 0..1
  score: number; // 0..100
  /** The de-identified ratio(s) this pillar was computed from, for transparency. */
  detail: string;
}

export type RiskBand = "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC";

export interface ReasonCode {
  code: string;
  kind: "positive" | "negative" | "watch";
  message: string;
}

/**
 * The privacy-firewall output. This is what the deterministic engine (the
 * "TEE compute") emits and the ONLY thing the external LLM is allowed to see.
 * It carries derived ratios and the score — never names, tax ids, or addresses.
 */
export interface DeidentifiedFeatures {
  // non-identifying context
  sector: string;
  industry: string;
  companyAgeYears: number;
  requestedPlafonIdr: number;
  approvedPlafonIdr: number;
  tenorMonths: number;
  interestRatePct: number;
  repaymentScheme: string;

  // derived ratios (computed inside the boundary)
  dscrModerate: number;
  dscrOptimistic: number;
  dscrPessimistic: number;
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  debtToEquity: number;
  debtToAsset: number;
  debtToEbitda: number;
  interestCoverage: number;
  netMargin: number;
  operatingMargin: number;
  returnOnAssets: number;
  returnOnEquity: number;
  collateralCoverageMarket: number;
  collateralCoverageLiquidation: number;
  slikQuality: number;
  hasNpl: boolean;

  // deterministic scoring output
  baselineScore: number; // 0..100
  baselineBand: RiskBand;
  probabilityOfDefaultPct: number;
  pillars: ScorePillar[];
  reasonCodes: ReasonCode[];
  flags: string[];
}

/** Result of the deterministic scoring engine. */
export interface ScoreResult {
  score: number;
  band: RiskBand;
  probabilityOfDefaultPct: number;
  pillars: ScorePillar[];
  reasonCodes: ReasonCode[];
  flags: string[];
}

/** The LLM credit-analyst verdict (qualitative, over de-identified features). */
export interface CreditVerdict {
  recommendation: "Approve" | "Approve with conditions" | "Decline" | "Refer";
  confidence: "Low" | "Medium" | "High";
  headline: string;
  summary: string;
  strengths: string[];
  risks: string[];
  conditions: string[];
  model: string;
}

/** A verifiable credential the agent issues; a lender verifies it without raw data. */
export interface VerifiableCredential {
  "@context": string[];
  type: string[];
  issuer: string; // agent DID
  credentialSubject: {
    id: string; // user/borrower DID (pairwise)
    sector: string;
    creditScore: number;
    riskBand: RiskBand;
    probabilityOfDefaultPct: number;
    dscrModerate: number;
    collateralCoverageLiquidation: number;
    recommendation: string;
    /** Hash binding the credential to the exact de-identified feature set. */
    featureCommitment: string;
  };
  issuanceDate: string;
  expirationDate: string;
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    /** "live-signed" when signed via the agent key; "live-demo-unsigned" otherwise. */
    jws: string;
  };
}

/** Where each step physically ran + what Terminal 3 attested. */
export interface T3Receipt {
  environment: string;
  mode: "live" | "fallback";
  userDid: string | null;
  agentDid: string | null;
  vaultRef: string | null; // org-data entry id / map ref
  storedBytes: number;
  delegationGranted: boolean;
  auditEventId: string | null;
  steps: T3Step[];
  note?: string;
}

export interface T3Step {
  id: string;
  label: string;
  status: "ok" | "skipped" | "error";
  detail: string;
}

/** Full server response for the "secure + score" call. */
export interface SecureResult {
  receipt: T3Receipt;
  features: DeidentifiedFeatures;
  credential: VerifiableCredential;
}
