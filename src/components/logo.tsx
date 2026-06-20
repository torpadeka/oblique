import { cn } from "@/lib/utils";

/** Oblique mark — an oblique slash bisecting a rounded square; amber→emerald. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="oblique-mark" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--secure)" />
        </linearGradient>
      </defs>
      <rect x="2.5" y="2.5" width="27" height="27" rx="8" stroke="url(#oblique-mark)" strokeWidth="2.4" />
      <path d="M10 22 L22 10" stroke="url(#oblique-mark)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="10" cy="22" r="2.1" fill="var(--secure)" />
      <circle cx="22" cy="10" r="2.1" fill="var(--primary)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <BrandMark />
      <span className="text-lg">Oblique</span>
    </span>
  );
}
