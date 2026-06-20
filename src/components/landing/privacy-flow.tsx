import { Fragment } from "react";
import { FileLock2, Cpu, ScanFace, Bot, BadgeCheck, ArrowRight, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    <section id="privacy" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="secondary" className="rounded-full">The privacy firewall</Badge>
        <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          The data crosses one boundary — and comes back safe
        </h2>
        <p className="mt-4 text-muted-foreground">
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
    </section>
  );
}

function Connector() {
  return (
    <div className="flex items-center justify-center text-muted-foreground/60">
      <ArrowRight className="hidden size-5 lg:block" />
      <ArrowDown className="size-5 lg:hidden" />
    </div>
  );
}

const toneRing: Record<string, string> = {
  neutral: "border-border/70",
  secure: "border-secure/35 bg-secure-muted/15",
  primary: "border-primary/35 bg-primary/5",
};
const toneIcon: Record<string, string> = {
  neutral: "text-muted-foreground bg-muted",
  secure: "text-secure bg-secure/15",
  primary: "text-primary bg-primary/15",
};
const chipTone: Record<string, string> = {
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  secure: "border-secure/30 bg-secure/10 text-secure",
};

function ZoneCard({ zone }: { zone: (typeof ZONES)[number] }) {
  const Icon = zone.icon;
  return (
    <div className={`flex h-full flex-col rounded-2xl border p-5 ${toneRing[zone.tone]}`}>
      <div className="flex items-center justify-between">
        <span className={`inline-flex size-9 items-center justify-center rounded-lg ${toneIcon[zone.tone]}`}>
          <Icon className="size-5" />
        </span>
        <span className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
          {zone.tag}
        </span>
      </div>
      <h3 className="mt-4 font-semibold leading-snug">{zone.title}</h3>
      <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{zone.body}</p>
      <span className={`mt-4 inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${chipTone[zone.chipTone]}`}>
        {zone.chip}
      </span>
    </div>
  );
}
