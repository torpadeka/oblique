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
  const color = bandColor(band);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-semibold tnum leading-none">{score}</span>
        <span className="mt-1 text-xs text-muted-foreground">/ 100</span>
        <span
          className="mt-2 rounded-full px-2.5 py-0.5 text-sm font-bold"
          style={{ color, backgroundColor: "color-mix(in oklch, " + color + " 15%, transparent)" }}
        >
          {band}
        </span>
      </div>
    </div>
  );
}
