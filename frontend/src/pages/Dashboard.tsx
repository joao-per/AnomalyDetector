import { useMemo, useState } from "react";
import type { Anomaly } from "@/api/types";
import { useAnomalies } from "@/api/hooks";
import { ApiError } from "@/api/client";
import { useI18n } from "@/i18n/i18n";
import type { TranslationKey } from "@/i18n/translations";
import { PageShell } from "@/components/PageShell";
import { FilterBar, type FilterDef } from "@/components/FilterBar";
import {
  AnomalyTable,
  compareAnomalies,
  type SortKey,
  type SortState,
} from "@/components/AnomalyTable";
import { DetailPanel } from "@/components/DetailPanel";
import { StatCards, matchesCard, type CardKey } from "@/components/StatCards";

type FilterKey = "vendorName" | "anomalyType" | "articleCategory" | "criticalityClass";

const FILTER_DEFS: { key: FilterKey; labelKey: TranslationKey }[] = [
  { key: "vendorName", labelKey: "common.vendor" },
  { key: "anomalyType", labelKey: "common.type" },
  { key: "articleCategory", labelKey: "common.category" },
  { key: "criticalityClass", labelKey: "common.criticality" },
];

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

  const [card, setCard] = useState<CardKey>("total");
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    vendorName: "",
    anomalyType: "",
    articleCategory: "",
    criticalityClass: "",
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: "anomalieId", dir: "desc" });

  const filterDefs: FilterDef[] = FILTER_DEFS.map((d) => ({
    key: d.key,
    label: t(d.labelKey),
    value: filters[d.key],
    options: uniqueValues(anomalies, d.key),
  }));

  const visible = useMemo(() => {
    return anomalies
      .filter((a) => {
        if (!matchesCard(a, card)) return false;
        for (const d of FILTER_DEFS) {
          const want = filters[d.key];
          if (want && (a[d.key] ?? "").toString().trim() !== want) return false;
        }
        return true;
      })
      .sort((a, b) => compareAnomalies(a, b, sort));
  }, [anomalies, card, filters, sort]);

  const selected = useMemo(
    () => visible.find((a) => a.id === selectedId) ?? null,
    [visible, selectedId],
  );

  function onFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key as FilterKey]: value }));
  }
  function onClear() {
    setFilters({ vendorName: "", anomalyType: "", articleCategory: "", criticalityClass: "" });
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
        <StatCards anomalies={anomalies} active={card} onSelect={setCard} />

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
            loading={isLoading}
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
