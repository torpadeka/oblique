import { cn } from "@/lib/utils";

/**
 * Halftone dot-field — the brand spectrum gradient seen through a dot mask
 * (the "Column" atlas motif). Full-bleed, decorative, low-opacity; pair with
 * ample white space and a radial fade so it never fights the content.
 *
 * `tone="spectrum"` (default) = multicolor brand gradient dots.
 * `tone="ink"` = quiet monochrome indigo dot grid.
 */
export function DotField({
  className,
  tone = "spectrum",
  fade = "top",
}: {
  className?: string;
  tone?: "spectrum" | "ink";
  fade?: "top" | "bottom" | "center" | "none";
}) {
  const fadeMask =
    fade === "top"
      ? "[mask-image:radial-gradient(ellipse_120%_80%_at_50%_0%,black,transparent_75%)]"
      : fade === "bottom"
        ? "[mask-image:radial-gradient(ellipse_120%_80%_at_50%_100%,black,transparent_75%)]"
        : fade === "center"
          ? "[mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
          : "";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0",
        tone === "spectrum" ? "dotfield opacity-20" : "dotgrid opacity-70",
        fadeMask,
        className,
      )}
    />
  );
}
