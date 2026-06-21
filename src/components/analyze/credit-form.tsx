"use client";

import { Sparkles, RotateCcw, Lock, ArrowRight, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QvacReceiptCard } from "@/components/analyze/qvac-receipt";
import { formatMoneyCompact } from "@/lib/format";
import type { CreditInput, QvacReceipt } from "@/lib/types";

type FieldType = "text" | "number" | "money" | "date" | "textarea" | "select" | "checkbox";

interface FieldDef {
  key: keyof CreditInput;
  label: string;
  type: FieldType;
  full?: boolean;
  step?: string;
  options?: { value: number; label: string }[];
  hint?: string;
}

interface Section {
  title: string;
  description: string;
  pii?: boolean;
  fields: FieldDef[];
}

const SECTIONS: Section[] = [
  {
    title: "Borrower identity",
    description: "Direct identifiers. Sealed in the enclave — stripped before any analysis.",
    pii: true,
    fields: [
      { key: "companyName", label: "Company name", type: "text" },
      { key: "debtorName", label: "Debtor name", type: "text" },
      { key: "npwp", label: "Tax ID", type: "text" },
      { key: "nib", label: "Business reg. no.", type: "text" },
      { key: "companyAddress", label: "Address", type: "text", full: true },
      { key: "establishedDate", label: "Established", type: "date" },
      { key: "sector", label: "Sector", type: "text" },
      { key: "industry", label: "Industry", type: "text" },
      { key: "yearsInBusiness", label: "Years operating", type: "number" },
    ],
  },
  {
    title: "Facility",
    description: "The credit being requested.",
    fields: [
      { key: "loanPurpose", label: "Loan purpose", type: "textarea", full: true },
      { key: "plafonRequested", label: "Credit limit requested", type: "money" },
      { key: "plafonApproved", label: "Credit limit approved", type: "money" },
      { key: "tenorMonths", label: "Tenor (months)", type: "number" },
      { key: "interestRate", label: "Interest rate (% p.a.)", type: "number", step: "0.1" },
      { key: "repaymentScheme", label: "Repayment scheme", type: "text", full: true },
    ],
  },
  {
    title: "Financials (latest year, USD)",
    description: "Ratios are derived from these inside the boundary.",
    fields: [
      { key: "revenue", label: "Revenue", type: "money" },
      { key: "cogs", label: "COGS", type: "money" },
      { key: "operatingProfit", label: "Operating profit", type: "money" },
      { key: "netIncome", label: "Net income", type: "money" },
      { key: "ebitda", label: "EBITDA", type: "money" },
      { key: "interestExpense", label: "Interest expense", type: "money" },
      { key: "totalAssets", label: "Total assets", type: "money" },
      { key: "totalEquity", label: "Total equity", type: "money" },
      { key: "totalLiabilities", label: "Total liabilities", type: "money" },
      { key: "currentAssets", label: "Current assets", type: "money" },
      { key: "currentLiabilities", label: "Current liabilities", type: "money" },
      { key: "cash", label: "Cash & equivalents", type: "money" },
      { key: "inventory", label: "Inventory", type: "money" },
    ],
  },
  {
    title: "Debt service coverage",
    description: "Project DSCR scenarios.",
    fields: [
      { key: "dscrOptimistic", label: "DSCR — optimistic", type: "number", step: "0.01" },
      { key: "dscrModerate", label: "DSCR — moderate", type: "number", step: "0.01" },
      { key: "dscrPessimistic", label: "DSCR — pessimistic", type: "number", step: "0.01" },
    ],
  },
  {
    title: "Collateral & bureau",
    description: "Security and credit history.",
    fields: [
      { key: "collateralType", label: "Collateral type", type: "text", full: true },
      { key: "collateralMarketValue", label: "Market value", type: "money" },
      { key: "collateralLiquidationValue", label: "Liquidation value", type: "money" },
      {
        key: "slikQuality",
        label: "Bureau grade",
        type: "select",
        options: [
          { value: 1, label: "1 — Current" },
          { value: 2, label: "2 — Special mention" },
          { value: 3, label: "3 — Substandard" },
          { value: 4, label: "4 — Doubtful" },
          { value: 5, label: "5 — Loss" },
        ],
      },
      { key: "hasNpl", label: "Active NPL on bureau", type: "checkbox" },
    ],
  },
];

interface Props {
  value: CreditInput;
  onChange: (patch: Partial<CreditInput>) => void;
  onSubmit: () => void;
  onLoadSample: () => void;
  onReset: () => void;
  qvacReceipt?: QvacReceipt | null;
  busy?: boolean;
}

export function CreditForm({ value, onChange, onSubmit, onLoadSample, onReset, qvacReceipt, busy }: Props) {
  const fromDocs = Boolean(qvacReceipt);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {fromDocs ? "Review the parsed application" : "New credit assessment"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {fromDocs
              ? "QVAC drafted this from your documents — check the figures, then score."
              : "Enter the application, or load the sample memo."}
          </p>
        </div>
        <div className="flex gap-2">
          {!fromDocs && (
            <Button type="button" variant="outline" size="sm" onClick={onLoadSample} className="cursor-pointer">
              <Sparkles />
              Load sample
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={onReset} className="cursor-pointer">
            {fromDocs ? <FileUp /> : <RotateCcw />}
            {fromDocs ? "Re-upload" : "Reset"}
          </Button>
        </div>
      </div>

      {qvacReceipt && (
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardContent className="pt-6">
            <QvacReceiptCard receipt={qvacReceipt} />
          </CardContent>
        </Card>
      )}

      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">{section.title}</CardTitle>
              {section.pii && (
                <Badge variant="outline" className="gap-1 border-secure/30 text-secure">
                  <Lock className="size-3" />
                  sealed · stripped
                </Badge>
              )}
            </div>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.fields.map((f) => (
                <Field key={String(f.key)} def={f} value={value} onChange={onChange} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="sticky bottom-4 z-10">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/90 px-4 py-3 shadow-lg backdrop-blur">
          <p className="hidden text-sm text-muted-foreground sm:block">
            On submit, the application is sealed on Terminal 3 and scored in the enclave.
          </p>
          <Button type="submit" disabled={busy} className="cursor-pointer ml-auto h-10 px-5">
            {busy ? "Securing…" : "Score application"}
            {!busy && <ArrowRight />}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Field({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: CreditInput;
  onChange: (patch: Partial<CreditInput>) => void;
}) {
  const id = String(def.key);
  const raw = value[def.key];

  if (def.type === "checkbox") {
    return (
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-2.5 self-end rounded-lg border border-border/70 px-3 py-2.5 text-sm"
      >
        <input
          id={id}
          type="checkbox"
          checked={Boolean(raw)}
          onChange={(e) => onChange({ [def.key]: e.target.checked } as Partial<CreditInput>)}
          className="size-4 accent-[var(--primary)]"
        />
        {def.label}
      </label>
    );
  }

  return (
    <div className={def.full ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <Label htmlFor={id} className="mb-1.5 text-xs text-muted-foreground">
        {def.label}
      </Label>

      {def.type === "textarea" ? (
        <Textarea
          id={id}
          value={String(raw ?? "")}
          onChange={(e) => onChange({ [def.key]: e.target.value } as Partial<CreditInput>)}
          rows={2}
        />
      ) : def.type === "select" ? (
        <select
          id={id}
          value={Number(raw)}
          onChange={(e) => onChange({ [def.key]: Number(e.target.value) } as Partial<CreditInput>)}
          className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {def.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <Input
          id={id}
          type={def.type === "number" || def.type === "money" ? "number" : def.type === "date" ? "date" : "text"}
          inputMode={def.type === "money" || def.type === "number" ? "decimal" : undefined}
          step={def.step}
          value={def.type === "money" || def.type === "number" ? (Number(raw) || "") : String(raw ?? "")}
          onChange={(e) =>
            onChange({
              [def.key]:
                def.type === "money" || def.type === "number" ? Number(e.target.value) : e.target.value,
            } as Partial<CreditInput>)
          }
          className={def.type === "money" || def.type === "number" ? "tnum" : undefined}
        />
      )}

      {def.type === "money" && Number(raw) > 0 && (
        <p className="mt-1 text-[0.7rem] text-muted-foreground tnum">{formatMoneyCompact(Number(raw))}</p>
      )}
    </div>
  );
}
