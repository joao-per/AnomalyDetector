import type { Anomaly } from "@/api/types";
import { dash, permille, scoreFraction } from "@/lib/format";
import { useI18n } from "@/i18n/i18n";
import { ScoreGauge } from "./ScoreGauge";
import { SupplierAvatar } from "./SupplierAvatar";
import { CriticalityMeter } from "./CriticalityMeter";
import { DangerTriangleIcon } from "./icons";

/**
 * Compact red anomaly summary card — the left rail of the email composer
 * (Figma frame 55). Shares the dashboard detail panel's visual language:
 * supplier-logo identity, score ring, and the "criticality on tap" meter.
 */
export function AnomalyCard({ anomaly }: { anomaly: Anomaly | null }) {
  const { t } = useI18n();
  const frac = scoreFraction(anomaly?.score);
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-4 rounded-2xl bg-gradient-to-b from-brand-dark to-brand-darker px-5 py-6 text-white shadow-xl ring-1 ring-black/10">
      {/* Identity */}
      <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-2.5 ring-1 ring-inset ring-white/15">
        <SupplierAvatar name={anomaly?.vendorName} className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold leading-tight">{dash(anomaly?.anomalieId)}</div>
          <div className="truncate text-xs text-white/70">{dash(anomaly?.vendorName)}</div>
        </div>
      </div>

      <div className="flex justify-center">
        <ScoreGauge fraction={frac} label={permille(frac)} caption={t("common.score")} size={124} stroke={13} />
      </div>

      <div className="flex w-full items-center gap-2 rounded-lg bg-[#ffa3a3] px-2.5 py-1.5 text-brand-dark">
        <DangerTriangleIcon className="h-4 w-4 shrink-0 text-brand" />
        <span className="text-xs font-semibold leading-tight">{t("common.detected")}</span>
      </div>

      <CriticalityMeter anomaly={anomaly} />

      <div className="w-full">
        <h2 className="mb-2 text-sm font-semibold text-[#ff7a7a]">{t("card.detailsTitle")}</h2>
        <dl className="space-y-1.5 text-xs leading-relaxed text-white/90">
          <Row label={t("common.processRef")} value={dash(anomaly?.processReference)} />
          <Row label={t("common.email")} value={dash(anomaly?.vendorEmail)} />
          <Row label={t("common.phone")} value={dash(anomaly?.vendorPhone)} />
          <Row label={t("common.order")} value={dash(anomaly?.orderId)} />
        </dl>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] uppercase tracking-wide text-white/50">{label}</dt>
      <dd className="truncate font-medium" title={value}>
        {value}
      </dd>
    </div>
  );
}
