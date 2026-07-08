import { useEffect } from "react";
import type { Anomaly } from "@/api/types";
import { dash } from "@/lib/format";
import { useI18n } from "@/i18n/i18n";
import { HistoryIcon, XCircleIcon } from "./icons";

/** One parsed change-history entry: "<timestamp> - <event text>". */
interface HistoryEntry {
  when: string | null;
  text: string;
}

/** at_changehistory is a plain multiline log, newest first. Legacy rows mix
 *  real newlines with literal "\n" sequences and two timestamp formats
 *  (ISO 8601 and German dd.MM.yyyy HH:mm). Lines without a timestamp prefix
 *  are continuations of the previous entry (e.g. a full logged email body),
 *  not entries of their own. German dates are shown verbatim — Date.parse
 *  would misread dd.MM as the US MM/dd. */
const ENTRY_RE = /^(\d{4}-\d{2}-\d{2}T\S+|\d{2}\.\d{2}\.\d{4}(?:,?\s\d{2}:\d{2})?)\s*-\s*(.*)$/;

function formatWhen(tokenRaw: string): string {
  if (/^\d{4}-\d{2}-\d{2}T/.test(tokenRaw)) {
    const ms = Date.parse(tokenRaw);
    if (!Number.isNaN(ms)) {
      return new Date(ms).toLocaleString("de-AT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  return tokenRaw;
}

function parseHistory(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  const entries: HistoryEntry[] = [];
  for (const line of raw.split(/\r?\n|\\n/)) {
    const text = line.trim();
    if (!text) continue;
    const m = text.match(ENTRY_RE);
    if (m) {
      entries.push({ when: formatWhen(m[1]), text: m[2] });
    } else if (entries.length > 0) {
      entries[entries.length - 1].text += `\n${text}`;
    } else {
      entries.push({ when: null, text });
    }
  }
  return entries;
}

export function HistoryModal({
  anomaly,
  onClose,
}: {
  anomaly: Anomaly;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const entries = parseHistory(anomaly.changeHistory);

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
      aria-label={t("history.title")}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rise-in flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-brand-dark to-[#a01212] px-6 py-4 text-white">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15">
            <HistoryIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight">{t("history.title")}</h2>
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

        {/* Timeline */}
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">{t("history.empty")}</p>
          ) : (
            <ol className="relative space-y-4 border-l-2 border-line pl-5">
              {entries.map((e, i) => (
                <li key={i} className="rise-in relative" style={{ animationDelay: `${i * 50}ms` }}>
                  <span
                    className={`absolute -left-[25px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${
                      i === 0 ? "bg-brand" : "bg-line"
                    }`}
                  />
                  {e.when && (
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {e.when}
                    </div>
                  )}
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                    {e.text}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
