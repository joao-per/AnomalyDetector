import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import logo from "@/assets/stiegl-logo.png";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { useMe } from "@/api/hooks";
import { useI18n } from "@/i18n/i18n";
import type { Lang } from "@/i18n/translations";
import { Ferrofluid } from "@/components/Ferrofluid";

// Module-level so the array identity is stable (Ferrofluid re-inits WebGL when
// its props change). Molten brand reds cooling into amber — beer meets metal.
const FLUID_COLORS = ["#f50d0d", "#ff5a2b", "#eda53a"];

/** Sign-in screen: ferrofluid shader backdrop + frosted-glass form. */
export function Login() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useMe();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Already signed in (e.g. back-button onto /login) → straight to the app.
  if (me.isSuccess) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const user = await authApi.login(email.trim(), password);
      qc.setQueryData(["me"], user);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError(t("login.invalid"));
      else if (err instanceof ApiError) setError(err.message);
      else setError(t("common.unknownError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Living backdrop — reacts to the pointer */}
      <div className="absolute inset-0">
        <Ferrofluid
          colors={FLUID_COLORS}
          speed={0.32}
          scale={1.5}
          turbulence={1}
          fluidity={0.12}
          rimWidth={0.22}
          sharpness={2.6}
          shimmer={1.4}
          glow={1.7}
          opacity={1}
          flowDirection="down"
          mouseRadius={0.3}
          mixBlendMode="multiply"
        />
      </div>
      {/* Soft vignette so the form area stays calm */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(200,200,200,0)_0%,rgba(180,180,180,0.15)_50%,rgba(150,150,150,0.3)_100%)]" />

      {/* Language switch */}
      <div className="absolute right-6 top-6 z-20 flex items-center rounded-full bg-black/5 p-1 ring-1 ring-black/10 backdrop-blur-md">
        {(["de", "en"] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={lang === l}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase transition ${
              lang === l ? "bg-brand text-white shadow-sm" : "text-black/40 hover:text-black"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <main className="relative z-10 grid min-h-screen place-items-center p-6">
        <form
          onSubmit={submit}
          className="w-full max-w-sm rounded-3xl bg-white/80 p-8 shadow-2xl ring-1 ring-black/10 backdrop-blur-xl"
        >
          <div className="mx-auto w-fit rounded-2xl bg-white px-4 py-2 shadow-lg">
            <img src={logo} alt="Stiegl" className="h-12 w-auto select-none" draggable={false} />
          </div>

          <h1 className="mt-5 text-center font-sans text-2xl font-bold text-gray-900">
            {t("login.title")}
          </h1>
          <p className="mt-1 text-center text-sm text-gray-500">{t("login.subtitle")}</p>

          <div className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gray-600">
                {t("login.email")}
              </span>
              <input
                type="email"
                required
                autoFocus
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@stiegl.at"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900
                           outline-none transition placeholder:text-gray-400 focus:border-brand focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-gray-600">
                {t("login.password")}
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900
                           outline-none transition placeholder:text-gray-400 focus:border-brand focus:bg-white"
              />
            </label>

            {error && (
              <div className="rounded-xl bg-brand/15 px-4 py-2.5 text-sm text-red-200 ring-1 ring-inset ring-brand/40">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 w-full rounded-xl bg-gradient-to-t from-brand-dark to-brand px-4 py-3 text-sm
                         font-semibold text-white shadow-lg shadow-brand/25 transition hover:brightness-110
                         active:scale-[0.99] disabled:opacity-60"
            >
              {pending ? t("login.submitting") : t("login.submit")}
            </button>
          </div>
        </form>
      </main>

      <p className="absolute inset-x-0 bottom-5 z-10 text-center text-xs text-gray-400">
        Stiegl · {t("login.title")}
      </p>
    </div>
  );
}
