import { Link, NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import logo from "@/assets/stiegl-logo.png";
import { authApi } from "@/api/auth";
import { entraEnabled, signOut } from "@/auth/entra";
import { useI18n } from "@/i18n/i18n";
import type { Lang, TranslationKey } from "@/i18n/translations";
import { UserIcon } from "./icons";

export function AppHeader({ userEmail }: { userEmail: string }) {
  const { t } = useI18n();
  return (
    <header className="relative flex items-center justify-between px-8 pt-6">
      <Link to="/" aria-label={t("header.home")} className="rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <img
          src={logo}
          alt="Stiegl"
          className="h-16 w-auto drop-shadow-sm select-none"
          draggable={false}
        />
      </Link>

      <SectionNav />

      <div className="flex items-center gap-3">
        <LangSwitch />
        <UserButton email={userEmail} />
      </div>
    </header>
  );
}

/** Center nav between the two working views: dashboard + training archive. */
function SectionNav() {
  const { t } = useI18n();
  const items: { to: string; end?: boolean; labelKey: TranslationKey }[] = [
    { to: "/", end: true, labelKey: "nav.dashboard" },
    { to: "/untrained", labelKey: "nav.untrained" },
  ];
  return (
    <nav
      aria-label={t("nav.sections")}
      className="absolute left-1/2 flex -translate-x-1/2 items-center rounded-full bg-white/90 p-1 shadow-md"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              isActive ? "bg-brand text-white shadow-sm" : "text-muted hover:text-ink"
            }`
          }
        >
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
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

/** Account chip — signs the user out (Django session or Entra SSO). */
function UserButton({ email }: { email: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const label = t("header.signOut", { email: email || t("header.account") });

  async function handleSignOut() {
    if (entraEnabled) {
      signOut();
      return;
    }
    try {
      await authApi.logout();
    } catch {
      // session already gone — proceed to the login screen anyway
    }
    qc.clear();
    navigate("/login", { replace: true });
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={handleSignOut}
      className="relative grid h-12 w-12 place-items-center rounded-full bg-white text-ink shadow-md
                 transition hover:shadow-lg hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {email ? (
        <span className="text-sm font-bold uppercase">{email[0]}</span>
      ) : (
        <UserIcon className="h-5 w-5" />
      )}
      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
    </button>
  );
}
