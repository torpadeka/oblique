"use client";

import { Check, X, Minus, FileText, Cpu, ScanText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { QvacReceipt, T3Step } from "@/lib/types";

const STATUS_ICON: Record<T3Step["status"], React.ReactNode> = {
  ok: <Check className="size-3.5" />,
  skipped: <Minus className="size-3.5" />,
  error: <X className="size-3.5" />,
};
const STATUS_RING: Record<T3Step["status"], string> = {
  ok: "bg-secure/15 text-secure border-secure/30",
  skipped: "bg-muted text-muted-foreground border-border",
  error: "bg-destructive/10 text-destructive border-destructive/30",
};

const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/** Renders the QVAC document-ingestion receipt: which local engine parsed the
 * PDFs, field coverage, per-step trace, and fields to review. */
export function QvacReceiptCard({ receipt, compact = false }: { receipt: QvacReceipt; compact?: boolean }) {
  const liveQvac = receipt.engine === "qvac-llm";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <ScanText className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Parsed from your documents</p>
          <p className="text-xs text-muted-foreground">
            {liveQvac ? "Read on-device by QVAC — raw files never left the machine." : "Read locally by the deterministic parser — raw files never left the machine."}
          </p>
        </div>
        <Badge
          className={`ml-auto gap-1 rounded-full border-transparent ${liveQvac ? "bg-secure/15 text-secure" : "bg-muted text-muted-foreground"}`}
        >
          <Cpu className="size-3" />
          {liveQvac ? `QVAC · ${receipt.model ?? "local"}` : "local heuristic"}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {receipt.files.map((f) => (
          <span
            key={f.name}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1 text-xs"
          >
            <FileText className="size-3.5 text-muted-foreground" />
            <span className="max-w-[14rem] truncate">{f.name}</span>
            <span className="text-muted-foreground tnum">{fmtBytes(f.bytes)}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1 text-xs tnum">
          {receipt.extractedFields}/{receipt.totalFields} fields populated
        </span>
      </div>

      {!compact && (
        <ol className="space-y-2">
          {receipt.steps.map((step) => (
            <li key={step.id} className="flex items-start gap-3 rounded-xl border border-border/70 p-3">
              <span
                className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border ${STATUS_RING[step.status]}`}
              >
                {STATUS_ICON[step.status]}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{step.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {receipt.reviewCritical.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-medium text-primary">Review these before scoring</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            QVAC couldn&apos;t find {receipt.reviewCritical.length} field(s) the score depends on. Fill them in below:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {receipt.reviewCritical.map((label) => (
              <span key={label} className="rounded-md bg-primary/10 px-2 py-0.5 text-[0.7rem] text-primary">
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
