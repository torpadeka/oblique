/**
 * QVAC ingestion engine (SERVER ONLY).
 *
 * Turns the text extracted from uploaded PDFs into structured credit-application
 * JSON. Two local paths, never a cloud call (the documents carry raw PII and sit
 * on the raw side of the privacy firewall):
 *
 *   1. QVAC LLM — when `QVAC_BASE_URL` points at a local/on-device QVAC runtime
 *      exposing an OpenAI-compatible `/chat/completions` endpoint. This is the
 *      real, privacy-preserving path: an edge model reads the document.
 *   2. Heuristic — a deterministic label/regex extractor over the raw text. Pure,
 *      offline, zero-dependency. Used when QVAC isn't configured or errors out, so
 *      the demo always produces a draft to review.
 *
 * `QVAC_BASE_URL` MUST be a local endpoint. We deliberately do NOT fall back to a
 * cloud LLM (e.g. OpenRouter) here — that would send raw PII off-device and break
 * the firewall. OpenRouter only ever sees the de-identified features, downstream.
 */

import { FIELD_LABELS, type CreditField } from "@/lib/schema";
import type { CreditInput, T3Step } from "@/lib/types";
import type { ExtractedDoc } from "./extract";

const QVAC_BASE_URL = process.env.QVAC_BASE_URL?.trim().replace(/\/$/, "") ?? "";
const QVAC_MODEL = process.env.QVAC_MODEL?.trim() || "qvac-local";
const QVAC_API_KEY = process.env.QVAC_API_KEY?.trim() || "";
// Per-request budget for the on-device LLM. A 4B model on CPU can take 1–3 min
// to extract all 36 fields — far longer than a GPU run — so default generously
// (the parse route's maxDuration is 300s). Lower it via QVAC_TIMEOUT_MS on fast
// hardware. Too short → the call aborts mid-generation and silently degrades to
// the heuristic parser (≈1 field), which looks like "parsing is broken".
const QVAC_TIMEOUT_MS = Number(process.env.QVAC_TIMEOUT_MS) || 280_000;

/** Whether a local QVAC runtime is configured (enables both LLM parse and OCR). */
export const qvacConfigured = !!QVAC_BASE_URL;

/**
 * OCR a scanned PDF via the local QVAC sidecar (`/ocr`) — rasterizes the pages
 * on-device and runs the on-device OCR model. Returns the recognized text, or
 * throws if QVAC isn't configured / the runtime errors. PII stays on the machine.
 */
export async function qvacOcr(pdfBase64: string): Promise<{ text: string; pages: number }> {
  if (!QVAC_BASE_URL) throw new Error("QVAC_BASE_URL not set");
  const controller = new AbortController();
  // OCR is slow — VLM mode runs an LLM per page, and the first call downloads the
  // model. Pre-warm the sidecar (`curl …/ocr`) once after boot to avoid a cold hit.
  const timeout = setTimeout(() => controller.abort(), 240_000);
  try {
    const res = await fetch(`${QVAC_BASE_URL}/ocr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(QVAC_API_KEY ? { Authorization: `Bearer ${QVAC_API_KEY}` } : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({ pdf_base64: pdfBase64 }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`QVAC OCR ${res.status}: ${body.slice(0, 140)}`);
    }
    const json = await res.json();
    return { text: String(json?.text ?? ""), pages: Number(json?.pages ?? 0) };
  } finally {
    clearTimeout(timeout);
  }
}

export interface QvacExtraction {
  /** Loosely-typed JSON straight from the engine (validated downstream by Zod). */
  raw: Record<string, unknown>;
  engine: "qvac-llm" | "heuristic";
  mode: "live" | "fallback";
  model: string | null;
  steps: T3Step[];
  note: string;
}

const FIELD_KEYS = Object.keys(FIELD_LABELS) as CreditField[];

function systemPrompt(): string {
  const fieldList = FIELD_KEYS.map((k) => `  "${k}": ${typeHint(k)}  // ${FIELD_LABELS[k]}`).join("\n");
  return `You are QVAC, an on-device document-understanding model. You read a corporate credit-application document (loan memo, financial statements, KYC forms) and extract its facts into a strict JSON object.

Rules:
- Output ONLY a single JSON object — no markdown, no commentary.
- Use these exact keys. Omit a key (or use null) only if the document genuinely does not state it; never invent values.
- Money/amounts: plain numbers, no currency symbols or thousands separators (e.g. 17000000).
- Ratios (DSCR): decimal numbers (e.g. 1.45).
- Dates: ISO yyyy-mm-dd.
- slikQuality: bureau grade 1 (current) to 5 (loss). hasNpl: true/false.
- Additionally, capture any other MATERIAL facts the document states that do not fit a field above — e.g. guarantors, covenants, conditions precedent, project milestones, ESG/sustainability notes, management commentary — into an "extras" object of short "label": "value" strings. Keep labels concise. Do NOT duplicate the fixed fields into extras. Omit "extras" entirely if there are none.

Schema:
{
${fieldList},
  "extras": { "<short label>": "<value>" }  // facts that fit no field above; omit if none
}`;
}

function typeHint(k: CreditField): string {
  if (k === "hasNpl") return "boolean";
  if (k === "slikQuality") return "1-5";
  const numeric: CreditField[] = [
    "yearsInBusiness", "plafonRequested", "plafonApproved", "tenorMonths", "interestRate",
    "revenue", "cogs", "operatingProfit", "netIncome", "ebitda", "interestExpense",
    "totalAssets", "totalEquity", "totalLiabilities", "currentAssets", "currentLiabilities",
    "cash", "inventory", "dscrOptimistic", "dscrModerate", "dscrPessimistic",
    "collateralMarketValue", "collateralLiquidationValue",
  ];
  return numeric.includes(k) ? "number" : "string";
}

/** Parse documents into application JSON. Always returns a result. */
export async function qvacExtract(docs: ExtractedDoc[]): Promise<QvacExtraction> {
  const combined = docs
    .filter((d) => d.text)
    .map((d) => `===== DOCUMENT: ${d.name} =====\n${d.text}`)
    .join("\n\n");
  const steps: T3Step[] = [];

  if (!combined) {
    steps.push({
      id: "read",
      label: "Read documents on-device",
      status: "error",
      detail: "No extractable text found in the uploaded PDF(s).",
    });
    return { raw: {}, engine: "heuristic", mode: "fallback", model: null, steps, note: "No readable text — start from a blank form." };
  }

  const ocrCount = docs.filter((d) => d.ocr).length;
  steps.push({
    id: "read",
    label: "Read documents on-device",
    status: "ok",
    detail:
      `${docs.length} file(s) → ${combined.length.toLocaleString()} chars of text extracted locally (raw bytes never leave the device).` +
      (ocrCount ? ` ${ocrCount} scanned PDF(s) read via on-device OCR.` : ""),
  });

  // ── Path 1: QVAC LLM (local, privacy-preserving) ──
  if (QVAC_BASE_URL) {
    try {
      const raw = await callQvacLlm(combined);
      steps.push({
        id: "parse",
        label: "Parse with QVAC LLM (on-device)",
        status: "ok",
        detail: `Edge model "${QVAC_MODEL}" structured the document into ${Object.keys(raw).length} field(s) — locally, no cloud round-trip.`,
      });
      return {
        raw,
        engine: "qvac-llm",
        mode: "live",
        model: QVAC_MODEL,
        steps,
        note: `Parsed on-device by QVAC (${QVAC_MODEL}). Raw documents stayed on the machine; review the draft before scoring.`,
      };
    } catch (e) {
      steps.push({
        id: "parse",
        label: "Parse with QVAC LLM (on-device)",
        status: "skipped",
        detail: `QVAC runtime at ${QVAC_BASE_URL} unavailable (${errMsg(e)}). Falling back to the local heuristic parser.`,
      });
    }
  } else {
    steps.push({
      id: "parse",
      label: "Parse with QVAC LLM (on-device)",
      status: "skipped",
      detail: "QVAC_BASE_URL not set — using the deterministic local heuristic parser.",
    });
  }

  // ── Path 2: deterministic heuristic (local, offline) ──
  const raw = heuristicExtract(combined);
  steps.push({
    id: "heuristic",
    label: "Heuristic field extraction (local)",
    status: "ok",
    detail: `Deterministic label/regex pass recovered ${Object.keys(raw).length} field(s) from the text. Review carefully — point QVAC_BASE_URL at a local QVAC runtime for higher fidelity.`,
  });
  return {
    raw,
    engine: "heuristic",
    mode: "fallback",
    model: null,
    steps,
    note: "Parsed locally by the deterministic heuristic (no QVAC runtime configured). Review the draft — free-form layouts may need correction.",
  };
}

/** Call a local QVAC runtime via its OpenAI-compatible chat endpoint. */
async function callQvacLlm(text: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QVAC_TIMEOUT_MS);
  try {
    const res = await fetch(`${QVAC_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(QVAC_API_KEY ? { Authorization: `Bearer ${QVAC_API_KEY}` } : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: QVAC_MODEL,
        temperature: 0,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: `Document text:\n\n${text}\n\nExtract the application JSON.` },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`QVAC ${res.status}: ${body.slice(0, 140)}`);
    }
    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(extractJson(content));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } finally {
    clearTimeout(timeout);
  }
}

function extractJson(s: string): string {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  return start >= 0 && end > start ? s.slice(start, end + 1) : "{}";
}

// ── Deterministic heuristic extractor ──────────────────────────────────────────
// Best-effort label matching. Captures the raw string per field; Zod coerces it.
// pdf.js flattens a page to space-separated text, so a free-text value (company
// name, address, purpose…) has no line break to stop at. We instead stop each
// such capture at the next *known label* via a lookahead over STOP.

const NUM = String.raw`([$£€]?\s*-?[\d][\d.,]*)`;

const STOP_PHRASES = [
  "company name", "debtor name", "tax id", "npwp", "ein", "tin", "business registration",
  "business reg", "nib", "company no", "address", "registered office", "domicile", "established",
  "incorporated", "founded", "sector", "industry", "years in business", "operating history",
  "loan purpose", "use of funds", "use of proceeds", "credit limit requested", "credit limit approved",
  "plafond requested", "plafond approved", "tenor", "interest rate", "interest expense",
  "repayment scheme", "repayment terms", "revenue", "turnover", "net sales", "cogs",
  "cost of goods sold", "cost of sales", "operating profit", "operating income", "net income",
  "net profit", "profit after tax", "ebitda", "total assets", "total equity", "shareholders equity",
  "net worth", "total liabilities", "current assets", "current liabilities", "cash", "inventory",
  "inventories", "dscr", "collateral type", "collateral market value", "collateral liquidation value",
  "collateral", "market value", "liquidation value", "slik", "bureau grade", "bureau", "active npl",
  "non-performing",
];
const STOP = STOP_PHRASES
  .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))
  .join("|");
/** Lazy value capture that stops before the next known label, or at end of text. */
const TAIL = String.raw`(.+?)(?=\s+(?:${STOP})\b|\s*$)`;
const strField = (head: string) => new RegExp(`${head}\\s*[:\\-]\\s*${TAIL}`, "i");

const PATTERNS: Partial<Record<keyof CreditInput, RegExp[]>> = {
  companyName: [strField(String.raw`(?:company\s*name|borrower|debtor company|applicant)`)],
  debtorName: [strField(String.raw`debtor\s*name`)],
  npwp: [/(?:tax\s*id|npwp|ein|tin)\s*[:#\-]?\s*([\w.\-/]+)/i],
  nib: [/(?:business\s*reg(?:istration)?(?:\.|\s)*(?:no|number)?|nib|company\s*no)\s*[:#\-]?\s*([\w.\-/]+)/i],
  companyAddress: [strField(String.raw`(?:address|registered office|domicile)`)],
  establishedDate: [/(?:established|incorporated|founded)\s*(?:date|on)?\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\s][\w]+[\/\s]\d{4})/i],
  sector: [strField(String.raw`sector`)],
  industry: [strField(String.raw`industry`)],
  yearsInBusiness: [/(?:years\s*(?:in business|operating)|operating history)\s*[:\-]?\s*(\d+)/i],
  loanPurpose: [strField(String.raw`(?:loan\s*purpose|use of (?:funds|proceeds)|purpose)`)],
  plafonRequested: [new RegExp(String.raw`(?:credit limit requested|plafond? requested|requested (?:limit|amount|facility)|facility requested)\s*[:\-]?\s*${NUM}`, "i")],
  plafonApproved: [new RegExp(String.raw`(?:credit limit approved|plafond? approved|approved (?:limit|amount|facility)|facility approved)\s*[:\-]?\s*${NUM}`, "i")],
  tenorMonths: [/tenor\s*(?:\(months\))?\s*[:\-]?\s*(\d+)/i],
  interestRate: [new RegExp(String.raw`interest\s*rate\s*[:\-]?\s*${NUM}`, "i")],
  repaymentScheme: [strField(String.raw`repayment\s*(?:scheme|terms?)`)],
  revenue: [new RegExp(String.raw`(?:revenue|turnover|net sales|sales)\s*[:\-]?\s*${NUM}`, "i")],
  cogs: [new RegExp(String.raw`(?:cogs|cost of goods sold|cost of sales)\s*[:\-]?\s*${NUM}`, "i")],
  operatingProfit: [new RegExp(String.raw`(?:operating profit|operating income)\s*[:\-]?\s*${NUM}`, "i")],
  netIncome: [new RegExp(String.raw`(?:net income|net profit|profit after tax)\s*[:\-]?\s*${NUM}`, "i")],
  ebitda: [new RegExp(String.raw`ebitda\s*[:\-]?\s*${NUM}`, "i")],
  interestExpense: [new RegExp(String.raw`interest expense\s*[:\-]?\s*${NUM}`, "i")],
  totalAssets: [new RegExp(String.raw`total assets\s*[:\-]?\s*${NUM}`, "i")],
  totalEquity: [new RegExp(String.raw`(?:total equity|shareholders?[' ]+equity|net worth)\s*[:\-]?\s*${NUM}`, "i")],
  totalLiabilities: [new RegExp(String.raw`total liabilities\s*[:\-]?\s*${NUM}`, "i")],
  currentAssets: [new RegExp(String.raw`current assets\s*[:\-]?\s*${NUM}`, "i")],
  currentLiabilities: [new RegExp(String.raw`current liabilities\s*[:\-]?\s*${NUM}`, "i")],
  cash: [new RegExp(String.raw`cash(?:\s*(?:and|&)\s*(?:cash\s*)?equivalents)?\s*[:\-]?\s*${NUM}`, "i")],
  inventory: [new RegExp(String.raw`(?:inventory|inventories|stock)\s*[:\-]?\s*${NUM}`, "i")],
  dscrOptimistic: [new RegExp(String.raw`dscr\s*[-—]?\s*optimistic\s*[:\-]?\s*${NUM}`, "i")],
  dscrModerate: [new RegExp(String.raw`dscr\s*[-—]?\s*(?:moderate|base)\s*[:\-]?\s*${NUM}`, "i")],
  dscrPessimistic: [new RegExp(String.raw`dscr\s*[-—]?\s*(?:pessimistic|stress)\s*[:\-]?\s*${NUM}`, "i")],
  collateralType: [strField(String.raw`(?:collateral\s*type|collateral)`)],
  collateralMarketValue: [new RegExp(String.raw`(?:collateral\s*)?market value\s*[:\-]?\s*${NUM}`, "i")],
  collateralLiquidationValue: [new RegExp(String.raw`(?:collateral\s*)?liquidation value\s*[:\-]?\s*${NUM}`, "i")],
  slikQuality: [/(?:slik|bureau)\s*(?:quality|grade|collectibility)\s*[:\-]?\s*([1-5])/i],
};

function heuristicExtract(text: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, regexes] of Object.entries(PATTERNS) as [keyof CreditInput, RegExp[]][]) {
    for (const re of regexes) {
      const m = text.match(re);
      if (m && m[1] != null) {
        out[key] = m[1].trim().replace(/[.,;]+$/, "");
        break;
      }
    }
  }
  // NPL: presence of an explicit yes/no near the term
  const npl = text.match(/(?:active\s*npl|non[- ]?performing\s*loan)\s*[:\-]?\s*(yes|no|true|false|none|n\/a)/i);
  if (npl) out.hasNpl = /yes|true/i.test(npl[1]);
  return out;
}

function errMsg(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.length > 120 ? m.slice(0, 117) + "…" : m;
}
