import { STATUS } from "@/api/types";

export type StatusTone = "new" | "progress" | "cancelled" | "unknown";

/** Map a raw Dataverse status to a visual tone (label is translated in the UI). */
export function statusTone(status: string | null | undefined): StatusTone {
  switch (String(status ?? "").trim()) {
    case STATUS.NEW:
      return "new";
    case STATUS.IN_PROGRESS:
      return "progress";
    case STATUS.CANCELLED:
      return "cancelled";
    default:
      return "unknown";
  }
}

/** Is this a "high criticality" label? Used to colour the cell red. */
export function isHighCriticality(value: unknown): boolean {
  const v = String(value ?? "").trim().toLowerCase();
  return ["hoch", "alta", "high", "kritisch", "hoch/kritisch"].includes(v);
}

/**
 * Rough 0..1 "fill level" for the criticality meter (the beer-glass gauge).
 * Reads the human label first, falling back to the numeric level / 0.5.
 */
export function criticalityFraction(
  value: unknown,
  level?: number | null,
): number {
  const c = String(value ?? "").trim().toLowerCase();
  if (/(hoch|high|kritisch|alta|critical|critico|crítico)/.test(c)) return 1;
  if (/(mittel|middle|medium|medio|médio|moderat|moderate)/.test(c)) return 0.62;
  if (/(niedrig|low|gering|baixo|leicht|minor)/.test(c)) return 0.3;
  if (typeof level === "number" && level > 0) return Math.min(1, level / 4);
  return 0.5;
}

/**
 * Normalise a raw anomaly score to a 0..1 fraction for the gauge.
 * ML anomaly scores are usually 0..1; we defensively handle 0..100 and 0..1000.
 */
export function scoreFraction(score: number | null | undefined): number | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null;
  let f = score;
  if (f > 1 && f <= 100) f = f / 100;
  else if (f > 100) f = f / 1000;
  return Math.max(0, Math.min(1, f));
}

/** Per-mille label for the gauge, e.g. 0.065 -> "65‰". */
export function permille(fraction: number | null): string {
  if (fraction === null) return "—";
  return `${Math.round(fraction * 1000)}‰`;
}

/** Parse an anomalieId like "26_2431" into [26, 2431] for numeric sorting. */
function anomalieIdParts(id: string | null | undefined): [number, number] {
  const [a, b] = String(id ?? "").split("_");
  const na = parseInt(a, 10);
  const nb = parseInt(b ?? "", 10);
  return [Number.isNaN(na) ? -Infinity : na, Number.isNaN(nb) ? -Infinity : nb];
}

/** Ascending comparator for an anomalieId ("26_2431"), numeric-aware. */
export function compareAnomalieId(a: string | null, b: string | null): number {
  const [a1, a2] = anomalieIdParts(a);
  const [b1, b2] = anomalieIdParts(b);
  return a1 - b1 || a2 - b2;
}

export function dash(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const s = String(value).trim();
  return s ? s : "—";
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
