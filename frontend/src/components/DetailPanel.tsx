import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { Anomaly } from "@/api/types";
import { STATUS } from "@/api/types";
import { ApiError } from "@/api/client";
import {
  useCloseAnomaly,
  useRetrainAnomaly,
  useUntrainAnomaly,
} from "@/api/hooks";
import { dash, formatDate, permille, scoreFraction } from "@/lib/format";
import { useI18n } from "@/i18n/i18n";
import type { TranslationKey } from "@/i18n/translations";
import { ScoreGauge } from "./ScoreGauge";
import { StatusBadge } from "./StatusBadge";
import { SupplierAvatar } from "./SupplierAvatar";
import { CriticalityMeter } from "./CriticalityMeter";
import { DangerTriangleIcon } from "./icons";

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
  const retrain = useRetrainAnomaly();
  const busy = close.isPending || untrain.isPending || retrain.isPending;

  // Reset transient UI when the selected anomaly changes.
  useEffect(() => {
    setComment("");
    setNotice(null);
  }, [anomaly?.id]);

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
  const frac = scoreFraction(anomaly.score);
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
      <div className="scroll-slim on-red flex h-full flex-col gap-4 overflow-y-auto px-5 py-5">
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

        {/* Gauge */}
        <div className="flex flex-col items-center">
          <ScoreGauge
            fraction={frac}
            label={permille(frac)}
            caption={t("common.score")}
          />
        </div>

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
            {anomaly.matchExplanation ||
              anomaly.description1 ||
              t("detail.noDescription")}
          </p>
        </div>

        {/* Plot buttons */}
        <div className="flex gap-2">
          <PlotButton href={anomaly.plots.standard} variant="light">
            {t("detail.plotStandard")}
          </PlotButton>
          <PlotButton href={anomaly.plots.enhanced} variant="solid">
            {t("detail.plotEnhanced")}
          </PlotButton>
        </div>

        {/* Details list */}
        <DetailsList anomaly={anomaly} />

        {/* Comment */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
            {t("detail.comment")}{" "}
            {isNew && <span className="text-white/50">{t("detail.commentRequired")}</span>}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder={t("detail.commentPlaceholder")}
            className="w-full resize-none rounded-xl border border-white/20 bg-white/95 px-3 py-2 text-sm text-ink
                       outline-none placeholder:text-muted focus:border-white"
          />
        </div>

        {/* Notice */}
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

        {/* Actions */}
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {isNew ? (
            <>
              <ActionButton
                variant="solid"
                disabled={busy || needComment}
                onClick={runClose}
              >
                {t("detail.actionInProgress")}
              </ActionButton>
              <ActionButton
                variant="light"
                disabled={busy || needComment}
                onClick={runUntrain}
              >
                {t("detail.actionCancel")}
              </ActionButton>
              <ActionButton
                variant="ghost"
                disabled={busy}
                onClick={() => navigate(`/anomalies/${anomaly.id}/email`)}
              >
                {t("detail.actionEmail")}
              </ActionButton>
            </>
          ) : (
            <ActionButton variant="solid" disabled={busy} onClick={runRetrain}>
              {t("detail.actionReset")}
            </ActionButton>
          )}
        </div>
      </div>
    </Panel>
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

function ActionButton({
  variant,
  disabled,
  onClick,
  children,
}: {
  variant: "solid" | "light" | "ghost";
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const styles = {
    solid: "bg-white text-brand-dark hover:bg-white/90",
    light: "bg-black/25 text-white hover:bg-black/35",
    ghost: "border border-white/40 text-white hover:bg-white/10",
  }[variant];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition
                  disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}
