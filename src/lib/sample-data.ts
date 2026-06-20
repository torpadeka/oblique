import type { CreditInput } from "./types";

/**
 * Curated sample, distilled from a real (pseudonymised) Indonesian corporate
 * credit memo: CV Sagara Pratama, a construction firm seeking working-capital
 * for a KSO project. Raw figures are internally consistent and reproduce the
 * memo's headline ratios (DSCR 1.45× moderate, current 9.74×, DER 0.07×,
 * net margin 15%, ROA ~32%, interest coverage ~16.8×, collateral ~1.01×
 * liquidation). Used to one-click prefill the form for the demo.
 */
export const SAMPLE_CREDIT: CreditInput = {
  // identity (PII)
  companyName: "CV Sagara Pratama",
  debtorName: "CV Sagara Pratama",
  npwp: "66.252.663.0-172.589",
  nib: "3757658009142",
  companyAddress: "Jl. Anggrek Utara No. 7, Kota Bekasi, Jawa Barat 17111",
  establishedDate: "2019-01-28",

  // business profile
  sector: "Konstruksi",
  industry: "Konstruksi Gedung",
  yearsInBusiness: 7,

  // facility
  loanPurpose:
    "Kredit Modal Kerja untuk pelaksanaan proyek konstruksi melalui KSO (Pembangunan KNMP) bersama PT Cakra Bumi Persada.",
  plafonRequested: 15_000_000_000,
  plafonApproved: 9_000_000_000,
  tenorMonths: 12,
  interestRate: 13.5,
  repaymentScheme: "Bullet Principal — Demand Loan (Revolving)",

  // latest-year financials (2025)
  revenue: 17_000_000_000,
  cogs: 12_920_000_000,
  operatingProfit: 3_400_000_000,
  netIncome: 2_550_000_000,
  ebitda: 3_570_000_000,
  interestExpense: 212_000_000,
  totalAssets: 8_025_000_000,
  totalEquity: 7_500_000_000,
  totalLiabilities: 525_000_000,
  currentAssets: 3_116_800_000,
  currentLiabilities: 320_000_000,
  cash: 409_600_000,
  inventory: 2_252_800_000,

  // debt service coverage (2026 project scenarios)
  dscrOptimistic: 4.34,
  dscrModerate: 1.45,
  dscrPessimistic: 1.02,

  // collateral (two SHM properties, APHT-bound)
  collateralType: "Properti — Tanah & Bangunan (2 bidang, SHM, APHT)",
  collateralMarketValue: 13_041_400_000,
  collateralLiquidationValue: 9_128_980_000,

  // credit bureau (SLIK)
  slikQuality: 1, // Lancar / current
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
