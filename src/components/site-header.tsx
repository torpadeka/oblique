"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#privacy", label: "Privacy" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="cursor-pointer" aria-label="Oblique home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "cursor-pointer text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/analyze" className={cn(buttonVariants({ size: "sm" }), "cursor-pointer")}>
            Launch app
            <ArrowRight />
          </Link>
        </div>
      </div>
    </header>
  );
}
