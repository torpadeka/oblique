import { Fingerprint, ShieldCheck, EyeOff, Scale, UserCheck, ScrollText } from "lucide-react";

const FEATURES = [
  {
    icon: Fingerprint,
    title: "Verifiable agent identity",
    body: "Every actor — user and agent — gets a did:t3n via the Agent Auth SDK. The agent authenticates as itself, then acts under the user's grant.",
  },
  {
    icon: ShieldCheck,
    title: "Confidential compute",
    body: "Scoring runs in a hardware-secured TEE on Terminal 3. Data is decryptable only inside the attested enclave — operator-blind by design.",
  },
  {
    icon: EyeOff,
    title: "Selective disclosure",
    body: "The lender verifies a credential — score, band, recommendation — without ever seeing the underlying tax IDs, accounts, or statements.",
  },
  {
    icon: Scale,
    title: "Deterministic & auditable",
    body: "The score is pure arithmetic over seven weighted pillars — no hallucinated numbers. Regulators get a model they can inspect.",
  },
  {
    icon: UserCheck,
    title: "Agent acts on your behalf",
    body: "A scoped, time-boxed delegation lets the agent read the vault and score — and nothing else. Read-only, no raw-field export, revocable.",
  },
  {
    icon: ScrollText,
    title: "Attestable audit trail",
    body: "Each access is host-stamped to an append-only trail bound to the user's DID — who acted, on whom, with which delegation.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24">
      <div className="max-w-2xl">
        <span className="section-label">Why Oblique</span>
        <h2 className="font-display mt-4 text-balance text-3xl text-foreground sm:text-4xl">
          The Agent Auth SDK, wired end to end
        </h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Identity, delegation, confidential compute, selective disclosure, and an audit
          trail — each Terminal 3 primitive carries real weight in the flow.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="group rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40"
            >
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted text-primary">
                <Icon className="size-4" />
              </span>
              <h3 className="mt-4 font-medium tracking-tight text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
