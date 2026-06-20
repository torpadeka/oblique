import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="text-sm text-muted-foreground max-w-sm">
            Confidential credit intelligence on the Terminal 3 Network. Prove
            creditworthiness, reveal nothing.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/analyze" className="hover:text-foreground cursor-pointer">Launch app</Link>
          <a href="https://docs.terminal3.io" target="_blank" rel="noreferrer" className="hover:text-foreground cursor-pointer">Terminal 3 docs</a>
          <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="hover:text-foreground cursor-pointer">OpenRouter</a>
        </div>
      </div>
      <div className="border-t border-border/60">
        <p className="mx-auto max-w-6xl px-4 sm:px-6 py-4 text-xs text-muted-foreground">
          Built for the Terminal 3 Agent Dev Kit bounty. Sandbox / testnet — not financial advice.
        </p>
      </div>
    </footer>
  );
}
