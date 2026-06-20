import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CtaBand() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card px-6 py-14 text-center sm:px-12">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="pointer-events-none absolute -bottom-24 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/15 to-secure/15 blur-3xl" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Score a real credit memo in under a minute
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Load the sample application, watch it seal into the enclave, and get a
            verifiable verdict — no raw data ever leaves the boundary.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/analyze"
              className={cn(buttonVariants({ size: "lg" }), "cursor-pointer h-11 px-6 text-base")}
            >
              Launch the analyzer
              <ArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
