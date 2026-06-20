/** Formatting + parsing helpers. Indonesian credit memos use "1.234.567,89". */

/** Parse an Indonesian-formatted number string ("9.000.000.000,00") to a number. */
export function parseId(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const cleaned = value
    .toString()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Compact IDR, e.g. 9_000_000_000 → "Rp 9,00 B". */
export function formatIdrCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}Rp ${(abs / 1e12).toFixed(2)} T`;
  if (abs >= 1e9) return `${sign}Rp ${(abs / 1e9).toFixed(2)} B`;
  if (abs >= 1e6) return `${sign}Rp ${(abs / 1e6).toFixed(1)} M`;
  if (abs >= 1e3) return `${sign}Rp ${(abs / 1e3).toFixed(0)} K`;
  return `${sign}Rp ${abs.toFixed(0)}`;
}

/** Full IDR, e.g. "Rp 9.000.000.000". */
export function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
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

export function maskTaxId(npwp: string): string {
  if (!npwp) return "—";
  const tail = npwp.slice(-4);
  return `••.•••.•••.•-•••.${tail.slice(-3)}`;
}

/** Short hash for display (e.g. DIDs / commitments). */
export function shorten(s: string, head = 10, tail = 6): string {
  if (!s) return "—";
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}
