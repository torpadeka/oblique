import { Fragment } from "react";
import { FileLock2, Cpu, ScanFace, Bot, BadgeCheck, ArrowRight, ArrowDown } from "lucide-react";
import { DotField } from "@/components/dot-field";

const ZONES = [
  {
    tag: "Your device",
    tone: "neutral" as const,
    icon: FileLock2,
    title: "Sensitive application",
    body: "Company name, tax ID, registration no., bank statements, full financials.",
    chip: "raw PII",
    chipTone: "danger" as const,
  },
  {
    tag: "Terminal 3 · TEE",
    tone: "secure" as const,
    icon: Cpu,
    title: "Sealed & scored in the enclave",
    body: "Decryptable only inside the attested TEE. A deterministic engine derives ratios and a score; identifiers are stripped.",
    chip: "encrypted · operator-blind",
    chipTone: "secure" as const,
  },
  {
    tag: "Client tier",
    tone: "primary" as const,
    icon: Bot,
    title: "Agent analyst reasons",
    body: "The LLM only ever receives de-identified ratios — never raw data — and writes the credit opinion.",
    chip: "de-identified only",
    chipTone: "secure" as const,
  },
  {
    tag: "Lender",
    tone: "neutral" as const,
    icon: BadgeCheck,
    title: "Verifies the credential",
    body: "Checks a verifiable credential: score, band, recommendation — without seeing a single raw field.",
    chip: "0 raw fields",
    chipTone: "secure" as const,
  },
];

export function PrivacyFlow() {
  return (
    <section id="privacy" className="relative overflow-hidden">
      <DotField tone="spectrum" fade="center" className="opacity-[0.14]" />
      <div className="relative mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-label">The privacy firewall</span>
          <h2 className="font-display mt-4 text-balance text-3xl text-foreground sm:text-4xl">
            The data crosses one boundary — and comes back safe
          </h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            The enclave is the firewall between raw financials and everything downstream.
            What leaves it is a score and a set of ratios. What stays is everything that could identify the borrower.
          </p>
        </div>

        <div className="mt-12 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
          {ZONES.map((zone, i) => (
            <Fragment key={zone.tag}>
              <ZoneCard zone={zone} />
              {i < ZONES.length - 1 && <Connector />}
            </Fragment>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ScanFace className="size-4 text-secure" />
          Every access by the agent is logged to an attestable audit trail bound to the user&apos;s DID.
        </div>
      </div>
    </section>
  );
}

function Connector() {
  return (
    <div className="flex items-center justify-center text-fog">
      <ArrowRight className="hidden size-5 lg:block" />
      <ArrowDown className="size-5 lg:hidden" />
    </div>
  );
}

const toneRing: Record<string, string> = {
  neutral: "border-border bg-card",
  secure: "border-secure/30 bg-secure-muted/20 dark:bg-secure/5",
  primary: "border-primary/30 bg-primary/5",
};
const toneIcon: Record<string, string> = {
  neutral: "text-primary bg-muted",
  secure: "text-secure bg-secure-muted dark:bg-secure/15",
  primary: "text-primary bg-primary/10",
};
const chipTone: Record<string, string> = {
  danger: "bg-destructive/10 text-destructive",
  secure: "bg-secure-muted text-[color:var(--color-forest-teal)] dark:bg-secure/15 dark:text-secure",
};

function ZoneCard({ zone }: { zone: (typeof ZONES)[number] }) {
  const Icon = zone.icon;
  return (
    <div className={`flex h-full flex-col rounded-lg border p-5 shadow-[var(--shadow-card)] ${toneRing[zone.tone]}`}>
      <div className="flex items-center justify-between">
        <span className={`inline-flex size-9 items-center justify-center rounded-lg ${toneIcon[zone.tone]}`}>
          <Icon className="size-4" />
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {zone.tag}
        </span>
      </div>
      <h3 className="mt-4 font-medium leading-snug tracking-tight text-foreground">{zone.title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{zone.body}</p>
      <span className={`mt-4 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${chipTone[zone.chipTone]}`}>
        {zone.chip}
      </span>
    </div>
  );
}
