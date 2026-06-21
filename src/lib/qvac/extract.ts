/**
 * Local PDF → text extraction (SERVER ONLY).
 *
 * The first stage of the QVAC ingestion boundary. Runs entirely in-process via
 * `unpdf` (a serverless build of pdf.js) — the raw document bytes never leave the
 * machine. The extracted text is then handed to the QVAC LLM (or the heuristic
 * fallback) to be structured into JSON.
 */

import { extractText } from "unpdf";

export interface ExtractedDoc {
  name: string;
  bytes: number;
  chars: number;
  text: string;
  /** True when the text came from OCR (scanned PDF) rather than the text layer. */
  ocr?: boolean;
}

/** Extract plain text from a single PDF. Returns "" on an unreadable file. */
export async function extractPdfText(name: string, data: Uint8Array): Promise<ExtractedDoc> {
  // pdf.js may transfer (detach) the backing ArrayBuffer during extraction, so
  // capture the size up front — `data.byteLength` reads 0 afterwards.
  const bytes = data.byteLength;
  try {
    const { text } = await extractText(data, { mergePages: true });
    const clean = normalizeWhitespace(text);
    return { name, bytes, chars: clean.length, text: clean };
  } catch {
    return { name, bytes, chars: 0, text: "" };
  }
}

/** Extract + concatenate text from several PDFs, labelled by filename. */
export async function extractAll(
  files: { name: string; data: Uint8Array }[],
): Promise<{ docs: ExtractedDoc[]; combined: string }> {
  const docs = await Promise.all(files.map((f) => extractPdfText(f.name, f.data)));
  const combined = docs
    .filter((d) => d.text)
    .map((d) => `===== DOCUMENT: ${d.name} =====\n${d.text}`)
    .join("\n\n");
  return { docs, combined };
}

function normalizeWhitespace(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
