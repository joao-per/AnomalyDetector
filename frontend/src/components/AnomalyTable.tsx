import type { ReactNode } from "react";
import type { Anomaly } from "@/api/types";
import { compareAnomalieId, dash, formatDate, isHighCriticality } from "@/lib/format";
import { useI18n } from "@/i18n/i18n";
import type { TranslationKey } from "@/i18n/translations";
import { StatusBadge } from "./StatusBadge";
import { SupplierAvatar } from "./SupplierAvatar";
import { ChevronDownIcon } from "./icons";
import navLogo from "@/assets/dynamics-nav.png";

export type SortKey =
  | "anomalieId"
  | "anomalyType"
  | "vendorName"
  | "category"
  | "status"
  | "besteller"
  | "criticality"
  | "createdOn";

export interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

type Kind = "id" | "str" | "num";

interface Column {
  key: SortKey;
  labelKey: TranslationKey;
  kind: Kind;
  render: (a: Anomaly) => ReactNode;
  sortValue: (a: Anomaly) => string | number | null;
  cellClass?: (a: Anomaly) => string;
}

const COLUMNS: Column[] = [
  {
    key: "anomalieId",
    labelKey: "common.anomalieId",
    kind: "id",
    render: (a) => dash(a.anomalieId),
    sortValue: (a) => a.anomalieId,
    cellClass: () => "font-semibold text-ink",
  },
  { key: "anomalyType", labelKey: "common.type", kind: "str", render: (a) => dash(a.anomalyType), sortValue: (a) => a.anomalyType ?? "" },
  {
    key: "vendorName",
    labelKey: "common.vendor",
    kind: "str",
    render: (a) => (
      <span className="flex w-full min-w-0 items-center justify-center gap-2">
        <SupplierAvatar name={a.vendorName} />
        <span className="truncate">{dash(a.vendorName)}</span>
      </span>
    ),
    sortValue: (a) => a.vendorName ?? "",
  },
  {
    key: "category",
    labelKey: "common.category",
    kind: "str",
    render: (a) => dash(a.articleCategory ?? a.matchClass),
    sortValue: (a) => a.articleCategory ?? a.matchClass ?? "",
  },
  { key: "status", labelKey: "common.status", kind: "str", render: (a) => <StatusBadge status={a.status} />, sortValue: (a) => a.status ?? "" },
  { key: "besteller", labelKey: "common.besteller", kind: "str", render: (a) => dash(a.besteller), sortValue: (a) => a.besteller ?? "" },
  {
    key: "criticality",
    labelKey: "common.criticality",
    kind: "num",
    render: (a) => dash(a.criticalityClass),
    sortValue: (a) => a.criticality ?? -Infinity,
    cellClass: (a) => (isHighCriticality(a.criticalityClass) ? "font-semibold text-brand" : ""),
  },
  {
    key: "createdOn",
    labelKey: "common.createdAt",
    kind: "num", // sorted by timestamp
    render: (a) => formatDate(a.createdOn),
    sortValue: (a) => (a.createdOn ? Date.parse(a.createdOn) : -Infinity),
    cellClass: () => "tabular-nums",
  },
];

const GRID =
  "grid grid-cols-[1fr_1.35fr_1.3fr_1fr_1.1fr_1.15fr_0.85fr_1fr_2.5rem] gap-3 items-center";

/** Comparator driven by the active sort column + direction. */
export function compareAnomalies(a: Anomaly, b: Anomaly, sort: SortState): number {
  const col = COLUMNS.find((c) => c.key === sort.key) ?? COLUMNS[0];
  let r: number;
  if (col.kind === "id") r = compareAnomalieId(a.anomalieId, b.anomalieId);
  else if (col.kind === "num") r = Number(col.sortValue(a)) - Number(col.sortValue(b));
  else r = String(col.sortValue(a)).localeCompare(String(col.sortValue(b)), "de");
  // Stable tiebreaker so reversing direction visibly reorders even tied rows.
  if (r === 0) r = compareAnomalieId(a.anomalieId, b.anomalieId);
  return sort.dir === "asc" ? r : -r;
}

interface AnomalyTableProps {
  anomalies: Anomaly[];
  selectedId: string | null;
  onSelect: (a: Anomaly) => void;
  loading: boolean;
  error?: string;
  sort: SortState;
  onSort: (key: SortKey) => void;
}

export function AnomalyTable({
  anomalies,
  selectedId,
  onSelect,
  loading,
  error,
  sort,
  onSort,
}: AnomalyTableProps) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-lg">
      {/* Header — blood red, bold white, click any column to sort (toggles direction) */}
      <div className={`${GRID} bg-brand-dark px-7 py-3.5`}>
        {COLUMNS.map((col) => {
          const active = sort.key === col.key;
          const label = t(col.labelKey);
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => onSort(col.key)}
              title={t("table.sortBy", { label })}
              className="flex w-full min-w-0 cursor-pointer items-center justify-center gap-1 text-center text-sm font-bold text-white transition hover:text-white/80"
            >
              <span className="truncate">{label}</span>
              <ChevronDownIcon
                className={`h-3.5 w-3.5 shrink-0 transition ${
                  active ? "opacity-100" : "opacity-30"
                } ${active && sort.dir === "asc" ? "rotate-180" : ""}`}
              />
            </button>
          );
        })}
        {/* NAV-link column has no header label */}
        <span aria-hidden />
      </div>

      {/* Body */}
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        {loading && <RowMessage>{t("table.loading")}</RowMessage>}
        {error && !loading && (
          <RowMessage tone="error">{t("table.error", { error })}</RowMessage>
        )}
        {!loading && !error && anomalies.length === 0 && (
          <RowMessage>{t("table.empty")}</RowMessage>
        )}

        {!loading &&
          !error &&
          anomalies.map((a, i) => {
            const selected = a.id === selectedId;
            return (
              // div-with-button-role instead of <button>: the row contains the
              // NAV deep link (<a>), and interactive elements must not nest.
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(a)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(a);
                  }
                }}
                className={`${GRID} w-full cursor-pointer px-7 py-4 text-sm transition
                  ${selected
                    ? "bg-red-50 ring-1 ring-inset ring-brand/30"
                    : i % 2 === 1
                      ? "bg-surface hover:bg-red-50/60"
                      : "bg-white hover:bg-red-50/60"}`}
              >
                {COLUMNS.map((col) => (
                  <Cell key={col.key} className={col.cellClass?.(a) ?? ""}>
                    {col.render(a)}
                  </Cell>
                ))}
                <NavLinkButton href={a.navOrderLink} />
              </div>
            );
          })}
      </div>
    </div>
  );
}

/** Opens the anomaly's order in Dynamics NAV (at_navorderlink, a
 *  dynamicsnav:// deep link handled by the NAV client). */
function NavLinkButton({ href }: { href: string | null }) {
  const { t } = useI18n();
  if (!href) return <span aria-hidden />;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={t("table.openNav")}
      aria-label={t("table.openNav")}
      className="grid h-8 w-8 shrink-0 place-items-center justify-self-center rounded-lg bg-white
                 ring-1 ring-line shadow-sm transition hover:scale-105 hover:ring-brand"
    >
      <img src={navLogo} alt="" className="h-6 w-6 object-contain" />
    </a>
  );
}

function Cell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`truncate text-center text-ink/90 ${className}`}>{children}</span>
  );
}

function RowMessage({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "error";
}) {
  return (
    <div
      className={`px-7 py-10 text-center text-sm ${
        tone === "error" ? "text-brand-dark" : "text-muted"
      }`}
    >
      {children}
    </div>
  );
}
