import Link from "next/link";
import { ArrowRight, ShieldCheck, Lock, BadgeCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-24 left-1/2 size-[680px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />
      <div className="pointer-events-none absolute -top-10 right-1/4 size-[420px] rounded-full bg-secure/10 blur-3xl dark:bg-secure/15" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Badge variant="secondary" className="gap-1.5 rounded-full border-secure/30 bg-secure-muted/40 text-foreground">
            <ShieldCheck className="text-secure" />
            Built on the Terminal 3 Network
          </Badge>

          <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Prove creditworthiness.{" "}
            <span className="bg-gradient-to-br from-primary to-secure bg-clip-text text-transparent">
              Reveal nothing.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Oblique scores a borrower&apos;s credit inside a hardware-secured enclave.
            Sensitive financials are sealed on Terminal 3; an agent with a verifiable
            identity computes the score and issues a credential a lender can trust —
            without ever seeing the raw data.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/analyze"
              className={cn(buttonVariants({ size: "lg" }), "cursor-pointer h-11 px-5 text-base")}
            >
              Score an application
              <ArrowRight />
            </Link>
            <Link
              href="/#how"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "cursor-pointer h-11 px-5 text-base")}
            >
              See how it works
            </Link>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-secure" />
              <dt className="text-muted-foreground">Raw data exposed to lender:</dt>
              <dd className="font-semibold tnum">0 fields</dd>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="size-4 text-secure" />
              <dt className="text-muted-foreground">Score:</dt>
              <dd className="font-semibold">deterministic &amp; auditable</dd>
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

function VerdictPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary/20 to-secure/20 blur-2xl" />
      <div className="relative rounded-2xl border border-border/70 bg-card/90 p-6 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Credit Verdict
          </span>
          <Badge className="gap-1 rounded-full bg-secure/15 text-secure border-transparent">
            <ShieldCheck className="size-3.5" />
            TEE-attested
          </Badge>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <div className="text-6xl font-semibold leading-none tnum">87</div>
            <div className="mt-1 text-sm text-muted-foreground">baseline score / 100</div>
          </div>
          <div className="text-right">
            <div className="bg-gradient-to-br from-primary to-secure bg-clip-text text-4xl font-bold text-transparent">AA</div>
            <div className="text-xs text-muted-foreground">PD ≈ 0.9%</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            ["DSCR", "1.45×"],
            ["Leverage", "0.07×"],
            ["Coverage", "1.01×"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border/60 bg-muted/40 px-2 py-2">
              <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{k}</div>
              <div className="mt-0.5 text-sm font-semibold tnum">{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-lg border border-secure/25 bg-secure-muted/30 px-3 py-2.5">
          <Lock className="size-4 shrink-0 text-secure" />
          <p className="text-xs text-muted-foreground">
            Computed from sealed data. Tax IDs, accounts &amp; statements never left the enclave.
          </p>
        </div>
      </div>
    </div>
  );
}
