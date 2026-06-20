import type { CreditInput } from "./types";

/**
 * Curated sample: Northwind Construction Ltd, a mid-size construction firm
 * seeking a working-capital facility for a joint-venture project. Figures are
 * internally consistent and reproduce a strong-but-cyclical profile
 * (DSCR 1.45× moderate, current ratio 9.74×, DER 0.07×, net margin 15%,
 * ROA ~32%, interest coverage ~16.8×, collateral ~1.01× liquidation).
 * Used to one-click prefill the form for the demo.
 */
export const SAMPLE_CREDIT: CreditInput = {
  // identity (PII)
  companyName: "Northwind Construction Ltd",
  debtorName: "Northwind Construction Ltd",
  npwp: "82-4471903", // tax ID
  nib: "10482217", // business registration no.
  companyAddress: "1200 Harbor Boulevard, Suite 400, Austin, TX 78701",
  establishedDate: "2019-01-28",

  // business profile
  sector: "Construction",
  industry: "Building Construction",
  yearsInBusiness: 7,

  // facility
  loanPurpose:
    "Working-capital facility to execute a construction joint venture (the Riverside Logistics Hub) with Pinnacle Infrastructure Partners.",
  plafonRequested: 15_000_000,
  plafonApproved: 9_000_000,
  tenorMonths: 12,
  interestRate: 13.5,
  repaymentScheme: "Bullet principal — revolving demand loan",

  // latest-year financials (2025)
  revenue: 17_000_000,
  cogs: 12_920_000,
  operatingProfit: 3_400_000,
  netIncome: 2_550_000,
  ebitda: 3_570_000,
  interestExpense: 212_000,
  totalAssets: 8_025_000,
  totalEquity: 7_500_000,
  totalLiabilities: 525_000,
  currentAssets: 3_116_800,
  currentLiabilities: 320_000,
  cash: 409_600,
  inventory: 2_252_800,

  // debt service coverage (project scenarios)
  dscrOptimistic: 4.34,
  dscrModerate: 1.45,
  dscrPessimistic: 1.02,

  // collateral (two titled properties, first-ranking charge)
  collateralType: "Real estate — land & buildings (2 titled properties, first-ranking charge)",
  collateralMarketValue: 13_041_400,
  collateralLiquidationValue: 9_128_980,

  // credit bureau
  slikQuality: 1, // current
  hasNpl: false,
};

/** An empty input for "start from scratch". */
export const EMPTY_CREDIT: CreditInput = {
  companyName: "",
  debtorName: "",
  npwp: "",
  nib: "",
  companyAddress: "",
  establishedDate: "",
  sector: "",
  industry: "",
  yearsInBusiness: 0,
  loanPurpose: "",
  plafonRequested: 0,
  plafonApproved: 0,
  tenorMonths: 12,
  interestRate: 0,
  repaymentScheme: "",
  revenue: 0,
  cogs: 0,
  operatingProfit: 0,
  netIncome: 0,
  ebitda: 0,
  interestExpense: 0,
  totalAssets: 0,
  totalEquity: 0,
  totalLiabilities: 0,
  currentAssets: 0,
  currentLiabilities: 0,
  cash: 0,
  inventory: 0,
  dscrOptimistic: 0,
  dscrModerate: 0,
  dscrPessimistic: 0,
  collateralType: "",
  collateralMarketValue: 0,
  collateralLiquidationValue: 0,
  slikQuality: 1,
  hasNpl: false,
};
