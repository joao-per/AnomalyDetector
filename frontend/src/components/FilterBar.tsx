import { useI18n } from "@/i18n/i18n";
import { ChevronDownIcon } from "./icons";

export interface FilterOption {
  value: string;
  /** Display text — may differ from the stored value (e.g. Prozessbezug
   *  "Bestellkopf" shown as "Bestellung (Kopf)"). */
  label: string;
}

export interface FilterDef {
  key: string;
  label: string;
  value: string;
  /** "select" (default) = dropdown of options; "text" = free substring search. */
  type?: "select" | "text";
  options?: FilterOption[];
}

interface FilterBarProps {
  filters: FilterDef[];
  onChange: (key: string, value: string) => void;
  onClear: () => void;
  onApply: () => void;
  applying?: boolean;
}

export function FilterBar({
  filters,
  onChange,
  onClear,
  onApply,
  applying,
}: FilterBarProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-white/95 px-5 py-4 shadow-lg backdrop-blur">
      {filters.map((f) =>
        f.type === "text" ? (
          <TextFilter key={f.key} def={f} onChange={(v) => onChange(f.key, v)} />
        ) : (
          <Dropdown key={f.key} def={f} onChange={(v) => onChange(f.key, v)} />
        ),
      )}

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted transition hover:text-ink"
        >
          {t("filter.reset")}
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={applying}
          className="rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm
                     transition hover:bg-brand-bright disabled:opacity-60"
        >
          {applying ? t("common.loading") : t("filter.refresh")}
        </button>
      </div>
    </div>
  );
}

function Dropdown({
  def,
  onChange,
}: {
  def: FilterDef;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={def.value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-w-[150px] cursor-pointer appearance-none rounded-xl border border-line bg-white py-2.5 pl-4 pr-9 text-sm
                    shadow-sm outline-none transition focus:border-brand
                    ${def.value ? "text-ink" : "text-muted"}`}
      >
        <option value="">{def.label}</option>
        {(def.options ?? []).map((o) => (
          <option key={o.value} value={o.value} className="text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

function TextFilter({
  def,
  onChange,
}: {
  def: FilterDef;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="search"
      value={def.value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={def.label}
      aria-label={def.label}
      className="w-[150px] rounded-xl border border-line bg-white py-2.5 px-4 text-sm text-ink
                 shadow-sm outline-none transition placeholder:text-muted focus:border-brand"
    />
  );
}
