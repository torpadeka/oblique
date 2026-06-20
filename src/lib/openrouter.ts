/**
 * The LLM credit analyst (SERVER ONLY).
 *
 * Runs in the client tier — OUTSIDE the TEE — and is therefore only ever handed
 * DeidentifiedFeatures: ratios + score, no names, tax ids, or addresses. It turns
 * the deterministic numbers into a credit officer's qualitative opinion.
 *
 * Falls back to a transparent rule-based opinion when OPENROUTER_API_KEY is unset
 * or the call fails, so the demo never breaks.
 */

import type { CreditVerdict, DeidentifiedFeatures } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";

const SYSTEM_PROMPT = `You are a senior corporate credit risk officer at a bank.
You receive ONLY de-identified financial features for a borrower — never names, tax IDs, or addresses. Privacy is non-negotiable; do not ask for identifying data.
A deterministic engine has already computed an auditable baseline score, risk band, and reason codes. Your job is the qualitative judgment a human officer adds on top: weigh the ratios against each other, surface the real risks behind the headline numbers, and recommend an action with conditions.

Respond with STRICT JSON only (no markdown, no prose outside the object), matching exactly:
{
  "recommendation": "Approve" | "Approve with conditions" | "Decline" | "Refer",
  "confidence": "Low" | "Medium" | "High",
  "headline": "one sentence verdict",
  "summary": "2-4 sentences citing specific ratios (DSCR, leverage, coverage, margins)",
  "strengths": ["..."],
  "risks": ["..."],
  "conditions": ["covenants / mitigants if approving with conditions"]
}
Be concrete and reference the actual numbers. Keep arrays to 2-5 items.`;

function userPrompt(f: DeidentifiedFeatures): string {
  return `De-identified borrower features:\n${JSON.stringify(
    {
      sector: f.sector,
      industry: f.industry,
      companyAgeYears: f.companyAgeYears,
      facility: {
        requestedIdr: f.requestedPlafonIdr,
        approvedIdr: f.approvedPlafonIdr,
        tenorMonths: f.tenorMonths,
        interestRatePct: f.interestRatePct,
        repaymentScheme: f.repaymentScheme,
      },
      coverage: {
        dscrModerate: f.dscrModerate,
        dscrOptimistic: f.dscrOptimistic,
        dscrPessimistic: f.dscrPessimistic,
        interestCoverage: f.interestCoverage,
        collateralCoverageLiquidation: f.collateralCoverageLiquidation,
        collateralCoverageMarket: f.collateralCoverageMarket,
      },
      leverage: { debtToEquity: f.debtToEquity, debtToAsset: f.debtToAsset, debtToEbitda: f.debtToEbitda },
      liquidity: { currentRatio: f.currentRatio, quickRatio: f.quickRatio, cashRatio: f.cashRatio },
      profitability: {
        netMargin: f.netMargin,
        operatingMargin: f.operatingMargin,
        returnOnAssets: f.returnOnAssets,
        returnOnEquity: f.returnOnEquity,
      },
      bureau: { slikQuality: f.slikQuality, hasNpl: f.hasNpl },
      engine: {
        baselineScore: f.baselineScore,
        baselineBand: f.baselineBand,
        probabilityOfDefaultPct: f.probabilityOfDefaultPct,
        flags: f.flags,
        reasonCodes: f.reasonCodes.map((r) => `${r.kind}:${r.message}`),
      },
    },
    null,
    2,
  )}\n\nProduce the JSON verdict.`;
}

export async function analyzeWithLlm(features: DeidentifiedFeatures): Promise<CreditVerdict> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return ruleBasedVerdict(features, "rule-based (set OPENROUTER_API_KEY for LLM analysis)");

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://oblique.credit",
        "X-Title": "Oblique",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt(features) },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 160)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(extractJson(content));
    return normalize(parsed, MODEL);
  } catch (e) {
    return ruleBasedVerdict(
      features,
      `rule-based fallback (LLM error: ${e instanceof Error ? e.message.slice(0, 80) : "unknown"})`,
    );
  }
}

function extractJson(s: string): string {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  return start >= 0 && end > start ? s.slice(start, end + 1) : "{}";
}

function normalize(p: Record<string, unknown>, model: string): CreditVerdict {
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(String).slice(0, 6) : [];
  const rec = String(p.recommendation ?? "Refer");
  const recommendation = (
    ["Approve", "Approve with conditions", "Decline", "Refer"].includes(rec) ? rec : "Refer"
  ) as CreditVerdict["recommendation"];
  const conf = String(p.confidence ?? "Medium");
  const confidence = (
    ["Low", "Medium", "High"].includes(conf) ? conf : "Medium"
  ) as CreditVerdict["confidence"];
  return {
    recommendation,
    confidence,
    headline: String(p.headline ?? "Credit assessment complete."),
    summary: String(p.summary ?? ""),
    strengths: arr(p.strengths),
    risks: arr(p.risks),
    conditions: arr(p.conditions),
    model,
  };
}

/** Transparent deterministic opinion when no LLM is available. */
export function ruleBasedVerdict(f: DeidentifiedFeatures, model: string): CreditVerdict {
  const strengths = f.reasonCodes.filter((r) => r.kind === "positive").map((r) => r.message);
  const risks = f.reasonCodes.filter((r) => r.kind !== "positive").map((r) => r.message);

  let recommendation: CreditVerdict["recommendation"];
  if (f.baselineScore >= 80) recommendation = "Approve";
  else if (f.baselineScore >= 60) recommendation = "Approve with conditions";
  else if (f.baselineScore >= 45) recommendation = "Refer";
  else recommendation = "Decline";

  const confidence: CreditVerdict["confidence"] =
    f.dscrPessimistic <= 1.05 || f.collateralCoverageLiquidation < 1.1 ? "Medium" : "High";

  const conditions =
    recommendation === "Approve with conditions" || recommendation === "Approve"
      ? [
          f.collateralCoverageLiquidation < 1.15
            ? "Top up collateral or reduce exposure to reach ≥1.25× liquidation coverage."
            : "Maintain collateral insurance and annual revaluation.",
          "Cash-sweep / DSRA covenant given the bullet repayment profile.",
          "Quarterly DSCR and project-progress reporting on the KSO.",
        ]
      : [];

  return {
    recommendation,
    confidence,
    headline: `Baseline ${f.baselineBand} (${f.baselineScore}/100) — ${recommendation.toLowerCase()}.`,
    summary: `Engine scores the borrower ${f.baselineScore}/100 (band ${f.baselineBand}, PD ${f.probabilityOfDefaultPct}%). Coverage is anchored by a moderate-scenario DSCR of ${f.dscrModerate}× and ${f.collateralCoverageLiquidation}× liquidation collateral, against ${f.debtToEquity}× leverage and a ${(f.netMargin * 100).toFixed(1)}% net margin. Key watch item: stress-scenario DSCR of ${f.dscrPessimistic}×.`,
    strengths: strengths.length ? strengths : ["Stable fundamentals across the scored pillars."],
    risks: risks.length ? risks : ["No material risk flags raised by the engine."],
    conditions,
    model,
  };
}
