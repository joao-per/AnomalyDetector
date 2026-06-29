import type { ReactNode } from "react";
import type { Anomaly } from "@/api/types";
import { isHighCriticality, statusTone } from "@/lib/format";
import { useI18n } from "@/i18n/i18n";
import type { TranslationKey } from "@/i18n/translations";
import { CheckCircleIcon, DangerTriangleIcon, ProgressIcon } from "./icons";

export type CardKey = "total" | "critical" | "progress" | "resolved";

/** Does an anomaly belong to a given stat card? (drives the count + the filter) */
export function matchesCard(a: Anomaly, key: CardKey): boolean {
  switch (key) {
    case "critical":
      return isHighCriticality(a.criticalityClass);
    case "progress":
      return statusTone(a.status) === "progress";
    case "resolved":
      return statusTone(a.status) === "cancelled";
    default:
      return true;
  }
}

interface Variant {
  card: string;
  title: string;
  number: string;
  sub: string;
  iconWrap: string;
  icon: ReactNode;
  spark: string;
  light: boolean;
  ring: string;
  idle: string;
  values: number[];
}

const VARIANTS: Record<CardKey, Variant> = {
  total: {
    card: "bg-gradient-to-br from-brand-dark to-brand-darker text-white",
    title: "text-white",
    number: "text-white",
    sub: "text-white/65",
    iconWrap: "bg-white/15 text-white",
    icon: <DangerTriangleIcon className="h-4 w-4" />,
    spark: "#ffffff",
    light: true,
    ring: "ring-2 ring-white/70",
    idle: "ring-1 ring-white/10",
    values: [0.42, 0.5, 0.4, 0.58, 0.5, 0.72, 0.52, 0.66, 0.5],
  },
  critical: {
    card: "bg-white text-ink",
    title: "text-brand",
    number: "text-ink",
    sub: "text-muted",
    iconWrap: "bg-red-100 text-brand",
    icon: <DangerTriangleIcon className="h-4 w-4" />,
    spark: "#f50d0d",
    light: false,
    ring: "ring-2 ring-brand",
    idle: "ring-1 ring-black/5",
    values: [0.18, 0.26, 0.16, 0.3, 0.2, 0.28, 0.18, 0.34, 0.22],
  },
  progress: {
    card: "bg-white text-ink",
    title: "text-amber-500",
    number: "text-ink",
    sub: "text-muted",
    iconWrap: "bg-amber-100 text-amber-500",
    icon: <ProgressIcon className="h-4 w-4" />,
    spark: "#f59e0b",
    light: false,
    ring: "ring-2 ring-amber-400",
    idle: "ring-1 ring-black/5",
    values: [0.24, 0.34, 0.46, 0.6, 0.74, 0.58, 0.5, 0.62, 0.54],
  },
  resolved: {
    card: "bg-white text-ink",
    title: "text-emerald-600",
    number: "text-ink",
    sub: "text-muted",
    iconWrap: "bg-emerald-100 text-emerald-600",
    icon: <CheckCircleIcon className="h-4 w-4" />,
    spark: "#10b981",
    light: false,
    ring: "ring-2 ring-emerald-500",
    idle: "ring-1 ring-black/5",
    values: [0.2, 0.28, 0.34, 0.3, 0.46, 0.56, 0.62, 0.74, 0.82],
  },
};

interface StatCardsProps {
  anomalies: Anomaly[];
  active: CardKey;
  onSelect: (key: CardKey) => void;
}

export function StatCards({ anomalies, active, onSelect }: StatCardsProps) {
  const { t } = useI18n();

  const total = anomalies.length;
  const critical = anomalies.filter((a) => matchesCard(a, "critical")).length;
  const progress = anomalies.filter((a) => matchesCard(a, "progress")).length;
  const resolved = anomalies.filter((a) => matchesCard(a, "resolved")).length;
  const suppliers = new Set(
    anomalies.map((a) => (a.vendorName ?? "").trim()).filter(Boolean),
  ).size;

  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : "0");

  const cards: { key: CardKey; titleKey: TranslationKey; count: number; sub: string }[] = [
    {
      key: "total",
      titleKey: "card.totalTitle",
      count: total,
      sub: t("card.suppliersAffected", { n: suppliers }),
    },
    {
      key: "critical",
      titleKey: "card.criticalTitle",
      count: critical,
      sub: t("card.ofTotal", { pct: pct(critical) }),
    },
    {
      key: "progress",
      titleKey: "card.progressTitle",
      count: progress,
      sub: t("card.ofTotal", { pct: pct(progress) }),
    },
    {
      key: "resolved",
      titleKey: "card.resolvedTitle",
      count: resolved,
      sub: t("card.ofTotal", { pct: pct(resolved) }),
    },
  ];

  return (
    <div className="flex w-52 shrink-0 flex-col justify-end gap-3.5">
      {cards.map((c) => {
        const v = VARIANTS[c.key];
        const selected = c.key === active;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelect(c.key)}
            className={`relative flex h-36 w-full shrink-0 flex-col overflow-hidden rounded-3xl
              p-5 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl
              ${v.card} ${selected ? v.ring : v.idle}`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className={`text-[13px] font-semibold leading-tight ${v.title}`}>
                {t(c.titleKey)}
              </h3>
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${v.iconWrap}`}
              >
                {v.icon}
              </span>
            </div>
            <div className={`mt-2.5 text-4xl font-bold leading-none ${v.number}`}>{c.count}</div>
            <div className={`mt-1.5 text-[11px] font-medium ${v.sub}`}>{c.sub}</div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0">
              <Sparkline id={`spark-${c.key}`} values={v.values} color={v.spark} light={v.light} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Sparkline ──────────────────────────────────────────────────────────────
const W = 260;
const H = 64;
const PAD = 8;

function buildPaths(values: number[]) {
  const n = values.length;
  const stepX = W / (n - 1);
  const pts = values.map(
    (val, i) => [i * stepX, H - PAD - val * (H - PAD * 2)] as const,
  );
  let line = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    line += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  const area = `${line} L ${W},${H} L 0,${H} Z`;
  return { line, area };
}

function Sparkline({
  id,
  values,
  color,
  light,
}: {
  id: string;
  values: number[];
  color: string;
  light: boolean;
}) {
  const { line, area } = buildPaths(values);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-14 w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={light ? 0.28 : 0.3} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={light ? 2.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={light ? 0.9 : 1}
      />
    </svg>
  );
}
