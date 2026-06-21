import { NextResponse } from "next/server";
import { runSecurePipeline } from "@/lib/t3/client";
import { parseCreditInput } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Validate + coerce through the same Zod schema the QVAC ingestion uses, so the
  // enclave only ever seals a well-typed application — whether it came from the
  // form or an automated extraction.
  const { data: input } = parseCreditInput(body);
  if (!input.companyName) {
    return NextResponse.json({ error: "Missing credit application fields." }, { status: 422 });
  }

  try {
    const result = await runSecurePipeline(input);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Secure pipeline failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
