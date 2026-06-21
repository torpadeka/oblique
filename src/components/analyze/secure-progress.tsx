"use client";

import { Check, X, Minus, Loader2, ShieldCheck, Fingerprint, Bot, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { shorten } from "@/lib/format";
import type { T3Receipt, T3Step } from "@/lib/types";

const STATUS_ICON: Record<T3Step["status"], React.ReactNode> = {
  ok: <Check className="size-3.5" />,
  skipped: <Minus className="size-3.5" />,
  error: <X className="size-3.5" />,
};
const STATUS_RING: Record<T3Step["status"], string> = {
  ok: "bg-secure-muted text-secure border-secure/30",
  skipped: "bg-muted text-muted-foreground border-border",
  error: "bg-destructive/10 text-destructive border-destructive/30",
};

/**
 * Renders the Terminal 3 pipeline. While `pending` (request in flight) it shows a
 * spinner; once `receipt` arrives the real per-step results are revealed.
 */
export function SecureProgress({
  receipt,
  revealed,
}: {
  receipt: T3Receipt | null;
  revealed: number;
}) {
  const steps = receipt?.steps ?? PLACEHOLDER_STEPS;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-lg bg-secure-muted text-secure">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-xl text-foreground">Sealing & scoring on Terminal 3</h2>
          <p className="text-sm text-muted-foreground">
            Identity, vault, delegation, confidential compute, credential.
          </p>
        </div>
        {receipt && (
          <Badge
            variant={receipt.mode === "live" ? "secure" : "secondary"}
            className="ml-auto rounded-full"
          >
            {receipt.mode === "live" ? "live · testnet" : "fallback"}
          </Badge>
        )}
      </div>

      {receipt && (
        <div className="grid gap-3 sm:grid-cols-3">
          <IdentityCard icon={<Fingerprint className="size-4" />} label="User DID" value={shorten(receipt.userDid ?? "—", 12, 6)} />
          <IdentityCard icon={<Bot className="size-4" />} label="Agent DID" value={shorten(receipt.agentDid ?? "—", 12, 6)} />
          <IdentityCard
            icon={<Database className="size-4" />}
            label="Vault"
            value={receipt.vaultRef ? shorten(receipt.vaultRef, 8, 4) : `${receipt.storedBytes} B sealed`}
          />
        </div>
      )}

      <ol className="space-y-2.5">
        {steps.map((step, i) => {
          const isRevealed = !receipt || i < revealed;
          const showSpinner = !receipt && i === revealed;
          return (
            <li
              key={step.id}
              className={`flex items-start gap-3 rounded-lg border bg-card p-3.5 shadow-[var(--shadow-card)] transition-all duration-500 ${
                isRevealed ? "opacity-100 border-border" : "opacity-40 border-border/40"
              }`}
            >
              <span
                className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border ${
                  isRevealed && receipt ? STATUS_RING[step.status] : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {showSpinner ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : isRevealed && receipt ? (
                  STATUS_ICON[step.status]
                ) : (
                  <span className="font-mono text-[0.65rem] tnum">{i + 1}</span>
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{step.label}</p>
                {isRevealed && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function IdentityCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 font-mono text-sm break-all text-foreground tnum">{value}</p>
    </div>
  );
}

const PLACEHOLDER_STEPS: T3Step[] = [
  { id: "auth", label: "Authenticate on Terminal 3", status: "ok", detail: "" },
  { id: "seal", label: "Seal application into the TEE vault", status: "ok", detail: "" },
  { id: "delegate", label: "Delegate scoped authority to the agent", status: "ok", detail: "" },
  { id: "compute", label: "Compute score inside the boundary", status: "ok", detail: "" },
  { id: "credential", label: "Issue verifiable credential", status: "ok", detail: "" },
  { id: "audit", label: "Record attestable audit event", status: "ok", detail: "" },
];
