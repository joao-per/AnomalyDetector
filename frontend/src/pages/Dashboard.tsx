import { useMemo } from "react";
import type { Anomaly } from "@/api/types";
import { STATUS } from "@/api/types";
import { useAnomalies } from "@/api/hooks";
import { useSessionState } from "@/lib/useSessionState";
import { ApiError } from "@/api/client";
import { useI18n } from "@/i18n/i18n";
import type { TranslationKey } from "@/i18n/translations";
import { PageShell } from "@/components/PageShell";
import { FilterBar, type FilterDef } from "@/components/FilterBar";
import {
  AnomalyTable,
  compareAnomalies,
  SORT_KEYS,
  type SortKey,
  type SortState,
} from "@/components/AnomalyTable";
import { DetailPanel } from "@/components/DetailPanel";
import { StatCards, matchesCard, CARD_KEYS, type CardKey } from "@/components/StatCards";

type FilterKey =
  | "vendorName"
  | "anomalyType"
  | "articleCategory"
  | "criticalityClass"
  | "owner"
  | "processReference"
  | "orderNumber";

const FILTER_DEFS: { key: FilterKey; labelKey: TranslationKey; type?: "text" }[] = [
  { key: "vendorName", labelKey: "common.vendor" },
  { key: "anomalyType", labelKey: "common.type" },
  { key: "articleCategory", labelKey: "common.category" },
  { key: "criticalityClass", labelKey: "common.criticality" },
  { key: "owner", labelKey: "common.owner" },
  { key: "processReference", labelKey: "common.processRef" },
  { key: "orderNumber", labelKey: "common.orderNumber", type: "text" },
];

const EMPTY_FILTERS: Record<FilterKey, string> = {
  vendorName: "",
  anomalyType: "",
  articleCategory: "",
  criticalityClass: "",
  owner: "",
  processReference: "",
  orderNumber: "",
};

// Friendlier labels for the raw Prozessbezug values stored in Dataverse
// (labels per ticket 2026-07-10, pending product-owner confirmation).
const PROCESS_REF_LABELS: Record<string, string> = {
  Bestellkopf: "Bestellung (Kopf)",
  Bestellposition: "Bestellung (Position)",
  Wareneingang: "Wareneingang",
  Rechnung: "Rechnung",
};

const DEFAULT_SORT: SortState = { key: "detectedAt", dir: "desc" };

function uniqueValues(rows: Anomaly[], key: FilterKey): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = r[key];
    if (typeof v === "string" && v.trim()) set.add(v.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b, "de"));
}

export function Dashboard() {
  const { t } = useI18n();
  const { data, isLoading, isFetching, error, refetch } = useAnomalies();
  const anomalies = useMemo(() => data ?? [], [data]);
  // The default list excludes cancelled server-side — that card needs its own query.
  const cancelledQ = useAnomalies(STATUS.CANCELLED);
  const cancelledAnomalies = useMemo(() => cancelledQ.data ?? [], [cancelledQ.data]);

  // Session-persisted so visiting /untrained (or any route) and coming back
  // keeps filters, card, sort and selection exactly as the user left them.
  const [storedCard, setCard] = useSessionState<CardKey>("dash.card", "total");
  // Older sessions may have persisted the removed "resolved" key.
  const card = CARD_KEYS.includes(storedCard) ? storedCard : "total";
  const [storedFilters, setFilters] = useSessionState<Record<FilterKey, string>>(
    "dash.filters",
    EMPTY_FILTERS,
  );
  // Older sessions may lack the newer filter keys — keep inputs controlled.
  const filters = useMemo(
    () => ({ ...EMPTY_FILTERS, ...storedFilters }),
    [storedFilters],
  );
  const [selectedId, setSelectedId] = useSessionState<string | null>("dash.selected", null);
  const [storedSort, setSort] = useSessionState<SortState>("dash.sort", DEFAULT_SORT);
  // Older sessions may have persisted a removed sort key (e.g. "createdOn").
  const sort = SORT_KEYS.includes(storedSort.key) ? storedSort : DEFAULT_SORT;

  const filterDefs: FilterDef[] = FILTER_DEFS.map((d) => ({
    key: d.key,
    label: t(d.labelKey),
    value: filters[d.key],
    type: d.type,
    options:
      d.type === "text"
        ? undefined
        : uniqueValues(anomalies, d.key).map((v) => ({
            value: v,
            label:
              d.key === "processReference" ? PROCESS_REF_LABELS[v] ?? v : v,
          })),
  }));

  // The cancelled card switches the table's data source — those rows are not
  // part of the default (open) list.
  const baseRows = card === "cancelled" ? cancelledAnomalies : anomalies;
  const visible = useMemo(() => {
    return baseRows
      .filter((a) => {
        if (!matchesCard(a, card)) return false;
        for (const d of FILTER_DEFS) {
          const want = (filters[d.key] ?? "").trim();
          if (!want) continue;
          const have = (a[d.key] ?? "").toString().trim();
          if (d.type === "text") {
            // Substring search (order numbers are often pasted partially).
            if (!have.toLowerCase().includes(want.toLowerCase())) return false;
          } else if (have !== want) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => compareAnomalies(a, b, sort));
  }, [baseRows, card, filters, sort]);

  const selected = useMemo(
    () => visible.find((a) => a.id === selectedId) ?? null,
    [visible, selectedId],
  );

  function onFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...EMPTY_FILTERS, ...prev, [key as FilterKey]: value }));
  }
  function onClear() {
    setFilters(EMPTY_FILTERS);
    setCard("total");
  }
  function onSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" },
    );
  }

  const errMessage = error
    ? error instanceof ApiError
      ? error.message
      : "Verbindungsfehler"
    : undefined;

  return (
    <PageShell>
      <main className="flex min-h-0 flex-1 gap-6 px-8 pb-8 pt-4">
        <StatCards
          anomalies={anomalies}
          cancelledAnomalies={cancelledAnomalies}
          active={card}
          onSelect={setCard}
        />

        <section className="flex min-h-0 flex-1 flex-col gap-5">
          <FilterBar
            filters={filterDefs}
            onChange={onFilterChange}
            onClear={onClear}
            onApply={() => refetch()}
            applying={isFetching}
          />
          <AnomalyTable
            anomalies={visible}
            selectedId={selectedId}
            onSelect={(a) => setSelectedId(a.id)}
            loading={card === "cancelled" ? cancelledQ.isLoading : isLoading}
            error={errMessage}
            sort={sort}
            onSort={onSort}
          />
        </section>

        <div className="w-[340px] shrink-0">
          <DetailPanel anomaly={selected} loading={isLoading && !!selectedId} />
        </div>
      </main>
    </PageShell>
  );
}
