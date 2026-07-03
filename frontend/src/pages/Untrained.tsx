import { useMemo, useState } from "react";
import type { Anomaly } from "@/api/types";
import { STATUS } from "@/api/types";
import { useAnomalies, useRetrainAnomaly } from "@/api/hooks";
import { ApiError } from "@/api/client";
import { useI18n } from "@/i18n/i18n";
import { dash, formatDate, isHighCriticality } from "@/lib/format";
import { PageShell } from "@/components/PageShell";
import { SupplierAvatar } from "@/components/SupplierAvatar";
import { CheckCircleIcon, ChevronDownIcon, ProgressIcon } from "@/components/icons";

type SortDir = "desc" | "asc";

/** Group anomalies by calendar day of creation, preserving the sort order. */
function groupByDay(rows: Anomaly[], locale: string) {
  const groups: { key: string; label: string; items: Anomaly[] }[] = [];
  for (const a of rows) {
    const d = a.createdOn ? new Date(a.createdOn) : null;
    const valid = d && !Number.isNaN(d.getTime());
    const key = valid ? d!.toISOString().slice(0, 10) : "unknown";
    const label = valid
      ? d!.toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" })
      : "—";
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(a);
    else groups.push({ key, label, items: [a] });
  }
  return groups;
}

/**
 * Training archive — the model's ledger of everything it was told to forget.
 * Untrained (abgebrochen) anomalies hang on an amber "tap line", grouped by
 * creation date; retraining drains an entry out of the archive.
 */
export function Untrained() {
  const { t, lang } = useI18n();
  const locale = lang === "de" ? "de-AT" : "en-GB";

  const { data, isLoading, error } = useAnomalies(STATUS.UNTRAINED);
  const retrain = useRetrainAnomaly();

  const [dir, setDir] = useState<SortDir>("desc");
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const sorted = useMemo(() => {
    const rows = [...(data ?? [])];
    rows.sort((a, b) => {
      const ta = a.createdOn ? Date.parse(a.createdOn) : 0;
      const tb = b.createdOn ? Date.parse(b.createdOn) : 0;
      return dir === "desc" ? tb - ta : ta - tb;
    });
    return rows;
  }, [data, dir]);

  const groups = useMemo(() => groupByDay(sorted, locale), [sorted, locale]);

  function onRetrain(a: Anomaly) {
    setNotice(null);
    retrain.mutate(
      { guid: a.id },
      {
        onSuccess: () => {
          setLeaving((prev) => new Set(prev).add(a.id));
          setNotice({
            kind: "ok",
            text: t("untrained.retrained", { id: a.anomalieId ?? "" }),
          });
        },
        onError: (e) =>
          setNotice({
            kind: "err",
            text: e instanceof ApiError ? e.message : t("common.unknownError"),
          }),
      },
    );
  }

  return (
    <PageShell>
      <main className="flex min-h-0 flex-1 flex-col px-8 pb-8 pt-4">
        {/* Page header — on a white card so it stays readable over the backdrop */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white/95 px-6 py-4 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
          <div className="max-w-2xl">
            <h1 className="bg-gradient-to-t from-brand-dark to-[#be0000] bg-clip-text text-2xl font-bold text-transparent">
              {t("untrained.title")}
            </h1>
            <p className="mt-1 text-sm text-ink/70">{t("untrained.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            {sorted.length > 0 && (
              <span className="rounded-full bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-brand-dark ring-1 ring-brand/15">
                {t("untrained.count", { n: sorted.length })}
              </span>
            )}
            <button
              type="button"
              onClick={() => setDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-xs
                         font-semibold text-ink ring-1 ring-black/5 transition hover:text-brand"
            >
              <ChevronDownIcon
                className={`h-3.5 w-3.5 transition-transform duration-300 ${
                  dir === "asc" ? "rotate-180" : ""
                }`}
              />
              {dir === "desc" ? t("untrained.sortNewest") : t("untrained.sortOldest")}
            </button>
          </div>
        </div>

        <div className="mt-2 min-h-[1.75rem] text-sm">
          {notice && (
            <span
              className={`inline-block rounded-full bg-white/95 px-3.5 py-1 shadow-md ${
                notice.kind === "ok" ? "text-emerald-600" : "text-brand-dark"
              }`}
            >
              {notice.text}
            </span>
          )}
        </div>

        {/* Tap line + entries */}
        <div className="scroll-slim mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading && <SkeletonRail />}

          {error && !isLoading && (
            <p className="mt-6 text-sm text-brand-dark">
              {t("untrained.error", {
                error: error instanceof ApiError ? error.message : t("common.unknownError"),
              })}
            </p>
          )}

          {!isLoading && !error && sorted.length === 0 && <EmptyArchive />}

          {!isLoading && !error && sorted.length > 0 && (
            <div className="relative pb-6 pl-9">
              {/* the tap line */}
              <span
                aria-hidden
                className="absolute bottom-0 left-[13px] top-2 w-[3px] rounded-full
                           bg-gradient-to-b from-amber-300/90 via-amber-400/50 to-transparent"
              />
              {groups.map((g) => (
                <section key={g.key} className="mb-2">
                  <h2 className="relative mb-3 mt-4 flex items-center gap-3">
                    <span
                      aria-hidden
                      className="absolute -left-[34px] grid h-5 w-5 place-items-center rounded-full
                                 bg-amber-100 ring-4 ring-amber-300/40"
                    >
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                    </span>
                    <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-ink shadow-sm backdrop-blur-sm">
                      {g.label}
                      <span className="ml-1.5 text-muted">({g.items.length})</span>
                    </span>
                  </h2>
                  <ul className="space-y-3">
                    {g.items.map((a) => (
                      <ArchiveEntry
                        key={a.id}
                        anomaly={a}
                        leaving={leaving.has(a.id)}
                        pending={retrain.isPending && retrain.variables?.guid === a.id}
                        onRetrain={() => onRetrain(a)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </PageShell>
  );
}

function ArchiveEntry({
  anomaly: a,
  leaving,
  pending,
  onRetrain,
}: {
  anomaly: Anomaly;
  leaving: boolean;
  pending: boolean;
  onRetrain: () => void;
}) {
  const { t } = useI18n();
  const high = isHighCriticality(a.criticalityClass);
  return (
    <li
      className={`flex items-stretch gap-5 rounded-3xl bg-white p-5 shadow-lg ring-1 ring-black/5
                  transition-all duration-500 ${
                    leaving
                      ? "translate-x-8 scale-[0.98] opacity-0"
                      : "hover:-translate-y-0.5 hover:shadow-xl"
                  }`}
    >
      {/* Identity */}
      <div className="flex w-72 shrink-0 items-start gap-3">
        <SupplierAvatar name={a.vendorName} className="h-11 w-11" />
        <div className="min-w-0">
          <div className="truncate text-base font-bold text-ink">{dash(a.anomalieId)}</div>
          <div className="truncate text-xs text-muted">{dash(a.vendorName)}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {a.anomalyType && <Chip>{a.anomalyType}</Chip>}
            {(a.articleName || a.articleId) && <Chip>{a.articleName ?? a.articleId}</Chip>}
            <Chip tone={high ? "danger" : "neutral"}>{dash(a.criticalityClass)}</Chip>
          </div>
        </div>
      </div>

      {/* The human's reasoning — the heart of the ledger entry */}
      <div className="min-w-0 flex-1 border-l-[3px] border-amber-300/80 pl-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">
          {t("untrained.reason")}
        </div>
        <p className="mt-1 line-clamp-3 font-body text-sm italic leading-relaxed text-ink/80">
          {a.commentDone?.trim() || t("untrained.noReason")}
        </p>
      </div>

      {/* Action */}
      <div className="flex w-44 shrink-0 flex-col items-end justify-between gap-3">
        <button
          type="button"
          onClick={onRetrain}
          disabled={pending || leaving}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-t from-brand-dark
                     to-[#e00000] px-4 py-2 text-sm font-semibold text-white shadow-sm transition
                     hover:brightness-110 disabled:opacity-60"
        >
          <ProgressIcon
            className={`h-4 w-4 ${
              pending ? "animate-spin" : "transition-transform duration-500 group-hover:rotate-180"
            }`}
          />
          {pending ? t("untrained.retraining") : t("untrained.retrain")}
        </button>
        <span className="text-right text-[11px] text-muted">
          {t("untrained.untrainedOn", { date: formatDate(a.statusChangedAt ?? a.modifiedOn) })}
        </span>
      </div>
    </li>
  );
}

function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "danger";
}) {
  return (
    <span
      className={`inline-flex max-w-56 items-center truncate rounded-full px-2 py-0.5 text-[11px] font-medium ${
        tone === "danger" ? "bg-red-50 text-brand-dark ring-1 ring-brand/20" : "bg-surface text-ink/70"
      }`}
    >
      {children}
    </span>
  );
}

function EmptyArchive() {
  const { t } = useI18n();
  return (
    <div className="mx-auto mt-14 flex max-w-md flex-col items-center rounded-3xl bg-white/90 p-10 text-center shadow-lg backdrop-blur-sm">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-500 ring-4 ring-amber-300/40">
        <CheckCircleIcon className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-ink">{t("untrained.emptyTitle")}</h2>
      <p className="mt-1.5 text-sm text-muted">{t("untrained.emptyHint")}</p>
    </div>
  );
}

function SkeletonRail() {
  return (
    <div className="relative mt-4 space-y-3 pl-9">
      <span
        aria-hidden
        className="absolute bottom-0 left-[13px] top-2 w-[3px] rounded-full bg-amber-200/60"
      />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/60 shadow-sm" />
      ))}
    </div>
  );
}
