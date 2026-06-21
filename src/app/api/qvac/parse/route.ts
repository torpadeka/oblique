import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/qvac/extract";
import { qvacExtract, qvacOcr, qvacConfigured } from "@/lib/qvac/client";
import { parseCreditInput, FIELD_LABELS } from "@/lib/schema";
import type { CreditInput, QvacParseResult, QvacReceipt } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // VLM OCR on multi-page scanned PDFs can be slow

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file
const TOTAL_FIELDS = Object.keys(FIELD_LABELS).length;
// Below this, a PDF has effectively no text layer → likely scanned → try OCR.
const MIN_TEXT_CHARS = 16;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data with PDF file(s)." }, { status: 400 });
  }

  const entries = [...form.getAll("files"), ...form.getAll("file")].filter(
    (v): v is File => v instanceof File,
  );
  if (entries.length === 0) {
    return NextResponse.json({ error: "No files uploaded." }, { status: 422 });
  }
  if (entries.length > MAX_FILES) {
    return NextResponse.json({ error: `Too many files (max ${MAX_FILES}).` }, { status: 422 });
  }

  const files: { name: string; data: Uint8Array; b64: string }[] = [];
  for (const f of entries) {
    const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    if (!isPdf) {
      return NextResponse.json({ error: `"${f.name}" is not a PDF.` }, { status: 422 });
    }
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: `"${f.name}" exceeds the 10 MB limit.` }, { status: 422 });
    }
    const ab = await f.arrayBuffer();
    // Materialize base64 BEFORE extraction — pdf.js detaches the ArrayBuffer.
    const b64 = Buffer.from(ab).toString("base64");
    files.push({ name: f.name, data: new Uint8Array(ab), b64 });
  }

  try {
    // 1. Local text extraction (raw bytes never leave the device). For scanned
    //    PDFs (no text layer) fall back to on-device OCR via the QVAC sidecar.
    const docs = await Promise.all(
      files.map(async (f) => {
        const doc = await extractPdfText(f.name, f.data);
        if (doc.chars >= MIN_TEXT_CHARS || !qvacConfigured) return doc;
        try {
          const { text } = await qvacOcr(f.b64);
          const clean = text.trim();
          if (clean.length >= MIN_TEXT_CHARS) {
            return { ...doc, text: clean, chars: clean.length, ocr: true };
          }
        } catch {
          // OCR unavailable/failed — leave the doc empty; heuristic handles it.
        }
        return doc;
      }),
    );

    // 2. QVAC LLM (on-device) or deterministic heuristic → loose JSON.
    const extraction = await qvacExtract(docs);

    // 3. Validate + coerce into a strict CreditInput; report what to review.
    const report = parseCreditInput(extraction.raw);

    const receipt: QvacReceipt = {
      engine: extraction.engine,
      mode: extraction.mode,
      model: extraction.model,
      files: docs.map((d) => ({ name: d.name, bytes: d.bytes, chars: d.chars })),
      extractedFields: TOTAL_FIELDS - report.missing.length,
      totalFields: TOTAL_FIELDS,
      missing: report.missing.map((k) => FIELD_LABELS[k]),
      reviewCritical: report.reviewCritical.map((k) => FIELD_LABELS[k]),
      steps: [
        ...extraction.steps,
        {
          id: "validate",
          label: "Validate with Zod schema",
          status: report.issues.length ? "error" : "ok",
          detail: report.issues.length
            ? `Coerced with ${report.issues.length} issue(s): ${report.issues.slice(0, 3).join("; ")}`
            : `Coerced to the typed application contract · ${TOTAL_FIELDS - report.missing.length}/${TOTAL_FIELDS} fields populated.`,
        },
      ],
      note: extraction.note,
    };

    const result: QvacParseResult = { input: report.data as CreditInput, receipt };
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Document parsing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
