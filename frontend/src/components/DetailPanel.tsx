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
  MailIcon,
  ProgressIcon,
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
  // screens the lower cards would otherwise look silently cut off.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const updateScrollCue = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setMoreBelow(el.scrollTop + el.clientHeight < el.scrollHeight - 8);
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
      {/* Scrollable details — comment + actions stay pinned below */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={updateScrollCue}
          className="scroll-slim on-red flex h-full flex-col gap-4 overflow-y-auto px-5 py-5"
        >
        {/* Identity header — supplier logo + anomaly id + status */}
        <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 ring-1 ring-inset ring-white/15 backdrop-blur-sm">
          <SupplierAvatar name={anomaly.vendorName} className="h-11 w-11" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold leading-tight text-white">
              {dash(anomaly.anomalieId)}
            </div>
            <div className="truncate text-xs text-white/70">{dash(anomaly.vendorName)}</div>
          </div>
          <StatusBadge status={anomaly.status} />
        </div>

        {/* Anomalous feature combinations (replaces the score gauge —
            client feedback 2026-07-05: the score is not useful here) */}
        <FeatureHighlights anomaly={anomaly} />

        {/* Criticality "on tap" meter */}
        <CriticalityMeter anomaly={anomaly} />

        {/* Alert badge */}
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-brand-dark shadow">
          <DangerTriangleIcon className="h-5 w-5 shrink-0 text-brand" />
          <span className="text-sm font-semibold">
            {t("detail.detected", { type: dash(anomaly.anomalyType) })}
          </span>
        </div>

        {/* Explanation card */}
        <div className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-inset ring-white/15">
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
        <div className="flex flex-col gap-2">
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
  const { t, lang } = useI18n();
  const groups = [
    { key: "cat", titleKey: "detail.catFeatures" as TranslationKey, items: anomaly.categoricalFeatures },
    { key: "num", titleKey: "detail.numFeatures" as TranslationKey, items: anomaly.numericalFeatures },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div
          key={g.key}
          className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-inset ring-white/15"
        >
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/60">
            {t(g.titleKey)}
          </h3>
          <div className="space-y-1.5">
            {g.items.map((f: FeaturePair) => {
              const label = f.name ?? t("detail.featureFallback", { n: f.index });
              const value = formatFeatureValue(f.value, lang);
              return (
                <div
                  key={f.index}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white/95 px-3 py-1.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-muted" title={label}>
                    {label}
                  </span>
                  <span
                    className="max-w-[55%] truncate text-right font-semibold text-ink"
                    title={value}
                  >
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
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
    [t("common.category"), dash(anomaly.articleCategory)],
    [t("common.matchClass"), dash(anomaly.matchClass)],
    [t("common.createdAt"), formatDate(anomaly.createdOn)],
  ];
  return (
    <div className="overflow-hidden rounded-xl bg-white/95 text-sm">
      {rows.map(([k, v], i) => (
        <div
          key={k}
          className={`flex items-center justify-between gap-3 px-3 py-2 ${
            i % 2 ? "bg-surface" : "bg-white"
          }`}
        >
          <span className="text-muted">{k}</span>
          <span className="truncate text-right font-medium text-ink" title={v}>
            {v}
          </span>
        </div>
      ))}
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

