import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Analyzer } from "@/components/analyze/analyzer";

export const metadata: Metadata = {
  title: "Analyzer",
  description: "Score a credit application confidentially on the Terminal 3 Network.",
};

export default function AnalyzePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <Analyzer />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
