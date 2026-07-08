import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { Anomaly, FeaturePair } from "@/api/types";
import { STATUS } from "@/api/types";
import { ApiError } from "@/api/client";
import {
  useCancelAnomaly,
  useCloseAnomaly,
  useRetrainAnomaly,
  useUntrainAnomaly,
} from "@/api/hooks";
import { dash, formatDate } from "@/lib/format";
import { useI18n } from "@/i18n/i18n";
import type { TranslationKey } from "@/i18n/translations";
import { StatusBadge } from "./StatusBadge";
import { SupplierAvatar } from "./SupplierAvatar";
import { CriticalityMeter } from "./CriticalityMeter";
import {
  ChevronDownIcon,
  DangerTriangleIcon,
  EyeOffIcon,
  HashIcon,
  MailIcon,
  ProgressIcon,
  TagIcon,
  XCircleIcon,
} from "./icons";

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

function errMsg(e: unknown, t: TFn): string {
  if (e instanceof ApiError) {
    if (e.status === 501) return t("common.emailDisabled");
    return e.message;
  }
  return t("common.unknownError");
}

interface DetailPanelProps {
  anomaly: Anomaly | null;
  loading: boolean;
}

export function DetailPanel({ anomaly, loading }: DetailPanelProps) {
  const { t } = useI18n();
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const navigate = useNavigate();
  const close = useCloseAnomaly();
  const untrain = useUntrainAnomaly();
  const cancel = useCancelAnomaly();
  const retrain = useRetrainAnomaly();
  const busy =
    close.isPending || untrain.isPending || cancel.isPending || retrain.isPending;

  // "More content below" cue for the scrollable details area — on small
  // screens the lower cards would otherwise look silently cut off. `scrolled`
  // drives the pinned header's elevation shadow.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const updateScrollCue = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setMoreBelow(el.scrollTop + el.clientHeight < el.scrollHeight - 8);
    setScrolled(el.scrollTop > 4);
  }, []);
  useEffect(() => {
    window.addEventListener("resize", updateScrollCue);
    return () => window.removeEventListener("resize", updateScrollCue);
  }, [updateScrollCue]);

  // Reset transient UI when the selected anomaly changes.
  useEffect(() => {
    setComment("");
    setNotice(null);
    scrollRef.current?.scrollTo({ top: 0 });
    updateScrollCue();
  }, [anomaly?.id, updateScrollCue]);

  if (!anomaly && !loading) {
    return (
      <Panel>
        <div className="flex h-full flex-col items-center justify-center px-6 text-center text-white/80">
          <DangerTriangleIcon className="mb-4 h-10 w-10 text-white/50" />
          <p className="font-sans text-lg font-semibold text-white">
            {t("detail.noneTitle")}
          </p>
          <p className="mt-1 text-sm text-white/70">{t("detail.noneHint")}</p>
        </div>
      </Panel>
    );
  }

  if (loading || !anomaly) {
    return (
      <Panel>
        <div className="flex h-full items-center justify-center text-white/80">
          {t("common.loading")}
        </div>
      </Panel>
    );
  }

  const isNew = (anomaly.status ?? "").trim() === STATUS.NEW;
  const needComment = comment.trim().length === 0;

  function runClose() {
    setNotice(null);
    close.mutate(
      { guid: anomaly!.id, comment },
      {
        onSuccess: () => setNotice({ kind: "ok", text: t("detail.noticeInProgress") }),
        onError: (e) => setNotice({ kind: "err", text: errMsg(e, t) }),
      },
    );
  }
  function runUntrain() {
    setNotice(null);
    untrain.mutate(
      { guid: anomaly!.id, comment },
      {
        onSuccess: () => setNotice({ kind: "ok", text: t("detail.noticeUntrained") }),
        onError: (e) => setNotice({ kind: "err", text: errMsg(e, t) }),
      },
    );
  }
  function runCancel() {
    setNotice(null);
    cancel.mutate(
      { guid: anomaly!.id, comment },
      {
        onSuccess: () => setNotice({ kind: "ok", text: t("detail.noticeCancelled") }),
        onError: (e) => setNotice({ kind: "err", text: errMsg(e, t) }),
      },
    );
  }
  function runRetrain() {
    setNotice(null);
    retrain.mutate(
      { guid: anomaly!.id },
      {
        onSuccess: () => setNotice({ kind: "ok", text: t("detail.noticeNew") }),
        onError: (e) => setNotice({ kind: "err", text: errMsg(e, t) }),
      },
    );
  }

  return (
    <Panel>
      {/* Pinned identity header — stays put while the details scroll.
          Gains a shadow + blur once the content underneath starts moving. */}
      <div
        className={`relative z-10 flex items-center gap-3 border-b px-5 pb-3.5 pt-4 transition-all duration-300 ${
          scrolled
            ? "border-white/15 bg-black/20 shadow-[0_12px_24px_rgba(0,0,0,0.35)] backdrop-blur-md"
            : "border-white/10"
        }`}
      >
        <SupplierAvatar name={anomaly.vendorName} className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold leading-tight text-white">
            {dash(anomaly.anomalieId)}
          </div>
          <div className="truncate text-xs text-white/70">{dash(anomaly.vendorName)}</div>
        </div>
        <StatusBadge status={anomaly.status} />
      </div>

      {/* Scrollable details — comment + actions stay pinned below */}
      <div className="relative min-h-0 flex-1">
        <div
          key={anomaly.id /* remount on selection → entrance animation replays */}
          ref={scrollRef}
          onScroll={updateScrollCue}
          className="scroll-slim on-red flex h-full flex-col gap-4 overflow-y-auto px-5 py-4"
        >
        {/* Anomalous feature combinations (replaces the score gauge —
            client feedback 2026-07-05: the score is not useful here) */}
        <FeatureHighlights anomaly={anomaly} />

        {/* Criticality "on tap" meter */}
        <div className="rise-in" style={{ animationDelay: "120ms" }}>
          <CriticalityMeter anomaly={anomaly} />
        </div>

        {/* Alert badge */}
        <div
          className="rise-in flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-brand-dark shadow"
          style={{ animationDelay: "180ms" }}
        >
          <DangerTriangleIcon className="h-5 w-5 shrink-0 text-brand" />
          <span className="text-sm font-semibold">
            {t("detail.detected", { type: dash(anomaly.anomalyType) })}
          </span>
        </div>

        {/* Explanation card */}
        <div
          className="rise-in rounded-2xl bg-white/10 p-3.5 ring-1 ring-inset ring-white/15"
          style={{ animationDelay: "240ms" }}
        >
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
            {t("detail.whatHappened")}
          </h3>
          <p className="text-sm leading-relaxed text-white/90">
            {/* Business-readable description only — at_matchexplanation is too
                technical for the ops team (client feedback 2026-07-04). */}
            {anomaly.description1 || t("detail.noDescription")}
          </p>
        </div>

        {/* Plot buttons */}
        <div className="rise-in flex flex-col gap-2" style={{ animationDelay: "300ms" }}>
          <div className="flex gap-2">
            <PlotButton href={anomaly.plots.standard} variant="light">
              {t("detail.plotStandard")}
            </PlotButton>
            <PlotButton href={anomaly.plots.enhanced} variant="solid">
              {t("detail.plotEnhanced")}
            </PlotButton>
          </div>
          {/* Categorical-analysis plot — must be visible whenever categorical
              anomalies come up (client feedback 2026-07-06); emphasized then. */}
          {anomaly.plots.categorical && (
            <PlotButton
              href={anomaly.plots.categorical}
              variant={anomaly.categoricalFeatures.length > 0 ? "light" : "solid"}
            >
              {t("detail.plotCategorical")}
            </PlotButton>
          )}
        </div>

        {/* Details list */}
        <DetailsList anomaly={anomaly} />
        </div>

        {/* "More content below" fade cue */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t
                      from-black/45 to-transparent transition-opacity duration-300
                      ${moreBelow ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      {/* Pinned footer: comment + actions are always reachable */}
      <div className="space-y-3 border-t border-white/15 px-5 pb-5 pt-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
            {t("detail.comment")}{" "}
            {isNew && <span className="text-white/50">{t("detail.commentRequired")}</span>}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder={t("detail.commentPlaceholder")}
            className="w-full resize-none rounded-xl border border-white/20 bg-white/95 px-3 py-2 text-sm text-ink
                       outline-none placeholder:text-muted focus:border-white"
          />
        </div>

        {notice && (
          <div
            className={`rounded-xl px-3 py-2 text-sm ${
              notice.kind === "ok"
                ? "bg-white/90 text-ink"
                : "bg-black/25 text-white"
            }`}
          >
            {notice.text}
          </div>
        )}

        <ActionMenu
          isNew={isNew}
          busy={busy}
          needComment={needComment}
          onProgress={runClose}
          onUntrain={runUntrain}
          onCancel={runCancel}
          onRetrain={runRetrain}
          onEmail={() => navigate(`/anomalies/${anomaly.id}/email`)}
          onEmailInternal={() =>
            navigate(`/anomalies/${anomaly.id}/email?type=internal`)
          }
        />
      </div>
    </Panel>
  );
}

// ── Action dropdown ──────────────────────────────────────────────────────────
interface ActionDef {
  id: string;
  labelKey: TranslationKey;
  icon: ReactNode;
  chip: string; // icon-chip tint, mirrors the status-badge tones
  needsComment?: boolean;
  run: () => void;
}

function ActionMenu({
  isNew,
  busy,
  needComment,
  onProgress,
  onUntrain,
  onCancel,
  onRetrain,
  onEmail,
  onEmailInternal,
}: {
  isNew: boolean;
  busy: boolean;
  needComment: boolean;
  onProgress: () => void;
  onUntrain: () => void;
  onCancel: () => void;
  onRetrain: () => void;
  onEmail: () => void;
  onEmailInternal: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const actions: ActionDef[] = isNew
    ? [
        {
          id: "progress",
          labelKey: "detail.actionInProgress",
          icon: <ProgressIcon className="h-4 w-4" />,
          chip: "bg-amber-50 text-amber-600",
          needsComment: true,
          run: onProgress,
        },
        {
          id: "untrain",
          labelKey: "detail.actionUntrain",
          icon: <EyeOffIcon className="h-4 w-4" />,
          chip: "bg-violet-50 text-violet-600",
          needsComment: true,
          run: onUntrain,
        },
        {
          id: "cancel",
          labelKey: "detail.actionCancel",
          icon: <XCircleIcon className="h-4 w-4" />,
          chip: "bg-rose-50 text-rose-600",
          needsComment: true,
          run: onCancel,
        },
        {
          id: "email",
          labelKey: "detail.actionEmail",
          icon: <MailIcon className="h-4 w-4" />,
          chip: "bg-slate-100 text-slate-600",
          run: onEmail,
        },
        {
          id: "emailInternal",
          labelKey: "detail.actionEmailInternal",
          icon: <MailIcon className="h-4 w-4" />,
          chip: "bg-sky-50 text-sky-600",
          run: onEmailInternal,
        },
      ]
    : [
        {
          id: "retrain",
          labelKey: "detail.actionReset",
          icon: <ProgressIcon className="h-4 w-4" />,
          chip: "bg-emerald-50 text-emerald-600",
          run: onRetrain,
        },
        {
          id: "email",
          labelKey: "detail.actionEmail",
          icon: <MailIcon className="h-4 w-4" />,
          chip: "bg-slate-100 text-slate-600",
          run: onEmail,
        },
        {
          id: "emailInternal",
          labelKey: "detail.actionEmailInternal",
          icon: <MailIcon className="h-4 w-4" />,
          chip: "bg-sky-50 text-sky-600",
          run: onEmailInternal,
        },
      ];

  return (
    <div ref={rootRef} className="relative">
      {open && (
        <div
          role="menu"
          className="absolute inset-x-0 bottom-full z-20 mb-2 overflow-hidden rounded-2xl bg-white
                     shadow-[0px_14px_40px_rgba(0,0,0,0.35)] ring-1 ring-black/10"
        >
          <div className="divide-y divide-line/70">
            {actions.map((a) => {
              const disabled = busy || (a.needsComment && needComment);
              return (
                <button
                  key={a.id}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  onClick={() => {
                    setOpen(false);
                    a.run();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition
                             hover:bg-red-50/70 disabled:cursor-not-allowed disabled:opacity-45
                             disabled:hover:bg-transparent"
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${a.chip}`}>
                    {a.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {t(a.labelKey)}
                    </span>
                    {a.needsComment && needComment && (
                      <span className="block text-[11px] text-muted">
                        {t("detail.needsComment")}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-2.5 text-sm
                   font-semibold text-brand-dark shadow transition hover:bg-white/90
                   disabled:cursor-wait disabled:opacity-70"
      >
        {busy ? t("common.sending") : t("detail.actions")}
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform duration-200 ${open ? "" : "rotate-180"}`}
        />
      </button>
    </div>
  );
}

// ── Anomalous feature combinations ───────────────────────────────────────────
function formatFeatureValue(value: string | number, lang: string): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat(lang === "de" ? "de-AT" : "en-GB", {
      maximumFractionDigits: 2,
    }).format(value);
  }
  return value;
}

function FeatureHighlights({ anomaly }: { anomaly: Anomaly }) {
  const { t } = useI18n();
  const groups = [
    {
      key: "cat",
      titleKey: "detail.catFeatures" as TranslationKey,
      icon: <TagIcon className="h-3.5 w-3.5" />,
      tint: "bg-amber-400/25 text-amber-300",
      items: anomaly.categoricalFeatures,
      body: <CatChips items={anomaly.categoricalFeatures} />,
    },
    {
      key: "num",
      titleKey: "detail.numFeatures" as TranslationKey,
      icon: <HashIcon className="h-3.5 w-3.5" />,
      tint: "bg-sky-400/25 text-sky-300",
      items: anomaly.numericalFeatures,
      body: <NumStats items={anomaly.numericalFeatures} />,
    },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <>
      {groups.map((g, gi) => (
        <section
          key={g.key}
          className="rise-in rounded-2xl bg-white/10 p-3.5 ring-1 ring-inset ring-white/15"
          style={{ animationDelay: `${gi * 60}ms` }}
        >
          <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/70">
            <span className={`grid h-6 w-6 place-items-center rounded-lg ${g.tint}`}>
              {g.icon}
            </span>
            {t(g.titleKey)}
            <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white/80">
              {g.items.length}
            </span>
          </h3>
          {g.body}
        </section>
      ))}
    </>
  );
}

/** Categorical findings as chips. A raw value of "True" only means "this flag
 *  fired", so it renders as a localized "detected" badge instead. */
function CatChips({ items }: { items: FeaturePair[] }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((f) => {
        const label = f.name ?? t("detail.featureFallback", { n: f.index });
        const flag =
          typeof f.value === "string" && f.value.trim().toLowerCase() === "true";
        const value = flag ? t("detail.featureFlag") : String(f.value);
        return (
          <span
            key={f.index}
            title={`${label}: ${value}`}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/95 py-1 pl-2.5 pr-1.5 text-xs font-semibold text-ink shadow-sm"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <span className="truncate">{label}</span>
            <span className="shrink-0 rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-dark">
              {value}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** Numerical findings as compact stat rows: label left, big value right. */
function NumStats({ items }: { items: FeaturePair[] }) {
  const { t, lang } = useI18n();
  return (
    <div className="space-y-1.5">
      {items.map((f) => {
        const label = f.name ?? t("detail.featureFallback", { n: f.index });
        return (
          <div
            key={f.index}
            className="flex items-center justify-between gap-3 rounded-xl bg-white/95 px-3 py-2 shadow-sm"
          >
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted" title={label}>
              {label}
            </span>
            <span className="shrink-0 text-base font-bold leading-none tabular-nums text-brand-dark">
              {formatFeatureValue(f.value, lang)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-brand-dark to-brand-darker shadow-[0px_12px_30px_rgba(0,0,0,0.25),inset_0px_5px_22px_rgba(0,0,0,0.40)] ring-1 ring-black/10">
      {children}
    </aside>
  );
}

function DetailsList({ anomaly }: { anomaly: Anomaly }) {
  const { t } = useI18n();
  const rows: Array<[string, string]> = [
    [t("common.processRef"), dash(anomaly.processReference)],
    [t("common.order"), dash(anomaly.orderId)],
    [t("common.article"), dash(anomaly.articleName ?? anomaly.articleId)],
    [t("common.articleId"), dash(anomaly.articleId)],
    [t("common.category"), dash(anomaly.articleCategory)],
    [t("common.supplierId"), dash(anomaly.supplierId)],
    [t("common.matchClass"), dash(anomaly.matchClass)],
    [t("common.owner"), dash(anomaly.owner)],
    [t("common.createdAt"), formatDate(anomaly.createdOn)],
  ];
  return (
    // Spec-sheet grid: 2 columns of label-over-value cells with hairlines
    // (gap-px over a line-colored backdrop). shrink-0: overflow-hidden zeroes
    // this card's min flex size — without it the tight flex column squashes
    // the whole table to 0px height.
    <div className="shrink-0 overflow-hidden rounded-xl bg-white/95 shadow-sm">
      <div className="grid grid-cols-2 gap-px bg-line/80">
        {rows.map(([k, v], i) => (
          <div
            key={k}
            className="rise-in bg-white px-3 py-2"
            style={{ animationDelay: `${360 + i * 45}ms` }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {k}
            </div>
            <div className="truncate text-sm font-semibold text-ink" title={v}>
              {v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlotButton({
  href,
  variant,
  children,
}: {
  href: string | null;
  variant: "light" | "solid";
  children: ReactNode;
}) {
  const base =
    "flex-1 rounded-xl px-3 py-2 text-center text-sm font-semibold transition";
  if (!href) {
    return (
      <span className={`${base} cursor-not-allowed bg-white/30 text-white/60`}>
        {children}
      </span>
    );
  }
  const style =
    variant === "light"
      ? "bg-white text-brand-dark hover:bg-white/90"
      : "bg-black/25 text-white hover:bg-black/35";
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} ${style}`}>
      {children}
    </a>
  );
}

