import type { RiskBand } from "@/lib/types";

export function bandColor(band: RiskBand): string {
  switch (band) {
    case "AAA":
    case "AA":
      return "var(--secure)";
    case "A":
    case "BBB":
      return "var(--primary)";
    case "BB":
    case "B":
      return "oklch(0.72 0.17 55)";
    default:
      return "var(--destructive)";
  }
}

export function ScoreGauge({
  score,
  band,
  size = 200,
}: {
  score: number;
  band: RiskBand;
  size?: number;
}) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--value)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-6xl font-light text-value tnum leading-none">{score}</span>
        <span className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground tnum">/ 100</span>
        <span className="mt-2 rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-foreground tnum">
          {band}
        </span>
      </div>
    </div>
  );
}
