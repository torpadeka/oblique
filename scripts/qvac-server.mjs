/**
 * QVAC HTTP sidecar — wraps the in-process @qvac/sdk (on-device LLM) in an
 * OpenAI-compatible `/chat/completions` endpoint so Oblique's `lib/qvac/client.ts`
 * can talk to it over `QVAC_BASE_URL`, with no app changes.
 *
 * Why a sidecar: @qvac/sdk is a native, subprocess-spawning, on-device runtime
 * (Bare + llama.cpp). It can't run inside a Vercel serverless function, but the
 * Next.js app can stay deployable and call this local process instead. Run it on
 * the same machine as the documents — raw text never leaves the device.
 *
 * Endpoints:
 *   POST /v1/chat/completions   OpenAI-compatible chat (text → structured JSON)
 *   POST /v1/ocr                scanned-PDF fallback: rasterize pages + OCR → text
 *   GET  /health, /v1/models    status
 *
 * Run:   node scripts/qvac-server.mjs        (or: npm run qvac:serve)
 * Then:  QVAC_BASE_URL=http://localhost:8787/v1   in .env.local
 *
 * Env:
 *   QVAC_PORT          listen port            (default 8787)
 *   QVAC_MODEL_SRC     LLM registry export    (default LLAMA_3_2_1B_INST_Q4_0)
 *   QVAC_CTX_SIZE      LLM context window     (default 8192)
 *   QVAC_DEVICE        gpu | cpu              (default gpu; use cpu in containers)
 *   QVAC_GPU_LAYERS    layers offloaded       (default 99; set 0 for cpu)
 *   QVAC_API_KEY       require Bearer token   (optional)
 *   QVAC_OCR_MODE      onnx | vlm             (default onnx; vlm = multimodal, higher fidelity)
 *   QVAC_OCR_MODEL_SRC onnx recognizer export (default OCR_LATIN_RECOGNIZER_1)
 *   QVAC_OCR_LANGS     OCR languages, csv     (default en)
 *   QVAC_OCR_SCALE     raster scale for OCR   (default 3 — higher = sharper, slower)
 *   QVAC_OCR_MAX_PAGES page cap per request   (default 10)
 *   QVAC_OCR_GPU       OCR on GPU             (default true; set 0 if it errors)
 *   QVAC_OCR_VLM_SRC   vlm model export       (default OCR_0_6B_MULTIMODAL_Q4_K_M)
 *   QVAC_OCR_VLM_MMPROJ vlm projection export (default MMPROJ_OCR_0_6B_MULTIMODAL_F16)
 *   QVAC_OCR_VLM_CTX   vlm context window     (default 4096)
 *   QVAC_OCR_PROMPT    vlm transcription instruction (optional)
 */

import http from "node:http";
import os from "node:os";
import path from "node:path";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import * as sdk from "@qvac/sdk";
import { getDocumentProxy, renderPageAsImage, extractImages } from "unpdf";
import { createCanvas, ImageData } from "@napi-rs/canvas";

const PORT = Number(process.env.QVAC_PORT) || 8787;
const MODEL_SRC_NAME = process.env.QVAC_MODEL_SRC || "LLAMA_3_2_1B_INST_Q4_0";
const API_KEY = process.env.QVAC_API_KEY?.trim() || "";
// Context window. SDK default is 1024 — far too small for multi-page PDFs
// (3 docs ≈ 4200 tokens). Holds prompt + generated JSON; bump if you overflow.
const CTX_SIZE = Number(process.env.QVAC_CTX_SIZE) || 8192;
// Compute device. Default GPU (gpu_layers 99); set QVAC_DEVICE=cpu (and
// QVAC_GPU_LAYERS=0) for portable / containerized CPU-only runs.
const DEVICE = (process.env.QVAC_DEVICE || "gpu").toLowerCase();
const GPU_LAYERS = process.env.QVAC_GPU_LAYERS != null ? Number(process.env.QVAC_GPU_LAYERS) : 99;
// OCR fallback config (lazy — model loads on first /ocr call, not at boot).
//   onnx → fast easyocr recognizer, small, but noisy on dense text.
//   vlm  → multimodal OCR LLM (transcribes page images); far higher fidelity,
//          ~1 GB+ download, runs via completion() + image attachment.
const OCR_MODE = (process.env.QVAC_OCR_MODE || "onnx").toLowerCase(); // onnx | vlm
const OCR_MODEL_SRC_NAME = process.env.QVAC_OCR_MODEL_SRC || "OCR_LATIN_RECOGNIZER_1";
const OCR_LANGS = (process.env.QVAC_OCR_LANGS || "en").split(",").map((s) => s.trim()).filter(Boolean);
const OCR_SCALE = Number(process.env.QVAC_OCR_SCALE) || 3;
const OCR_MAX_PAGES = Number(process.env.QVAC_OCR_MAX_PAGES) || 10;
const OCR_GPU = process.env.QVAC_OCR_GPU !== "0" && process.env.QVAC_OCR_GPU !== "false";
const OCR_PIPELINE = process.env.QVAC_OCR_PIPELINE || "easyocr"; // easyocr | doctr
// VLM mode tunables.
const OCR_VLM_SRC_NAME = process.env.QVAC_OCR_VLM_SRC || "OCR_0_6B_MULTIMODAL_Q4_K_M";
const OCR_VLM_MMPROJ_NAME = process.env.QVAC_OCR_VLM_MMPROJ || "MMPROJ_OCR_0_6B_MULTIMODAL_F16";
const OCR_VLM_CTX = Number(process.env.QVAC_OCR_VLM_CTX) || 4096;
const OCR_VLM_PROMPT =
  process.env.QVAC_OCR_PROMPT ||
  "Transcribe ALL text in this document image exactly as written, preserving numbers, labels, and line order. Output only the transcription, no commentary.";
// base64-encoded PDFs inflate ~33%, so allow headroom over the app's 10 MB cap.
const MAX_BODY = 24 * 1024 * 1024;

const { loadModel, completion, ocr, unloadModel, close } = sdk;
const modelSrc = sdk[MODEL_SRC_NAME];
if (!modelSrc) {
  console.error(`✖ Unknown QVAC_MODEL_SRC "${MODEL_SRC_NAME}". Check @qvac/sdk model exports.`);
  process.exit(1);
}
// Resolve the OCR model export(s) for the selected mode up front, so a typo
// fails loudly at boot rather than on the first scanned PDF.
let ocrModelSrc, ocrVlmSrc, ocrVlmMmproj;
if (OCR_MODE === "vlm") {
  ocrVlmSrc = sdk[OCR_VLM_SRC_NAME];
  ocrVlmMmproj = sdk[OCR_VLM_MMPROJ_NAME];
  if (!ocrVlmSrc || !ocrVlmMmproj) {
    console.error(`✖ Unknown VLM OCR export(s): "${OCR_VLM_SRC_NAME}" / "${OCR_VLM_MMPROJ_NAME}".`);
    process.exit(1);
  }
} else {
  ocrModelSrc = sdk[OCR_MODEL_SRC_NAME];
  if (!ocrModelSrc) {
    console.error(`✖ Unknown QVAC_OCR_MODEL_SRC "${OCR_MODEL_SRC_NAME}". Check @qvac/sdk OCR model exports.`);
    process.exit(1);
  }
}

// ── Load the model once at startup; reuse across requests ──
let modelId;
console.log(`[qvac-sidecar] loading model ${MODEL_SRC_NAME} (ctx_size=${CTX_SIZE})…`);
try {
  modelId = await loadModel({
    modelSrc,
    modelConfig: { ctx_size: CTX_SIZE, device: DEVICE, gpu_layers: GPU_LAYERS },
    onProgress: (p) => {
      if (p?.percentage != null) process.stdout.write(`\r[qvac-sidecar] download ${p.percentage.toFixed(0)}%   `);
      if (p?.percentage >= 100) process.stdout.write("\n");
    },
  });
  console.log(`[qvac-sidecar] model ready: ${modelId}`);
} catch (e) {
  console.error("✖ Failed to load QVAC model:", e?.message ?? e);
  process.exit(1);
}

// ── Helpers ──
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const asText = (c) =>
  typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => (typeof p === "string" ? p : p?.text ?? "")).join("") : String(c ?? "");

// ── Translate OpenAI chat request → QVAC completion ──
async function handleChatCompletion(body) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const history = messages
    .filter((m) => m && m.role && m.content != null)
    .map((m) => ({ role: String(m.role), content: asText(m.content) }));
  if (!history.length) throw Object.assign(new Error("`messages` is required"), { status: 422 });

  const generationParams = {};
  if (typeof body.temperature === "number") generationParams.temp = body.temperature;
  if (typeof body.max_tokens === "number") generationParams.predict = body.max_tokens;

  const rf = body.response_format;
  const responseFormat =
    rf && (rf.type === "json_object" || rf.type === "text" || rf.type === "json_schema") ? rf : undefined;

  const run = completion({
    modelId,
    history,
    stream: false,
    ...(Object.keys(generationParams).length ? { generationParams } : {}),
    ...(responseFormat ? { responseFormat } : {}),
  });

  const content = await run.text; // aggregated full assistant text
  let usage = {};
  try {
    const s = await run.stats;
    if (s) usage = { prompt_tokens: s.promptTokens ?? s.prompt_tokens, completion_tokens: s.completionTokens ?? s.completion_tokens };
  } catch { /* stats optional */ }

  return {
    id: `chatcmpl-${run.requestId ?? Date.now().toString(36)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: body.model || MODEL_SRC_NAME,
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    usage,
  };
}

// ── OCR fallback (scanned / image-only PDFs) ──
// The OCR model loads lazily on the first /ocr call, so a text-PDF-only
// deployment never pays the download/RAM cost.
let ocrModelId;
let ocrLoading;
async function ensureOcrModel() {
  if (ocrModelId) return ocrModelId;
  if (!ocrLoading) {
    if (OCR_MODE === "vlm") {
      console.log(`[qvac-sidecar] loading VLM OCR ${OCR_VLM_SRC_NAME} (+${OCR_VLM_MMPROJ_NAME}, ctx=${OCR_VLM_CTX})…`);
      ocrLoading = loadModel({
        modelSrc: ocrVlmSrc,
        modelConfig: { ctx_size: OCR_VLM_CTX, projectionModelSrc: ocrVlmMmproj, device: DEVICE, gpu_layers: GPU_LAYERS },
        onProgress: (p) => {
          if (p?.percentage != null) process.stdout.write(`\r[qvac-sidecar] OCR download ${p.percentage.toFixed(0)}%   `);
          if (p?.percentage >= 100) process.stdout.write("\n");
        },
      }).then((id) => {
        ocrModelId = id;
        console.log(`[qvac-sidecar] VLM OCR ready: ${id}`);
        return id;
      });
    } else {
      // detector is auto-bundled via langList.
      console.log(`[qvac-sidecar] loading OCR model ${OCR_MODEL_SRC_NAME} (langs=${OCR_LANGS.join(",")}, gpu=${OCR_GPU})…`);
      ocrLoading = loadModel({
        modelSrc: ocrModelSrc,
        modelConfig: { langList: OCR_LANGS, useGPU: OCR_GPU, magRatio: 1.5, pipelineMode: OCR_PIPELINE },
      }).then((id) => {
        ocrModelId = id;
        console.log(`[qvac-sidecar] OCR model ready: ${id}`);
        return id;
      });
    }
  }
  return ocrLoading;
}

/** Rasterize one PDF page to a PNG Buffer at the given scale. */
async function pageToPng(pdf, pageNumber, scale) {
  try {
    const ab = await renderPageAsImage(pdf, pageNumber, {
      canvasImport: () => import("@napi-rs/canvas"),
      scale,
    });
    return Buffer.from(ab);
  } catch (e) {
    // pdf.js can't composite image XObjects in Node ("@napi-rs/canvas is not
    // available in this environment") — exactly the scanned/image-only PDFs OCR
    // exists for. Pull the embedded page image directly instead of compositing.
    const png = await embeddedImageToPng(pdf, pageNumber);
    if (png) return png;
    throw e;
  }
}

/**
 * Extract the dominant embedded image of a page and encode it to PNG, bypassing
 * pdf.js's broken in-Node image-render path. Returns null if the page has no
 * embedded image. (Multi-image pages: OCRs only the largest — fine for scans.)
 */
async function embeddedImageToPng(pdf, pageNumber) {
  const imgs = await extractImages(pdf, pageNumber);
  if (!imgs?.length) return null;
  const im = imgs.sort((a, b) => b.width * b.height - a.width * a.height)[0];
  const { data, width, height, channels } = im;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++) {
    if (channels === 1) {
      const v = data[i];
      rgba[j++] = v; rgba[j++] = v; rgba[j++] = v; rgba[j++] = 255;
    } else if (channels === 4) {
      rgba[j++] = data[i * 4]; rgba[j++] = data[i * 4 + 1]; rgba[j++] = data[i * 4 + 2]; rgba[j++] = data[i * 4 + 3];
    } else {
      rgba[j++] = data[i * 3]; rgba[j++] = data[i * 3 + 1]; rgba[j++] = data[i * 3 + 2]; rgba[j++] = 255;
    }
  }
  const canvas = createCanvas(width, height);
  canvas.getContext("2d").putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas.toBuffer("image/png");
}

/** OCR an image Buffer → text. onnx: recognizer blocks; vlm: transcribe via completion(). */
async function ocrImage(buf) {
  const mId = await ensureOcrModel();
  if (OCR_MODE === "vlm") return ocrImageVlm(mId, buf);
  const { blocks } = ocr({ modelId: mId, image: buf, options: { paragraph: true } });
  const result = await blocks;
  return result.map((b) => b.text).filter(Boolean).join("\n").trim();
}

// VLM transcription. completion() attachments take a file PATH (not a buffer),
// so spill each page PNG to a temp file, transcribe, then delete it.
let ocrTmpDir;
let ocrTmpSeq = 0;
async function ocrImageVlm(mId, buf) {
  if (!ocrTmpDir) ocrTmpDir = await mkdtemp(path.join(os.tmpdir(), "qvac-ocr-"));
  const file = path.join(ocrTmpDir, `page-${process.pid}-${ocrTmpSeq++}.png`);
  await writeFile(file, buf);
  try {
    const run = completion({
      modelId: mId,
      history: [{ role: "user", content: OCR_VLM_PROMPT, attachments: [{ path: file }] }],
      stream: false,
      generationParams: { temp: 0 },
    });
    return (await run.text).trim();
  } finally {
    await rm(file, { force: true }).catch(() => {});
  }
}

const OCR_ACTIVE_NAME = OCR_MODE === "vlm" ? OCR_VLM_SRC_NAME : OCR_MODEL_SRC_NAME;
const OCR_ENGINE = OCR_MODE === "vlm" ? "qvac-ocr-vlm" : "qvac-ocr";

// Translate { pdf_base64 } | { image_base64 } → OCR'd text.
async function handleOcr(body) {
  // Single pre-rendered image.
  if (typeof body.image_base64 === "string" && body.image_base64) {
    const text = await ocrImage(Buffer.from(body.image_base64, "base64"));
    return { text, pages: 1, engine: OCR_ENGINE, model: OCR_ACTIVE_NAME };
  }

  // A whole PDF: rasterize each page, then OCR it.
  if (typeof body.pdf_base64 === "string" && body.pdf_base64) {
    const scale = Number(body.scale) || OCR_SCALE;
    const data = new Uint8Array(Buffer.from(body.pdf_base64, "base64"));
    const pdf = await getDocumentProxy(data);
    const cap = Math.min(pdf.numPages, Number(body.max_pages) || OCR_MAX_PAGES);
    const pageTexts = [];
    for (let p = 1; p <= cap; p++) {
      const png = await pageToPng(pdf, p, scale);
      pageTexts.push(await ocrImage(png));
    }
    return {
      text: pageTexts.filter(Boolean).join("\n\n"),
      pages: cap,
      truncated: pdf.numPages > cap,
      engine: OCR_ENGINE,
      model: OCR_ACTIVE_NAME,
    };
  }

  throw Object.assign(new Error("`pdf_base64` or `image_base64` is required"), { status: 422 });
}

// ── HTTP server ──
const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && (pathname === "/health" || pathname === "/v1/models" || pathname === "/")) {
    return sendJson(res, 200, { status: "ok", model: MODEL_SRC_NAME, modelId, ocrMode: OCR_MODE, ocrModel: OCR_ACTIVE_NAME, ocrLoaded: !!ocrModelId });
  }

  const isChat = pathname.endsWith("/chat/completions");
  const isOcr = pathname.endsWith("/ocr");
  if (req.method !== "POST" || !(isChat || isOcr)) {
    return sendJson(res, 404, { error: { message: `Not found: ${req.method} ${pathname}` } });
  }

  if (API_KEY) {
    const auth = req.headers["authorization"] || "";
    if (auth !== `Bearer ${API_KEY}`) return sendJson(res, 401, { error: { message: "Unauthorized" } });
  }

  try {
    const raw = await readBody(req);
    const body = raw ? JSON.parse(raw) : {};
    const result = isOcr ? await handleOcr(body) : await handleChatCompletion(body);
    sendJson(res, 200, result);
  } catch (e) {
    const status = e?.status ?? (e instanceof SyntaxError ? 400 : 500);
    console.error("[qvac-sidecar] error:", e?.message ?? e);
    sendJson(res, status, { error: { message: e?.message ?? "Inference failed" } });
  }
});

server.listen(PORT, () => {
  console.log(`[qvac-sidecar] listening on http://localhost:${PORT}  (OCR mode: ${OCR_MODE})`);
  console.log(`[qvac-sidecar] set QVAC_BASE_URL=http://localhost:${PORT}/v1`);
});

// ── Graceful shutdown ──
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  console.log("\n[qvac-sidecar] shutting down…");
  try { await unloadModel({ modelId }); } catch { /* ignore */ }
  if (ocrModelId) { try { await unloadModel({ modelId: ocrModelId }); } catch { /* ignore */ } }
  if (ocrTmpDir) { try { await rm(ocrTmpDir, { recursive: true, force: true }); } catch { /* ignore */ } }
  try { await close?.(); } catch { /* ignore */ }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
