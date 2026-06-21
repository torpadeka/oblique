# Oblique — Prove creditworthiness, reveal nothing

Confidential credit scoring on the **Terminal 3 Network**, built for the Terminal 3 Agent Dev Kit bounty.

A borrower's sensitive financials are sealed inside a hardware-secured enclave. An agent with a **verifiable identity** authenticates the user, is **delegated scoped authority** to act on their behalf, computes a deterministic credit score inside the confidential boundary, and issues a **verifiable credential** a lender can trust — **without ever seeing the raw data**.

> The privacy magic isn't the OCR or the model. It's the boundary: raw PII goes in, a score and a credential come out, and nothing identifying ever crosses to the analyst or the lender.

---

## The privacy firewall

```
YOUR DEVICE                        TERMINAL 3 · TEE              CLIENT TIER        LENDER
───────────                        ──────────────────           ───────────       ──────
PDF documents ──QVAC──▶ structured  ──auth+seal──▶  encrypted vault / channel
(credit memo,   (on-     application                decryptable only in the enclave
 financials,    device)  ─Zod─▶ validated                  │
 KYC)                    │                          deterministic engine
            parsed + validated locally;             derives ratios + score
            raw docs never leave the device         strips ALL identifiers
                                                            │
                                            de-identified features ──▶ LLM analyst ──▶ verifiable
                                            (ratios + score only,      (OpenRouter)    credential
                                             never raw PII)                 │          score · band ·
                                                    └──────────────────────┘          recommendation
                                                                                      0 raw fields
```

Two firewalls, in series. **QVAC** is the *ingestion* boundary on your device: uploaded PDFs are read and parsed into a structured application **locally** — by an on-device QVAC LLM, or a deterministic heuristic parser when none is configured — and validated with **Zod** before anything is transmitted. The raw documents never cross to a cloud service. **The TEE is the *de-identification* firewall**: the deterministic engine is the only thing that touches raw financials; everything downstream — the LLM, the lender — sees only ratios and a score. The credit *number* is pure, auditable arithmetic (no hallucinated DSCR); the LLM adds the qualitative officer's judgment on top of the de-identified features.

---

## How the Agent Auth SDK is integrated

Every step uses `@terminal3/t3n-sdk` (v3.9). Verified **live against testnet** (see the in-app "Terminal 3 receipt"):

| Primitive | Where | Status on sandbox |
|---|---|---|
| **Verifiable identity** — `handshake()` + `authenticate(createEthAuthInput(addr))` → `did:t3n:…` | `lib/t3/client.ts` | ✅ **Live** — resolves the real user DID |
| **Agent delegation** — `tee:user/contracts::agent-auth-update` grants the agent DID `score-credit` on the user's behalf | `lib/t3/client.ts` | ✅ **Live** — `delegationGranted: true` |
| **Confidential sealing** — raw application transmitted to the enclave over the E2E-encrypted session | `lib/t3/client.ts` | ✅ **Live** (in transit to TEE) |
| **Durable vault** — `org-data` `createPolicy`/`setWriters`/`writeData` | `lib/t3/client.ts` | ⚠️ Attempted; needs a provisioned **Organisation** (sandbox has none) — degrades cleanly, surfacing the real node error |
| **Attestable audit** — `getAuditEvents()` | `lib/t3/client.ts` | ✅ **Live** — trail reachable, bound to the user DID |
| **Verifiable credential** — agent issues a `CreditScoreCredential` bound to a SHA-256 feature commitment, HMAC-signed with the agent key | `lib/t3/client.ts` | ✅ Issued every run |

A distinct **agent identity** (`T3N_AGENT_KEY`) acts on behalf of the **user identity** (`T3N_API_KEY`) — the delegation is genuine, not modeled. Every step is reported transparently in the UI: what ran live vs. what degraded, with the real node error attached. Nothing is overclaimed.

> **Design choice for integrity:** the score is deterministic and runs in the boundary (auditable for the banks/regulators Terminal 3 serves). The LLM never runs in the TEE and never sees raw PII — only the de-identified feature set. Sending those de-identified aggregates to an external model (OpenRouter) is safe *because* the TEE already stripped every identifier.

> **Calibration sources:** the **probability-of-default** figures are S&P Global Ratings' average one-year corporate default rates by grade, 1981–2009 through-the-cycle (*Annual Global Corporate Default Study And Rating Transition*); the **interest-coverage → synthetic-rating** cross-check uses [Damodaran's (NYU Stern) interest-coverage/ratings table](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/ratings.html). The 7-pillar weights and ratio breakpoints remain a **judgmental expert scorecard** (standard ratios, hand-chosen thresholds) — not statistically fit on a default dataset, as a production IRB model would be.

---

## Document ingestion with QVAC

Instead of typing ~40 fields, the borrower uploads their actual documents (credit memo, financial statements, KYC) and QVAC drafts the application:

```
upload PDFs ──▶ extract text (unpdf, local) ──▶ QVAC LLM (on-device)  ──▶ JSON ──▶ Zod validate ──▶ prefill form ──▶ review ──▶ seal on T3
                                              └─ or heuristic parser ─┘         (coerce + report
                                                 (deterministic, local)          missing fields)
```

- **On-device by design.** `QVAC_BASE_URL` must point at a *local* QVAC runtime (an OpenAI-compatible `/chat/completions` endpoint). The documents carry raw PII and sit on the *raw* side of the firewall, so they are parsed on the machine and **never** sent to a cloud model. We deliberately do **not** fall back to OpenRouter for parsing — that would leak PII. OpenRouter only ever sees the de-identified features, later.
- **Graceful degrade.** With no QVAC runtime configured, a deterministic local heuristic parser (label/regex) drafts the application instead — fully offline, zero external calls. The receipt shows exactly which engine ran.
- **Validation = Zod** (the idiomatic TypeScript "Pydantic"): the parsed JSON, whose shape varies per document, is coerced into the strict `CreditInput` contract (`"$17,000,000"` → `17000000`, `"1.45×"` → `1.45`, bureau grade clamped to 1–5) and the fields it couldn't find are surfaced for the user to review before scoring.
- **Human-in-the-loop.** The draft pre-fills the form; the user reviews/corrects, then the *validated* application flows into the existing seal → score → credential pipeline unchanged.

A pseudonymised `sample-credit-memo.pdf` is bundled (and downloadable from the upload screen) so the whole flow — extract → parse → validate → prefill — is demoable offline via the heuristic parser; point `QVAC_BASE_URL` at a real QVAC runtime for higher-fidelity extraction of free-form documents.

---

## Tech stack

- **Next.js 16** (App Router, Node runtime route handlers) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Base UI) — IBM Plex Sans/Mono, amber (value) + emerald (security) accent system, dark-first
- **@terminal3/t3n-sdk** — identity, delegation, audit, confidential session
- **QVAC** (on-device document LLM) + **unpdf** (local PDF text extraction) + **Zod** — the privacy-preserving ingestion + validation boundary
- **OpenRouter** — the LLM credit analyst (with a transparent rule-based fallback if no key)

Secrets (`T3N_API_KEY` is a **wallet private key**) live only in `.env.local`, server-side — never in the client bundle.

---

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your Terminal 3 key + DID
npm run dev                  # http://localhost:3000
```

`.env.local`:

```
T3N_API_KEY=0x...        # wallet private key from terminal3.io (keep secret)
T3N_DID=did:t3n:...
T3N_ENV=testnet
T3N_AGENT_KEY=0x...      # distinct identity for the agent (openssl rand -hex 32)
QVAC_BASE_URL=           # optional — local QVAC runtime (OpenAI-compatible); omit to use the heuristic parser
QVAC_MODEL=qvac-local
OPENROUTER_API_KEY=      # optional — omit to use the rule-based analyst
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

Open `/analyze`. Either **upload a PDF** (grab the bundled **Sample memo PDF** from the upload screen to try it offline) and let QVAC draft the application, or click **Enter manually instead** → **Load sample**. Review the parsed/entered figures, then **Score application** — watch it seal + delegate on Terminal 3, score in the boundary, and issue a credential.

---

## Project structure

```
src/
  app/
    page.tsx                 landing
    analyze/page.tsx         the analyzer
    api/qvac/parse/route.ts  PDF upload → local extract → QVAC/heuristic → Zod → draft CreditInput
    api/t3/secure/route.ts   validate → auth → seal → delegate → de-identify → score → issue VC
    api/analyze/route.ts     LLM analyst over de-identified features (OpenRouter)
  lib/
    types.ts                 the data boundaries (QvacReceipt → CreditInput → Deidentified → VC)
    schema.ts                Zod validation/coercion (the "Pydantic") + field metadata
    qvac/extract.ts          local PDF → text (unpdf), server only
    qvac/client.ts           QVAC ingestion engine: on-device LLM + heuristic fallback
    scoring.ts               deterministic 7-pillar engine (the "TEE compute" logic)
    deidentify.ts            the privacy firewall: ratios + score, identifiers stripped
    t3/client.ts             Terminal 3 integration (server only)
    openrouter.ts            LLM analyst + rule-based fallback
    sample-data.ts           curated sample from a real credit memo
  components/
    landing/*                hero, privacy-flow, how-it-works, features, cta
    analyze/*                document-upload, qvac-receipt, credit-form, secure-progress, result-view, score-gauge
scripts/
  make-sample-pdf.mjs        generates public/sample-credit-memo.pdf for the demo
```

---

## Honest notes & next steps

- **Durable org-data vault** needs a provisioned Organisation; the sandbox tenant has none, so persistence degrades to in-enclave session sealing. With an org, `writeData`/`dataGet` light up unchanged.
- The credential **proof** is an HMAC-SHA256 binding over the feature commitment (honest demo signing). Production would issue a signed SD-JWT VC via the SDK's `signing`/`vp` interfaces (`@terminal3/ecdsa_vc`).
- The deterministic engine runs server-side as the confidential-compute logic — it is pure and portable to a **Rust→WASM TEE contract** (`wasm32-wasip2`) with no logic change.
- **Document ingestion (PDF → JSON) is implemented** as an on-device, local-first boundary (QVAC LLM + heuristic fallback, validated with Zod) — see [Document ingestion with QVAC](#document-ingestion-with-qvac). The bundled demo runs the offline heuristic path; pointing `QVAC_BASE_URL` at a real on-device QVAC runtime upgrades extraction fidelity for free-form documents with no code change.

Built for the Terminal 3 Agent Dev Kit bounty · sandbox/testnet · not financial advice.
