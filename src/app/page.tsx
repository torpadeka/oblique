import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/landing/hero";
import { PrivacyFlow } from "@/components/landing/privacy-flow";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { CtaBand } from "@/components/landing/cta";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <PrivacyFlow />
        <Features />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
