import { ClipboardList, KeyRound, Cpu, FileBadge2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    <section id="how" className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="rounded-full">How it works</Badge>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Four steps from raw application to verifiable score
          </h2>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative rounded-2xl border border-border/70 bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
