import { useEffect, useState } from "react";
import type { Anomaly } from "@/api/types";
import { anomaliesApi } from "@/api/anomalies";
import { ApiError } from "@/api/client";
import { dash } from "@/lib/format";
import { useI18n } from "@/i18n/i18n";
import { SparklesIcon, XCircleIcon } from "./icons";

/** "Erklär mal" overlay: asks the AI flow to explain the anomaly's plot image
 *  and shows the returned Antwort. Fetches on open; Escape/backdrop closes. */
export function ExplainModal({
  anomaly,
  onClose,
}: {
  anomaly: Anomaly;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = answer === null && error === null;

  useEffect(() => {
    let cancelled = false;
    anomaliesApi
      .explain(anomaly.id)
      .then((res) => {
        if (cancelled) return;
        if (res.answer) setAnswer(res.answer);
        else setError(t("explain.empty"));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : t("common.unknownError"));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anomaly.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("explain.title")}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rise-in flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-brand-dark to-[#a01212] px-6 py-4 text-white">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15">
            <SparklesIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight">{t("explain.title")}</h2>
            <p className="truncate text-xs text-white/70">
              {dash(anomaly.anomalieId)} · {dash(anomaly.vendorName)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("history.close")}
            className="text-white/70 transition hover:text-white"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <SparklesIcon className="h-8 w-8 animate-pulse text-brand" />
              <span className="text-sm font-medium text-muted">{t("explain.loading")}</span>
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand/60"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
            </div>
          )}
          {error && (
            <p className="py-8 text-center text-sm text-brand-dark">{error}</p>
          )}
          {answer && (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
              {answer}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
