"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  EyeOff,
  Eye,
  RotateCcw,
  Bot,
  Fingerprint,
  Database,
  ScrollText,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScoreGauge } from "@/components/analyze/score-gauge";
import { formatPct, formatRatio, maskTaxId, shorten } from "@/lib/format";
import type { CreditInput, CreditVerdict, SecureResult } from "@/lib/types";

const REC_TONE: Record<string, string> = {
  Approve: "bg-secure-muted text-secure border-secure/30",
  "Approve with conditions": "bg-secure-muted/60 text-secure border-secure/20",
  Refer: "bg-muted text-foreground border-border",
  Decline: "bg-destructive/10 text-destructive border-destructive/30",
};

export function ResultView({
  input,
  result,
  verdict,
  onReset,
}: {
  input: CreditInput;
  result: SecureResult;
  verdict: CreditVerdict | null;
  onReset: () => void;
}) {
  const { features, receipt, credential } = result;

  return (
    <div className="space-y-6">
      {/* ── Summary banner ── */}
      <Card className="overflow-hidden border-border shadow-[var(--shadow-float)]">
        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex justify-center">
            <ScoreGauge score={features.baselineScore} band={features.baselineBand} />
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {verdict && (
                <Badge className={`rounded-full px-3 py-1 text-sm ${REC_TONE[verdict.recommendation]}`}>
                  {verdict.recommendation}
                </Badge>
              )}
              <Badge variant="secure" className="gap-1 rounded-full px-3 py-1">
                <ShieldCheck className="size-3.5" />
                {receipt.mode === "live" ? "TEE-attested · testnet" : "fallback"}
              </Badge>
              {verdict && (
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground tnum">
                  confidence: {verdict.confidence}
                </span>
              )}
            </div>
            <p className="font-display text-2xl text-foreground text-balance">
              {verdict?.headline ?? (
                <>
                  Deterministic score computed{" "}
                  <span className="text-fog">inside the boundary.</span>
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <Stat label="Probability of default" value={formatPct(features.probabilityOfDefaultPct)} />
              <Stat label="DSCR (moderate)" value={formatRatio(features.dscrModerate)} />
              <Stat label="Collateral coverage" value={formatRatio(features.collateralCoverageLiquidation)} />
              <Stat label="Leverage (DER)" value={formatRatio(features.debtToEquity)} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={onReset} className="cursor-pointer">
                <RotateCcw />
                New assessment
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="verdict">
        <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="verdict" className="cursor-pointer">Analyst verdict</TabsTrigger>
          <TabsTrigger value="breakdown" className="cursor-pointer">Score breakdown</TabsTrigger>
          <TabsTrigger value="credential" className="cursor-pointer">Credential</TabsTrigger>
          <TabsTrigger value="receipt" className="cursor-pointer">Terminal 3 receipt</TabsTrigger>
        </TabsList>

        <TabsContent value="verdict" className="mt-4">
          <VerdictPanel verdict={verdict} />
        </TabsContent>
        <TabsContent value="breakdown" className="mt-4">
          <BreakdownPanel result={result} />
        </TabsContent>
        <TabsContent value="credential" className="mt-4">
          <CredentialPanel input={input} result={result} verdict={verdict} />
        </TabsContent>
        <TabsContent value="receipt" className="mt-4">
          <ReceiptPanel result={result} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-medium text-foreground tnum">{value}</div>
    </div>
  );
}

/* ── Analyst verdict ── */
function VerdictPanel({ verdict }: { verdict: CreditVerdict | null }) {
  if (!verdict) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">Analyzing…</CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 font-display text-lg text-foreground">
              <Bot className="size-4 text-primary" />
              Agent analyst opinion
            </CardTitle>
            <Badge variant="secondary" className="rounded-full font-mono text-[0.7rem]">
              {verdict.model}
            </Badge>
          </div>
          <CardDescription>Reasoned over de-identified features only — no raw data.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{verdict.summary}</p>
        </CardContent>
      </Card>

      <ListCard title="Strengths" tone="secure" icon={<CheckCircle2 className="size-4" />} items={verdict.strengths} />
      <ListCard title="Risks" tone="warn" icon={<AlertTriangle className="size-4" />} items={verdict.risks} />
      <ListCard title="Conditions" tone="primary" icon={<ScrollText className="size-4" />} items={verdict.conditions} empty="No conditions attached." />
    </div>
  );
}

function ListCard({
  title,
  items,
  icon,
  tone,
  empty,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  tone: "secure" | "warn" | "primary";
  empty?: string;
}) {
  const toneClass =
    tone === "secure" ? "text-secure" : tone === "warn" ? "text-value" : "text-primary";
  return (
    <Card>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider ${toneClass}`}>
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <ul className="space-y-2 text-sm">
            {items.map((it, i) => (
              <li key={i} className="flex gap-2">
                <span className={`mt-1.5 size-1.5 shrink-0 rounded-full bg-current ${toneClass}`} />
                <span className="text-muted-foreground">{it}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{empty ?? "—"}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Score breakdown ── */
function BreakdownPanel({ result }: { result: SecureResult }) {
  const { features } = result;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg text-foreground">Weighted pillars</CardTitle>
          <CardDescription>Deterministic — each pillar is auditable arithmetic.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {features.pillars.map((p) => (
            <div key={p.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-foreground">{p.label}</span>
                <span className="font-mono text-xs text-muted-foreground tnum">
                  {p.score} · w{Math.round(p.weight * 100)}%
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground"
                  style={{
                    width: `${p.score}%`,
                    transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg text-foreground">Reason codes</CardTitle>
          <CardDescription>Machine-readable drivers behind the score.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {features.reasonCodes.map((r) => (
            <div key={r.code} className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-2.5">
              <Badge
                variant="outline"
                className={`shrink-0 font-mono text-[0.65rem] ${
                  r.kind === "positive"
                    ? "border-secure/30 text-secure"
                    : r.kind === "negative"
                      ? "border-destructive/30 text-destructive"
                      : "border-border text-muted-foreground"
                }`}
              >
                {r.code}
              </Badge>
              <p className="text-xs text-muted-foreground">{r.message}</p>
            </div>
          ))}
          {features.flags.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="flex flex-wrap gap-1.5">
                {features.flags.map((f) => (
                  <Badge key={f} variant="secondary" className="font-mono text-[0.65rem]">
                    {f}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Credential + selective disclosure ── */
function CredentialPanel({
  input,
  result,
  verdict,
}: {
  input: CreditInput;
  result: SecureResult;
  verdict: CreditVerdict | null;
}) {
  const { credential, features } = result;
  const [showSealed, setShowSealed] = useState(false);

  const lenderView: [string, string][] = [
    ["Risk band", credential.credentialSubject.riskBand],
    ["Credit score", String(credential.credentialSubject.creditScore)],
    ["Probability of default", formatPct(credential.credentialSubject.probabilityOfDefaultPct)],
    ["DSCR (moderate)", formatRatio(credential.credentialSubject.dscrModerate)],
    ["Collateral coverage", formatRatio(credential.credentialSubject.collateralCoverageLiquidation)],
    ["Sector", credential.credentialSubject.sector],
    ["Recommendation", verdict?.recommendation ?? credential.credentialSubject.recommendation],
  ];

  const sealed: [string, string][] = [
    ["Company name", input.companyName],
    ["Debtor", input.debtorName],
    ["Tax ID", maskTaxId(input.npwp)],
    ["Business reg.", input.nib ? "•••••••" + input.nib.slice(-3) : "—"],
    ["Address", input.companyAddress ? input.companyAddress.split(",")[0] + ", •••" : "—"],
    ["Revenue / financials", "••• sealed in enclave"],
  ];

  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(credential, null, 2));
    toast.success("Credential copied to clipboard");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-secure/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg text-foreground">
            <BadgeCheck className="size-4 text-secure" />
            What the lender verifies
          </CardTitle>
          <CardDescription>The credential subject — selective disclosure, 0 raw fields.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border">
            {lenderView.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium text-foreground tnum">{v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 font-display text-lg text-foreground">
              <EyeOff className="size-4 text-muted-foreground" />
              What stays sealed
            </CardTitle>
            <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => setShowSealed((s) => !s)}>
              {showSealed ? <Eye /> : <EyeOff />}
              {showSealed ? "Hide" : "Reveal (owner)"}
            </Button>
          </div>
          <CardDescription>Never leaves the enclave; the LLM and lender never see it.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border">
            {sealed.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className={`text-foreground tnum ${showSealed ? "font-medium" : "blur-[5px] select-none"}`}>{v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="font-display text-lg text-foreground">Verifiable credential</CardTitle>
            <Button variant="outline" size="sm" onClick={copy} className="cursor-pointer">
              <Copy />
              Copy JSON
            </Button>
          </div>
          <CardDescription>
            Issued by the agent DID, bound to feature commitment{" "}
            <span className="font-mono text-foreground">{shorten(credential.credentialSubject.featureCommitment, 10, 8)}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed text-foreground">
            <code>{JSON.stringify(credential, null, 2)}</code>
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            The commitment hashes the exact de-identified feature set ({features.pillars.length} pillars) — any
            tampering with the disclosed numbers invalidates the proof.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Terminal 3 receipt ── */
function ReceiptPanel({ result }: { result: SecureResult }) {
  const { receipt } = result;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <IdCard icon={<Fingerprint className="size-4" />} label="User DID" value={receipt.userDid ?? "—"} />
        <IdCard icon={<Bot className="size-4" />} label="Agent DID" value={receipt.agentDid ?? "—"} />
        <IdCard
          icon={<Database className="size-4" />}
          label="Vault / audit"
          value={receipt.vaultRef ?? receipt.auditEventId ?? `${receipt.storedBytes} B sealed`}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="font-display text-lg text-foreground">Pipeline steps</CardTitle>
            <Badge
              variant={receipt.mode === "live" ? "secure" : "secondary"}
              className="rounded-full"
            >
              {receipt.mode} · {receipt.environment}
            </Badge>
          </div>
          {receipt.note && <CardDescription>{receipt.note}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-2">
          {receipt.steps.map((s) => (
            <div key={s.id} className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <Badge
                variant="outline"
                className={`shrink-0 font-mono text-[0.65rem] ${
                  s.status === "ok"
                    ? "border-secure/30 text-secure"
                    : s.status === "error"
                      ? "border-destructive/30 text-destructive"
                      : "border-border text-muted-foreground"
                }`}
              >
                {s.status}
              </Badge>
              <div>
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function IdCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 font-mono text-xs break-all text-foreground tnum">{value}</p>
    </div>
  );
}
