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
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-secure-muted text-secure dark:bg-secure/15">
          <ScanText className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Parsed from your documents</p>
          <p className="text-xs text-muted-foreground">
            {liveQvac ? "Read on-device by QVAC — raw files never left the machine." : "Read locally by the deterministic parser — raw files never left the machine."}
          </p>
        </div>
        {liveQvac ? (
          <Badge variant="secure" className="ml-auto gap-1">
            <Cpu className="size-3" />
            QVAC · {receipt.model ?? "local"}
          </Badge>
        ) : (
          <Badge variant="ghost" className="ml-auto gap-1 bg-muted text-muted-foreground">
            <Cpu className="size-3" />
            local heuristic
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {receipt.files.map((f) => (
          <span
            key={f.name}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground"
          >
            <FileText className="size-3.5 text-muted-foreground" />
            <span className="max-w-[14rem] truncate">{f.name}</span>
            <span className="text-muted-foreground tnum">{fmtBytes(f.bytes)}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground tnum">
          {receipt.extractedFields}/{receipt.totalFields} fields populated
        </span>
      </div>

      {!compact && (
        <ol className="space-y-2">
          {receipt.steps.map((step) => (
            <li key={step.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
              <span
                className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border ${STATUS_RING[step.status]}`}
              >
                {STATUS_ICON[step.status]}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{step.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {receipt.reviewCritical.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="font-mono text-[11px] uppercase tracking-wider text-foreground">Review these before scoring</p>
          <p className="mt-1 text-xs text-muted-foreground">
            QVAC couldn&apos;t find {receipt.reviewCritical.length} field(s) the score depends on. Fill them in below:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {receipt.reviewCritical.map((label) => (
              <span key={label} className="rounded-full border border-border bg-card px-2 py-0.5 text-[0.7rem] text-foreground">
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {receipt.extras && Object.keys(receipt.extras).length > 0 && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="font-mono text-[11px] uppercase tracking-wider text-foreground">Also captured ({Object.keys(receipt.extras).length})</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Facts outside the standard fields — kept for context, never scored. A de-identified subset is shared with the analyst.
          </p>
          <dl className="mt-2 space-y-1">
            {Object.entries(receipt.extras).map(([k, v]) => (
              <div key={k} className="flex gap-2 text-xs">
                <dt className="shrink-0 font-medium text-muted-foreground">{k}:</dt>
                <dd className="min-w-0 break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
