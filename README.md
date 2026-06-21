<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/oblique-logo-dark.svg">
    <img src="public/oblique-logo-light.svg" alt="Oblique" width="200">
  </picture>
</p>

# Oblique: Prove creditworthiness, reveal nothing

Confidential credit scoring on the **Terminal 3 Network**, built for the Terminal 3 Agent Dev Kit bounty.

A borrower's sensitive financials are sealed inside a hardware-secured enclave. An agent with a **verifiable identity** authenticates the user, is **delegated scoped authority** to act on their behalf, computes a deterministic credit score inside the confidential boundary, and issues a **verifiable credential** a lender can trust, **without ever seeing the raw data**.

> The privacy magic isn't the OCR or the model. It's the boundary: raw PII goes in, a score and a credential come out, and nothing identifying ever crosses to the analyst or the lender.

---

## The privacy firewall

```
  YOUR DEVICE  ·  raw documents never leave
  ─────────────────────────────────────────────────────
      PDF documents  (credit memo, financials, KYC)
            │
            │   QVAC  (on-device LLM, OCR for scans)
            ▼
      structured application
            │
            │   Zod validate  (coerce + report missing)
            ▼
      typed CreditInput
            │
            │   sealed over an E2E-encrypted session
            ▼

  TERMINAL 3  ·  TEE  ·  the only place raw financials are touched
  ─────────────────────────────────────────────────────
      deterministic scoring engine
      derives ratios + score, then strips ALL identifiers
            │
            │   de-identified features only  (ratios + score)
            ▼

  CLIENT TIER
  ─────────────────────────────────────────────────────
      LLM analyst  (OpenRouter)  adds the qualitative verdict
            │
            ▼

  LENDER
  ─────────────────────────────────────────────────────
      verifiable credential:  score · band · recommendation
      0 raw fields ever exposed
```

Two firewalls, in series. **QVAC** is the *ingestion* boundary on your device: uploaded PDFs are read and parsed into a structured application **locally** (by an on-device QVAC LLM, or a deterministic heuristic parser when none is configured) and validated with **Zod** before anything is transmitted. The raw documents never cross to a cloud service. **The TEE is the *de-identification* firewall**: the deterministic engine is the only thing that touches raw financials; everything downstream (the LLM, the lender) sees only ratios and a score. The credit *number* is pure, auditable arithmetic (no hallucinated DSCR); the LLM adds the qualitative officer's judgment on top of the de-identified features.

---

## How the Agent Auth SDK is integrated

Every step uses `@terminal3/t3n-sdk` (v3.9). Verified **live against testnet** (see the in-app "Terminal 3 receipt"):

| Primitive | Where | Status on sandbox |
|---|---|---|
| **Verifiable identity**: `handshake()` + `authenticate(createEthAuthInput(addr))` resolves `did:t3n:…` | `lib/t3/client.ts` | ✅ **Live**, resolves the real user DID |
| **Agent delegation**: `tee:user/contracts::agent-auth-update` grants the agent DID `score-credit` on the user's behalf | `lib/t3/client.ts` | ✅ **Live**, `delegationGranted: true` |
| **Confidential sealing**: raw application transmitted to the enclave over the E2E-encrypted session | `lib/t3/client.ts` | ✅ **Live** (in transit to TEE) |
| **Attestable audit**: `getAuditEvents()` | `lib/t3/client.ts` | ✅ **Live**, trail reachable, bound to the user DID |
| **Verifiable credential**: agent issues a `CreditScoreCredential` bound to a SHA-256 feature commitment, HMAC-signed with the agent key | `lib/t3/client.ts` | ✅ Issued every run |

A distinct **agent identity** (`T3N_AGENT_KEY`) acts on behalf of the **user identity** (`T3N_API_KEY`); the delegation is genuine, not modeled. Every step is reported transparently in the UI: what ran live versus what degraded, with the real node error attached. Nothing is overclaimed.

> **Design choice for integrity:** the score is deterministic and runs in the boundary (auditable for the banks and regulators Terminal 3 serves). The LLM never runs in the TEE and never sees raw PII, only the de-identified feature set. Sending those de-identified aggregates to an external model (OpenRouter) is safe *because* the TEE already stripped every identifier.

> **Calibration sources:** the **probability-of-default** figures are S&P Global Ratings' average one-year corporate default rates by grade, 1981 to 2009 through-the-cycle (*Annual Global Corporate Default Study And Rating Transition*); the **interest-coverage to synthetic-rating** cross-check uses [Damodaran's (NYU Stern) interest-coverage/ratings table](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/ratings.html); the **computed DSCR** sub-factor of Pillar 1 follows [CFI's Debt Service Coverage Ratio](https://corporatefinanceinstitute.com/resources/commercial-lending/debt-service-coverage-ratio/): `(EBITDA − cash taxes) / total debt service`, thresholds below 1.0 weak, 1.25 bank minimum, 2.0+ strong, recomputed from the financials so an optimistic submitted DSCR can't carry the score. The 7-pillar weights and remaining ratio breakpoints stay a **judgmental expert scorecard** (standard ratios, hand-chosen thresholds), not statistically fit on a default dataset, as a production IRB model would be.

---

## Document ingestion with QVAC

Instead of typing ~40 fields, the borrower uploads their actual documents (credit memo, financial statements, KYC) and QVAC drafts the application:

```
upload PDFs  ▶  extract text (unpdf, local)  ▶  QVAC LLM (on-device)  ▶  JSON  ▶  Zod validate  ▶  prefill form  ▶  review  ▶  seal on T3
                                             └─ or heuristic parser ─┘          (coerce + report missing)
```

- **On-device by design.** `QVAC_BASE_URL` must point at a *local* QVAC runtime (an OpenAI-compatible `/chat/completions` endpoint). The documents carry raw PII and sit on the *raw* side of the firewall, so they are parsed on the machine and **never** sent to a cloud model. We deliberately do **not** fall back to OpenRouter for parsing, which would leak PII. OpenRouter only ever sees the de-identified features, later.
- **Graceful degrade.** With no QVAC runtime configured, a deterministic local heuristic parser (label/regex) drafts the application instead, fully offline, zero external calls. The receipt shows exactly which engine ran.
- **Validation = Zod** (the idiomatic TypeScript "Pydantic"): the parsed JSON, whose shape varies per document, is coerced into the strict `CreditInput` contract (`"$17,000,000"` becomes `17000000`, `"1.45×"` becomes `1.45`, bureau grade clamped to 1 to 5) and the fields it couldn't find are surfaced for the user to review before scoring.
- **Human-in-the-loop.** The draft pre-fills the form; the user reviews and corrects, then the *validated* application flows into the existing seal, score, credential pipeline unchanged.
- **Flexible capture, fixed scoring.** Facts the document carries that don't map to one of the fixed fields (guarantors, covenants, project milestones, ESG notes) are captured into an open `extras` bag so nothing is lost. They are **never** fed to the deterministic score (which needs named, typed inputs), and only a **de-identified subset** crosses to the analyst: the firewall (`deidentify`) drops any extra containing a known identifier or an email/phone/id pattern, and `assertNoPii` hard-fails if anything slips. The clean subset reaches OpenRouter as soft qualitative context.

A pseudonymised `sample-credit-memo.pdf` is bundled (and downloadable from the upload screen) so the whole flow (extract, parse, validate, prefill) is demoable offline via the heuristic parser; point `QVAC_BASE_URL` at a real QVAC runtime for higher-fidelity extraction of free-form documents.

---

## Tech stack

- **Next.js 16** (App Router, Node runtime route handlers) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Base UI): the Swiss "Column" design system, Inter + JetBrains Mono, deep-indigo primary actions with a rationed ember score accent and teal security pills, light-first
- **@terminal3/t3n-sdk**: identity, delegation, audit, confidential session
- **QVAC** (on-device document LLM) + **unpdf** (local PDF text extraction) + **Zod**: the privacy-preserving ingestion and validation boundary
- **OpenRouter**: the LLM credit analyst (with a transparent rule-based fallback if no key)

Secrets (`T3N_API_KEY` is a **wallet private key**) live only in `.env.local`, server-side, never in the client bundle.

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
QVAC_BASE_URL=           # optional: local QVAC runtime (OpenAI-compatible); omit to use the heuristic parser
QVAC_MODEL=qvac-local
OPENROUTER_API_KEY=      # optional: omit to use the rule-based analyst
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

Open `/analyze`. Either **upload a PDF** (grab the bundled **Sample memo PDF** from the upload screen to try it offline) and let QVAC draft the application, or click **Enter manually instead** then **Load sample**. Review the parsed/entered figures, then **Score application** to watch it seal and delegate on Terminal 3, score in the boundary, and issue a credential.

### Run with Docker (one command, on-device models included)

The whole stack, the Next.js app **and** the on-device QVAC runtime (Bare + llama.cpp, real GGUF models), runs from one command:

```bash
docker compose up --build      # then open http://localhost:3000
```

> ⚠️ **Heads-up on speed (CPU).** The container runs the on-device model on **CPU** for portability, so it is slow:
> - **First boot** downloads the model once (a few GB) and loads it, which takes a few minutes before the sidecar is ready.
> - **Parsing a document takes roughly 1 to 3 minutes** with the default 4B model. The request waits the whole time. **This is expected, not a hang**, so be patient and leave the tab open.
> - For a much snappier demo, switch to a smaller model: set `QVAC_MODEL_SRC=QWEN3_1_7B_INST_Q4` (good balance) or `LLAMA_3_2_1B_INST_Q4_0` (fastest) on the `qvac` service in `docker-compose.yml`, or run on GPU (see below).

Two services come up from one image: `web` (the app) and `qvac` (the on-device sidecar). On first run the QVAC model downloads once to a named volume (`qvac-models`, a few GB), then starts instantly afterwards.

- **No secrets needed.** With no `.env`, QVAC parsing runs in-container, Terminal 3 degrades gracefully, and the analyst falls back to the deterministic rule-based verdict, so the full flow still works. Add a `.env` (copy `.env.example`) to light up live Terminal 3 and the OpenRouter analyst.
- **CPU by default** (portable, no GPU needed). Containers run `QVAC_DEVICE=cpu`; the 4B extractor is slower on CPU but works. A 4B parse can take 1 to 3 minutes on CPU, so the request budget is generous (`QVAC_TIMEOUT_MS`); for a snappier demo set `QVAC_MODEL_SRC=QWEN3_1_7B_INST_Q4` (or `LLAMA_3_2_1B_INST_Q4_0`) in `docker-compose.yml`. Give Docker **≥ 8 GB RAM** (the 4B model + KV cache).
- **GPU (optional):** with the NVIDIA Container Toolkit, add a `deploy.resources.reservations.devices` GPU reservation to the `qvac` service and set `QVAC_DEVICE=gpu`, `QVAC_GPU_LAYERS=99`.
- **Scanned-PDF OCR:** the container defaults to the light `onnx` OCR; for high-fidelity transcription set `QVAC_OCR_MODE=vlm` (downloads ~1 GB more; slow on CPU).

Why this works in a container: `@qvac/sdk` ships **linux-x64 glibc prebuilds** for its native engines, and dependencies are installed *inside* the image (so the linux binaries `@napi-rs/canvas-linux-x64-gnu`, the Bare runtime, llama.cpp, and onnx resolve correctly rather than the host's). The image is Debian-based (glibc), **not** Alpine/musl.

---

## Project structure

```
src/
  app/
    page.tsx                 landing
    analyze/page.tsx         the analyzer
    api/qvac/parse/route.ts  PDF upload, local extract, QVAC/heuristic, Zod, draft CreditInput
    api/t3/secure/route.ts   validate, auth, seal, delegate, de-identify, score, issue VC
    api/analyze/route.ts     LLM analyst over de-identified features (OpenRouter)
  lib/
    types.ts                 the data boundaries (QvacReceipt, CreditInput, Deidentified, VC)
    schema.ts                Zod validation/coercion (the "Pydantic") + field metadata
    qvac/extract.ts          local PDF to text (unpdf), server only
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
  qvac-server.mjs            the on-device QVAC sidecar (OpenAI-compatible HTTP)
```

---

## Honest notes & next steps

- The credential **proof** is an HMAC-SHA256 binding over the feature commitment (honest demo signing). Production would issue a signed SD-JWT VC via the SDK's `signing`/`vp` interfaces (`@terminal3/ecdsa_vc`).
- The deterministic engine runs server-side as the confidential-compute logic; it is pure and portable to a **Rust to WASM TEE contract** (`wasm32-wasip2`) with no logic change.
- **Document ingestion (PDF to JSON) is implemented** as an on-device, local-first boundary (QVAC LLM + heuristic fallback, validated with Zod). See [Document ingestion with QVAC](#document-ingestion-with-qvac). The bundled demo runs the offline heuristic path; pointing `QVAC_BASE_URL` at a real on-device QVAC runtime upgrades extraction fidelity for free-form documents with no code change.

Built for the Terminal 3 Agent Dev Kit bounty · sandbox/testnet · not financial advice.
