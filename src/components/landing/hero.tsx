import Link from "next/link";
import { ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DotField } from "@/components/dot-field";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/70">
      <DotField tone="spectrum" fade="top" className="opacity-[0.16]" />

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="section-label">
            <ShieldCheck className="size-3.5" />
            Built on Terminal 3
          </span>

          <h1 className="font-display mt-6 text-balance text-5xl text-foreground sm:text-6xl lg:text-[4.25rem]">
            Prove creditworthiness.{" "}
            <span className="text-fog">Reveal nothing.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Oblique scores a borrower&apos;s credit inside a hardware-secured enclave.
            Sensitive financials are sealed on Terminal 3; an agent with a verifiable
            identity computes the score and issues a credential a lender can trust —
            without ever seeing the raw data.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/analyze"
              className={cn(buttonVariants({ size: "lg" }), "h-11 cursor-pointer px-5 text-base")}
            >
              Score an application
              <ArrowRight />
            </Link>
            <Link
              href="/#how"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 cursor-pointer px-5 text-base",
              )}
            >
              See how it works
            </Link>
          </div>

          <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Data exposed to lender
              </dt>
              <dd className="mt-1 text-xl font-light tracking-tight tnum">0 fields</dd>
            </div>
            <div className="hidden h-10 w-px self-center bg-border sm:block" />
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                The score
              </dt>
              <dd className="mt-1 text-xl font-light tracking-tight">Deterministic &amp; auditable</dd>
            </div>
          </dl>
        </div>

        <div className="animate-in fade-in zoom-in-95 duration-700 delay-150">
          <VerdictPreview />
        </div>
      </div>
    </section>
  );
}

/** The floating Financial Data Card — the site's primary illustration device. */
function VerdictPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="relative rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-float)]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Credit Verdict
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secure-muted px-2.5 py-0.5 text-[11px] font-medium text-[color:var(--color-forest-teal)] dark:bg-secure/15 dark:text-secure">
            <ShieldCheck className="size-3" />
            TEE-attested
          </span>
        </div>

        <div className="my-5 h-px bg-border" />

        <div className="flex items-end justify-between">
          <div>
            <div className="text-6xl font-light leading-none tracking-tight text-value tnum">87</div>
            <div className="mt-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              baseline score / 100
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-light tracking-tight text-foreground">AA</div>
            <div className="mt-1 text-xs text-muted-foreground tnum">PD ≈ 0.9%</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            ["DSCR", "1.45×"],
            ["Leverage", "0.07×"],
            ["Coverage", "1.01×"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border bg-background px-2 py-2.5">
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
              <div className="mt-1 text-sm font-medium tracking-tight tnum">{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2.5 rounded-lg bg-secure-muted/50 px-3 py-2.5 dark:bg-secure/10">
          <Lock className="size-4 shrink-0 text-secure" />
          <p className="text-xs leading-snug text-muted-foreground">
            Computed from sealed data. Tax IDs, accounts &amp; statements never left the enclave.
          </p>
        </div>
      </div>
    </div>
  );
}
