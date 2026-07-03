import { statusTone, type StatusTone } from "@/lib/format";
import { useI18n } from "@/i18n/i18n";
import type { TranslationKey } from "@/i18n/translations";

const TONE: Record<StatusTone, { pill: string; dot: string }> = {
  new: { pill: "bg-sky-50 text-sky-700 ring-sky-600/20", dot: "bg-sky-500" },
  progress: { pill: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  cancelled: { pill: "bg-rose-50 text-rose-700 ring-rose-600/20", dot: "bg-rose-500" },
  untrained: { pill: "bg-violet-50 text-violet-700 ring-violet-600/20", dot: "bg-violet-500" },
  done: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  unknown: { pill: "bg-slate-100 text-slate-600 ring-slate-500/20", dot: "bg-slate-400" },
};

const LABEL_KEY: Record<Exclude<StatusTone, "unknown">, TranslationKey> = {
  new: "status.new",
  progress: "status.progress",
  cancelled: "status.cancelled",
  untrained: "status.untrained",
  done: "status.done",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const { t } = useI18n();
  const tone = statusTone(status);
  const styles = TONE[tone];
  const label = tone === "unknown" ? status?.trim() || "—" : t(LABEL_KEY[tone]);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {label}
    </span>
  );
}
