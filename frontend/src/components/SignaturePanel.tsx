import { useI18n } from "@/i18n/i18n";
import { BackIcon, ClearFormatIcon } from "./icons";

interface SignaturePanelProps {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onRevert: () => void;
  onClear: () => void;
  saving?: boolean;
  dirty?: boolean;
}

/**
 * Signature card (Figma frame 55, right side). Pure signature management:
 * saving writes at_signatur on the UserDetails row keyed by the signed-in
 * email (at_userid) — it never triggers an email send. Sending happens only
 * via the composer's own send button, which appends the saved signature.
 */
export function SignaturePanel({
  value,
  onChange,
  onSave,
  onRevert,
  onClear,
  saving,
  dirty,
}: SignaturePanelProps) {
  const { t } = useI18n();
  return (
    <section className="flex w-[360px] shrink-0 flex-col gap-3 rounded-3xl bg-[#eee] p-5 shadow-xl">
      <h2 className="text-sm font-medium text-ink">{t("signature.title")}</h2>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("signature.placeholder")}
        rows={4}
        className="resize-none rounded-lg border border-line bg-[#e3e3e3]/60 px-3 py-2 text-lg
                   italic leading-snug text-ink outline-none [font-family:'Segoe_Script','Brush_Script_MT',cursive]
                   placeholder:not-italic placeholder:font-sans placeholder:text-base placeholder:text-muted
                   focus:border-brand focus:bg-white"
      />

      <div className="flex items-center gap-4 text-xs text-[#5a5a5a]">
        <button type="button" onClick={onRevert} className="flex items-center gap-1 hover:text-ink">
          <BackIcon className="h-3.5 w-3.5" /> {t("signature.back")}
        </button>
        <button type="button" onClick={onClear} className="flex items-center gap-1 hover:text-ink">
          <ClearFormatIcon className="h-3.5 w-3.5" /> {t("signature.clear")}
        </button>
      </div>

      <p className="border-t border-line pt-3 text-[11px] leading-snug text-[#a2a2a2]">
        {t("signature.hint")}
      </p>

      <div className="mt-auto flex justify-end pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !dirty}
          className="rounded-md bg-gradient-to-b from-brand-dark to-[#910d0d] px-4 py-2 text-xs
                     font-medium text-[#f7f7f7] shadow-sm transition hover:brightness-110 disabled:opacity-50"
        >
          {saving ? t("signature.saving") : t("signature.save")}
        </button>
      </div>
    </section>
  );
}
