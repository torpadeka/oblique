import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="text-sm leading-relaxed text-muted-foreground max-w-sm">
            Confidential credit intelligence on the Terminal 3 Network. Prove
            creditworthiness, reveal nothing.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/analyze" className="hover:text-foreground cursor-pointer transition-colors">Launch app</Link>
          <a href="https://docs.terminal3.io" target="_blank" rel="noreferrer" className="hover:text-foreground cursor-pointer transition-colors">Terminal 3 docs</a>
          <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="hover:text-foreground cursor-pointer transition-colors">OpenRouter</a>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-[1200px] px-5 sm:px-8 py-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Built for the Terminal 3 Agent Dev Kit bounty. Sandbox / testnet — not financial advice.
        </p>
      </div>
    </footer>
  );
}
