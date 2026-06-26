import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/stiegl-logo.png";
import { useI18n } from "@/i18n/i18n";
import type { Lang } from "@/i18n/translations";
import { BellIcon, UserIcon } from "./icons";

export function AppHeader({ userEmail }: { userEmail: string }) {
  const { t } = useI18n();
  return (
    <header className="flex items-center justify-between px-8 pt-6">
      <Link to="/" aria-label={t("header.home")} className="rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <img
          src={logo}
          alt="Stiegl"
          className="h-16 w-auto drop-shadow-sm select-none"
          draggable={false}
        />
      </Link>

      <div className="flex items-center gap-3">
        <LangSwitch />
        <CircleButton label={t("header.notifications")}>
          <BellIcon className="h-5 w-5" />
          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-brand ring-2 ring-white" />
        </CircleButton>
        <CircleButton label={userEmail || t("header.account")}>
          <UserIcon className="h-5 w-5" />
        </CircleButton>
      </div>
    </header>
  );
}

function LangSwitch() {
  const { lang, setLang } = useI18n();
  const opts: Lang[] = ["de", "en"];
  return (
    <div className="flex items-center rounded-full bg-white/90 p-1 shadow-md">
      {opts.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase transition ${
            lang === l ? "bg-brand text-white shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function CircleButton({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="relative grid h-12 w-12 place-items-center rounded-full bg-white text-ink shadow-md
                 transition hover:shadow-lg hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {children}
    </button>
  );
}
