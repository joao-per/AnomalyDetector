import type { Anomaly } from "@/api/types";
import { criticalityFraction, dash } from "@/lib/format";
import { useI18n } from "@/i18n/i18n";

/**
 * "Criticality on tap" — a beer-fill meter. The amber level rises with the
 * anomaly's criticality and is topped with a white foam head, tying the brewery
 * concept to the panel's most important business signal. Lives on a red panel.
 */
export function CriticalityMeter({ anomaly }: { anomaly: Anomaly | null }) {
  const { t } = useI18n();
  const frac = criticalityFraction(anomaly?.criticalityClass, anomaly?.criticality);
  const pct = Math.max(8, Math.round(frac * 100));

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
          {t("common.criticality")}
        </span>
        <span className="text-xs font-bold text-white">{dash(anomaly?.criticalityClass)}</span>
      </div>

      <div className="relative h-4 w-full overflow-hidden rounded-full bg-black/30 ring-1 ring-inset ring-white/10">
        {/* beer fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#f7d07a] via-[#eda53a] to-[#df7a16]"
          style={{ width: `${pct}%` }}
        >
          {/* rising bubbles */}
          <span className="absolute left-2 top-1 h-1 w-1 rounded-full bg-white/45" />
          <span className="absolute left-[18px] bottom-1 h-[3px] w-[3px] rounded-full bg-white/30" />
          <span className="absolute left-7 top-1.5 h-[3px] w-[3px] rounded-full bg-white/25" />
        </div>
        {/* foam head at the leading edge */}
        <div
          className="absolute inset-y-0 w-2 rounded-full bg-white/85 blur-[0.5px]"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
}
