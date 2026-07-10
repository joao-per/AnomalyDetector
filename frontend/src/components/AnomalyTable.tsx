import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Anomaly } from "@/api/types";
import { useDeleteAnomalies } from "@/api/hooks";
import { compareAnomalieId, dash, formatDate, isHighCriticality } from "@/lib/format";
import { useI18n } from "@/i18n/i18n";
import type { TranslationKey } from "@/i18n/translations";
import { StatusBadge } from "./StatusBadge";
import { SupplierAvatar } from "./SupplierAvatar";
import { HistoryModal } from "./HistoryModal";
import { ExplainModal } from "./ExplainModal";
import { ChevronDownIcon, HistoryIcon, SparklesIcon, TrashIcon } from "./icons";
import navLogo from "@/assets/dynamics-nav.png";

export type SortKey =
  | "anomalieId"
  | "anomalyType"
  | "vendorName"
  | "category"
  | "status"
  | "besteller"
  | "criticality"
  | "orderNumber"
  | "detectedAt";

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

/** The user-facing "creation date" is the DETECTION time (SQL created_at).
 *  Dataverse's createdon is only the sync time — a re-sync would make
 *  months-old anomalies look brand new. Fallback keeps unsynced rows sane. */
function detectionDate(a: Anomaly): string | null {
  return a.detectedAt ?? a.createdOn;
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
    key: "orderNumber",
    labelKey: "common.orderNo",
    kind: "str",
    render: (a) => dash(a.orderNumber),
    sortValue: (a) => a.orderNumber ?? "",
    cellClass: () => "tabular-nums",
  },
  {
    key: "detectedAt",
    labelKey: "common.createdAt",
    kind: "num", // sorted by timestamp
    render: (a) => formatDate(detectionDate(a)),
    sortValue: (a) => {
      const d = detectionDate(a);
      return d ? Date.parse(d) : -Infinity;
    },
    cellClass: () => "tabular-nums",
  },
];

export const SORT_KEYS: readonly SortKey[] = COLUMNS.map((c) => c.key);

// checkbox | data columns | actions
const GRID =
  "grid grid-cols-[1.1rem_1fr_1.3fr_1.25fr_1fr_1.05fr_1.1fr_0.85fr_0.95fr_1fr_9rem] gap-2 items-center";

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
  const [historyFor, setHistoryFor] = useState<Anomaly | null>(null);
  const [explainFor, setExplainFor] = useState<Anomaly | null>(null);

  // Multi-select for the permanent-delete flow. Only ids still visible count —
  // rows filtered away (or already deleted) drop out automatically.
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const checkedVisible = anomalies.filter((a) => checkedIds.has(a.id));
  const allChecked = anomalies.length > 0 && checkedVisible.length === anomalies.length;

  function toggleOne(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setCheckedIds(allChecked ? new Set() : new Set(anomalies.map((a) => a.id)));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-lg">
      {/* Header — blood red, bold white, click any column to sort (toggles direction) */}
      <div className={`${GRID} bg-brand-dark px-5 py-3.5`}>
        <input
          type="checkbox"
          checked={allChecked}
          onChange={toggleAll}
          title={t("table.selectAll")}
          aria-label={t("table.selectAll")}
          className="h-4 w-4 cursor-pointer accent-white"
        />
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
                className={`${GRID} w-full cursor-pointer px-5 py-4 text-sm transition
                  ${selected
                    ? "bg-red-50 ring-1 ring-inset ring-brand/30"
                    : i % 2 === 1
                      ? "bg-surface hover:bg-red-50/60"
                      : "bg-white hover:bg-red-50/60"}`}
              >
                <input
                  type="checkbox"
                  checked={checkedIds.has(a.id)}
                  onChange={() => toggleOne(a.id)}
                  onClick={(e) => e.stopPropagation()}
                  title={t("table.selectRow", { id: a.anomalieId ?? "" })}
                  aria-label={t("table.selectRow", { id: a.anomalieId ?? "" })}
                  className="h-4 w-4 cursor-pointer accent-brand"
                />
                {COLUMNS.map((col) => (
                  <Cell key={col.key} className={col.cellClass?.(a) ?? ""}>
                    {col.render(a)}
                  </Cell>
                ))}
                <span className="flex items-center justify-center gap-1.5">
                  <ExplainButton onOpen={() => setExplainFor(a)} />
                  <HistoryButton onOpen={() => setHistoryFor(a)} />
                  <NavLinkButton href={a.navOrderLink} />
                </span>
              </div>
            );
          })}
      </div>

      {/* Delete bar — appears while rows are selected */}
      {checkedVisible.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-line bg-rose-50/70 px-7 py-2.5">
          <span className="text-sm font-semibold text-ink">
            {t("delete.selected", { n: checkedVisible.length })}
          </span>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm
                       font-semibold text-white shadow-sm transition hover:bg-rose-700"
          >
            <TrashIcon className="h-4 w-4" />
            {t("delete.button")}
          </button>
        </div>
      )}

      {historyFor && (
        <HistoryModal anomaly={historyFor} onClose={() => setHistoryFor(null)} />
      )}
      {explainFor && (
        <ExplainModal anomaly={explainFor} onClose={() => setExplainFor(null)} />
      )}
      {confirmOpen && (
        <DeleteConfirmModal
          targets={checkedVisible}
          onDone={(remaining) => {
            setCheckedIds(new Set(remaining));
            setConfirmOpen(false);
          }}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}

/** Confirmation for the PERMANENT Dataverse delete. Also the cleanup path for
 *  orphaned records whose source row no longer exists in SQL. */
function DeleteConfirmModal({
  targets,
  onDone,
  onClose,
}: {
  targets: Anomaly[];
  /** Called after deleting; receives the ids that could NOT be deleted. */
  onDone: (remainingIds: string[]) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const del = useDeleteAnomalies();
  const [failedMsg, setFailedMsg] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !del.isPending) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [del.isPending, onClose]);

  function run() {
    setFailedMsg(null);
    del.mutate(
      targets.map((a) => a.id),
      {
        onSuccess: (failed) => {
          if (failed.length === 0) {
            onDone([]);
          } else {
            setFailedMsg(t("delete.failed", { n: failed.length, total: targets.length }));
            onDone(failed);
          }
        },
      },
    );
  }

  const ids = targets
    .map((a) => a.anomalieId)
    .filter(Boolean)
    .slice(0, 8)
    .join(", ");

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !del.isPending && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={t("delete.title")}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
      >
        <div className="flex items-center gap-3 bg-rose-600 px-5 py-4 text-white">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20">
            <TrashIcon className="h-4.5 w-4.5" />
          </span>
          <h2 className="text-base font-bold">{t("delete.title")}</h2>
        </div>
        <div className="space-y-2 px-5 py-4">
          <p className="text-sm text-ink">
            {t("delete.message", { n: targets.length })}
          </p>
          {ids && (
            <p className="text-xs text-muted">
              {ids}
              {targets.length > 8 ? ", …" : ""}
            </p>
          )}
          {failedMsg && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {failedMsg}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={del.isPending}
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted transition hover:text-ink
                       disabled:opacity-50"
          >
            {t("delete.cancel")}
          </button>
          <button
            type="button"
            onClick={run}
            disabled={del.isPending}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm
                       transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-70"
          >
            {del.isPending ? t("delete.working") : t("delete.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** "Erklär mal" — asks the AI to explain this anomaly's plot in an overlay. */
function ExplainButton({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      title={t("table.explain")}
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-white px-2 text-xs
                 font-semibold text-brand-dark ring-1 ring-line shadow-sm transition
                 hover:scale-105 hover:ring-brand"
    >
      <SparklesIcon className="h-3.5 w-3.5 text-brand" />
      {t("table.explain")}
    </button>
  );
}

/** Opens the change-history overlay for this row. */
function HistoryButton({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      title={t("table.openHistory")}
      aria-label={t("table.openHistory")}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-muted
                 ring-1 ring-line shadow-sm transition hover:scale-105 hover:text-brand-dark hover:ring-brand"
    >
      <HistoryIcon className="h-4.5 w-4.5" />
    </button>
  );
}

/** Opens the anomaly's order in Dynamics NAV (at_navorderlink, a
 *  dynamicsnav:// deep link handled by the NAV client). No target="_blank":
 *  custom-protocol links would leave an about:blank tab behind — assigning
 *  location hands the URL to the OS handler while the page stays put. */
function NavLinkButton({ href }: { href: string | null }) {
  const { t } = useI18n();
  if (!href) return <span aria-hidden />;
  return (
    <a
      href={href}
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
