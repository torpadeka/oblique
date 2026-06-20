/** Formatting helpers (USD). */

/** Compact USD, e.g. 9_000_000 → "$9.0M". */
export function formatMoneyCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Full USD, e.g. "$9,000,000". */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatRatio(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(digits) + "×";
}

export function formatPct(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(digits) + "%";
}

/** Mask a tax ID, revealing only the last 4 characters. */
export function maskTaxId(taxId: string): string {
  if (!taxId) return "—";
  return "•••••" + taxId.slice(-4);
}

/** Short hash for display (e.g. DIDs / commitments). */
export function shorten(s: string, head = 10, tail = 6): string {
  if (!s) return "—";
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}
