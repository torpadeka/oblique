"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Bot } from "lucide-react";
import { CreditForm } from "@/components/analyze/credit-form";
import { SecureProgress } from "@/components/analyze/secure-progress";
import { ResultView } from "@/components/analyze/result-view";
import { SAMPLE_CREDIT, EMPTY_CREDIT } from "@/lib/sample-data";
import type { CreditInput, CreditVerdict, SecureResult } from "@/lib/types";

type Phase = "input" | "processing" | "result";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`);
  return json as T;
}

export function Analyzer() {
  const [input, setInput] = useState<CreditInput>(SAMPLE_CREDIT);
  const [phase, setPhase] = useState<Phase>("input");
  const [result, setResult] = useState<SecureResult | null>(null);
  const [verdict, setVerdict] = useState<CreditVerdict | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);

  const patch = (p: Partial<CreditInput>) => setInput((prev) => ({ ...prev, ...p }));

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  async function run() {
    setPhase("processing");
    setResult(null);
    setVerdict(null);
    setRevealed(0);
    setAnalyzing(false);

    try {
      const secure = await postJSON<SecureResult>("/api/t3/secure", input);
      setResult(secure);

      // reveal each pipeline step
      for (let i = 1; i <= secure.receipt.steps.length; i++) {
        setRevealed(i);
        if (!reducedMotion) await sleep(420);
      }

      // hand de-identified features to the agent analyst
      setAnalyzing(true);
      const { verdict } = await postJSON<{ verdict: CreditVerdict }>("/api/analyze", {
        features: secure.features,
      });
      setVerdict(verdict);
      if (!reducedMotion) await sleep(350);
      setPhase("result");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("input");
    }
  }

  function reset(empty = false) {
    setInput(empty ? EMPTY_CREDIT : SAMPLE_CREDIT);
    setResult(null);
    setVerdict(null);
    setPhase("input");
  }

  if (phase === "input") {
    return (
      <CreditForm
        value={input}
        onChange={patch}
        onSubmit={run}
        onLoadSample={() => setInput(SAMPLE_CREDIT)}
        onReset={() => reset(true)}
        busy={false}
      />
    );
  }

  if (phase === "processing") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-4">
        <SecureProgress receipt={result?.receipt ?? null} revealed={revealed} />
        {analyzing && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <Bot className="size-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Agent analyst reasoning</p>
              <p className="text-xs text-muted-foreground">
                Over de-identified features only — never the raw application.
              </p>
            </div>
            <Loader2 className="size-4 animate-spin text-primary" />
          </div>
        )}
      </div>
    );
  }

  return result ? (
    <ResultView input={input} result={result} verdict={verdict} onReset={() => reset(false)} />
  ) : null;
}
