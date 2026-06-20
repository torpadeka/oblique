import { NextResponse } from "next/server";
import { analyzeWithLlm } from "@/lib/openrouter";
import type { DeidentifiedFeatures } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let features: DeidentifiedFeatures;
  try {
    const body = await req.json();
    features = body.features ?? body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!features || typeof features.baselineScore !== "number") {
    return NextResponse.json({ error: "Missing de-identified features." }, { status: 422 });
  }

  // Defense in depth: reject anything that looks like a raw identifier sneaking in.
  const featureKeys = features as unknown as Record<string, unknown>;
  const leaked = ["companyName", "npwp", "nib", "debtorName", "companyAddress"].filter(
    (k) => k in featureKeys,
  );
  if (leaked.length) {
    return NextResponse.json(
      { error: `Refusing to analyze: identifier fields present (${leaked.join(", ")}).` },
      { status: 422 },
    );
  }

  try {
    const verdict = await analyzeWithLlm(features);
    return NextResponse.json({ verdict });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
