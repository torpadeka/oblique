import { NextResponse } from "next/server";
import { runSecurePipeline } from "@/lib/t3/client";
import type { CreditInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let input: CreditInput;
  try {
    input = (await req.json()) as CreditInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!input || typeof input !== "object" || !input.companyName) {
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
