import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DotField } from "@/components/dot-field";
import { cn } from "@/lib/utils";

export function CtaBand() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 sm:px-8">
      <div className="relative overflow-hidden rounded-lg border border-border bg-card px-6 py-16 text-center shadow-[var(--shadow-float)] sm:px-12">
        <DotField tone="spectrum" fade="center" className="opacity-[0.16]" />
        <div className="relative">
          <h2 className="font-display mx-auto max-w-2xl text-balance text-3xl text-foreground sm:text-4xl">
            Score a real credit memo in under a minute
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">
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
