import { ClipboardList, KeyRound, Cpu, FileBadge2 } from "lucide-react";
import { DotField } from "@/components/dot-field";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Enter the application",
    body: "Fill the borrower's financials in the UI — or one-click load the sample credit memo. Nothing is scored client-side.",
  },
  {
    icon: KeyRound,
    title: "Seal on Terminal 3",
    body: "The user authenticates with their wallet to a verifiable DID. The raw application is sealed into the encrypted vault, and the Oblique agent is granted scoped authority to act on the user's behalf.",
  },
  {
    icon: Cpu,
    title: "Score in the enclave",
    body: "A deterministic engine derives ratios (DSCR, leverage, coverage, margins) and a baseline score inside the boundary. Identifiers are stripped — only de-identified features come out.",
  },
  {
    icon: FileBadge2,
    title: "Issue a verifiable credential",
    body: "The agent's LLM turns the de-identified features into a credit opinion and the agent issues a credential a lender can verify — score, band, recommendation — with zero raw fields disclosed.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative overflow-hidden border-y border-border bg-muted/30">
      <DotField tone="ink" fade="center" className="opacity-40" />
      <div className="relative mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <span className="section-label">How it works</span>
          <h2 className="font-display mt-4 text-balance text-3xl text-foreground sm:text-4xl">
            Four steps from raw application to verifiable score
          </h2>
        </div>

        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="relative rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground tnum">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-medium tracking-tight text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
