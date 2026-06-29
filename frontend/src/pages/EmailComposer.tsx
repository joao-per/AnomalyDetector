import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { anomaliesApi } from "@/api/anomalies";
import { ApiError } from "@/api/client";
import { useAnomaly, useSetSignature, useSignature } from "@/api/hooks";
import { useI18n } from "@/i18n/i18n";
import type { TranslationKey } from "@/i18n/translations";
import { PageShell } from "@/components/PageShell";
import { AnomalyCard } from "@/components/AnomalyCard";
import { SignaturePanel } from "@/components/SignaturePanel";
import { ArrowLeftIcon, SparklesIcon, UserIcon } from "@/components/icons";
import { internalTemplate, vendorTemplate } from "@/lib/emailTemplate";

const USER_EMAIL = import.meta.env.VITE_USER_EMAIL ?? "";

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

function errMsg(e: unknown, t: TFn): string {
  if (e instanceof ApiError) {
    if (e.status === 501) return t("email.disabledSend");
    return e.message;
  }
  return t("common.unknownError");
}

export function EmailComposer() {
  const { t, lang } = useI18n();
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const internal = params.get("type") === "internal";

  const { data: anomaly, isLoading, error } = useAnomaly(id);
  const sigQuery = useSignature();
  const setSig = useSetSignature();

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sigValue, setSigValue] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  // Seed the form once the anomaly loads (or when switching anomaly / type / language).
  useEffect(() => {
    if (!anomaly) return;
    setTo((internal ? anomaly.bestellerEmail : anomaly.vendorEmail) ?? "");
    setSubject(t("email.subjectDefault", { id: anomaly.anomalieId ?? "" }).trim());
    setBody(internal ? internalTemplate(anomaly, lang) : vendorTemplate(anomaly, lang));
    setNotice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anomaly?.id, internal, lang]);

  // Seed the signature editor from the stored signature.
  const savedSig = sigQuery.data?.signature ?? "";
  useEffect(() => setSigValue(savedSig), [savedSig]);
  const sigDirty = sigValue !== savedSig;

  function fullBody(): string {
    const sig = (sigValue || savedSig).trim();
    return sig ? `${body}\n\n${sig}` : body;
  }

  async function generate() {
    if (!anomaly) return;
    setGenerating(true);
    setNotice(null);
    try {
      const res = await anomaliesApi.generateEmail(anomaly.id, internal);
      if (res.emailText) setBody(res.emailText);
      setNotice({ kind: "ok", text: t("email.noticeGenerated") });
    } catch (e) {
      setNotice({ kind: "err", text: errMsg(e, t) });
    } finally {
      setGenerating(false);
    }
  }

  async function send() {
    if (!anomaly) return;
    if (!to.trim()) {
      setNotice({ kind: "err", text: t("email.noticeNoRecipient") });
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      const fn = internal ? anomaliesApi.sendInternalEmail : anomaliesApi.sendVendorEmail;
      await fn(anomaly.id, fullBody(), to.trim());
      setNotice({ kind: "ok", text: t("email.noticeSent") });
    } catch (e) {
      setNotice({ kind: "err", text: errMsg(e, t) });
    } finally {
      setSending(false);
    }
  }

  function saveSig() {
    setSig.mutate(sigValue, {
      onSuccess: () => setNotice({ kind: "ok", text: t("email.noticeSignatureSaved") }),
      onError: (e) => setNotice({ kind: "err", text: errMsg(e, t) }),
    });
  }

  const title = internal ? t("email.titleInternal") : t("email.titleVendor");

  return (
    <PageShell>
      <main className="flex min-h-0 flex-1 items-stretch gap-6 px-8 pb-8 pt-4">
        <AnomalyCard anomaly={anomaly ?? null} />

        {/* Composer sheet */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-[#efefef] shadow-xl">
          <div className="flex items-center justify-between gap-4 px-7 pt-6">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="grid h-8 w-8 place-items-center rounded-full bg-white text-ink shadow transition hover:text-brand"
                aria-label={t("header.home")}
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </Link>
              <h1 className="bg-gradient-to-t from-brand-dark to-[#be0000] bg-clip-text text-xl font-bold text-transparent">
                {title}
              </h1>
            </div>
            <button
              type="button"
              onClick={generate}
              disabled={generating || !anomaly}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-t from-brand-dark to-[#e00000]
                         px-4 py-2 text-sm font-medium text-[#ebebeb] shadow-sm transition hover:brightness-110
                         disabled:opacity-60"
            >
              <SparklesIcon className="h-4 w-4" />
              {generating ? t("email.generating") : t("email.generate")}
            </button>
          </div>

          {/* Meta fields */}
          <div className="space-y-2.5 px-7 pt-5 text-sm">
            <FieldRow label={t("email.from")}>
              <Avatar />
              <span className="text-ink/80">{USER_EMAIL || "—"}</span>
            </FieldRow>
            <FieldRow label={t("email.to")} highlight>
              <Avatar />
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder={t("email.toPlaceholder")}
                className="w-full bg-transparent text-ink outline-none placeholder:text-muted"
              />
            </FieldRow>
            <FieldRow label={t("email.subject")}>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("email.subjectPlaceholder")}
                className="w-full bg-transparent text-ink outline-none placeholder:text-muted"
              />
            </FieldRow>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 px-7 pb-5 pt-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="scroll-slim h-full w-full resize-none rounded-2xl border border-line bg-white px-5 py-4
                         text-sm leading-relaxed text-ink outline-none focus:border-brand"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 border-t border-line bg-[#efefef] px-7 py-4">
            <div className="min-h-[1.25rem] text-sm">
              {error && <span className="text-brand-dark">{t("email.notLoadable")}</span>}
              {isLoading && <span className="text-muted">{t("common.loading")}</span>}
              {notice && (
                <span className={notice.kind === "ok" ? "text-emerald-600" : "text-brand-dark"}>
                  {notice.text}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={send}
              disabled={sending || !anomaly}
              className="rounded-lg bg-gradient-to-b from-brand-dark to-[#910d0d] px-6 py-2.5 text-sm
                         font-semibold text-[#f7f7f7] shadow transition hover:brightness-110 disabled:opacity-60"
            >
              {sending ? t("common.sending") : t("email.send")}
            </button>
          </div>
        </section>

        <SignaturePanel
          value={sigValue}
          onChange={setSigValue}
          onSave={saveSig}
          onRevert={() => setSigValue(savedSig)}
          onClear={() => setSigValue("")}
          onSign={send}
          saving={setSig.isPending}
          signing={sending}
          dirty={sigDirty}
        />
      </main>
    </PageShell>
  );
}

function FieldRow({
  label,
  highlight,
  children,
}: {
  label: string;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 font-medium text-ink">{label}</span>
      <div
        className={`flex flex-1 items-center gap-2 rounded-md px-3 py-1.5 ${
          highlight ? "bg-[#ebdede] shadow-sm" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-dark/10 text-brand-dark">
      <UserIcon className="h-3 w-3" />
    </span>
  );
}
