import { cn } from "@/lib/utils";

/**
 * Oblique mark — a deep-indigo tile, an oblique slash, and a single ember dot
 * at its terminus (the rationed accent / the "score" point). Swiss-precise,
 * a quiet nod to the halftone atlas.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="28" height="28" rx="8" fill="var(--primary)" />
      {/* oblique slash */}
      <path
        d="M10 22 L20 12"
        stroke="var(--primary-foreground)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* faint halftone companions */}
      <circle cx="10" cy="22" r="1.15" fill="var(--primary-foreground)" opacity="0.55" />
      <circle cx="15" cy="17" r="1.15" fill="var(--primary-foreground)" opacity="0.35" />
      {/* ember terminus — the one rationed accent */}
      <circle cx="22.4" cy="9.6" r="2.5" fill="var(--value)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-medium tracking-tight", className)}>
      <BrandMark />
      <span className="text-lg text-foreground">Oblique</span>
    </span>
  );
}
