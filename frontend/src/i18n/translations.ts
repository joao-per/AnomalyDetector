// Bilingual strings (German / English). `de` is the source of truth; `en` is
// typed as Record<TranslationKey, string> so the compiler flags any missing key.
// Placeholders use {name} and are filled by the t() helper.

export type Lang = "de" | "en";

const de = {
  // ── Common / reused ──────────────────────────────────────────────
  "common.loading": "Lädt…",
  "common.sending": "Sendet…",
  "common.unknownError": "Unbekannter Fehler.",
  "common.emailDisabled": "E-Mail-Funktion ist noch nicht aktiviert (Phase 1).",
  "common.anomaly": "Anomalie",
  "common.anomalieId": "Anomalie-ID",
  "common.type": "Typ",
  "common.vendor": "Lieferant",
  "common.category": "Kategorie",
  "common.status": "Status",
  "common.besteller": "Besteller",
  "common.criticality": "Kritikalität",
  "common.order": "Bestellung",
  "common.article": "Artikel",
  "common.matchClass": "Match-Klasse",
  "common.createdAt": "Erstellt am",
  "common.detected": "Anomalie erkannt",
  "common.email": "E-Mail",
  "common.phone": "Telefon",
  "common.score": "Score",

  // ── Header ───────────────────────────────────────────────────────
  "header.notifications": "Benachrichtigungen",
  "header.account": "Konto",
  "header.home": "Zur Übersicht",
  "header.signOut": "Abmelden ({email})",

  // ── Section nav ──────────────────────────────────────────────────
  "nav.sections": "Bereiche",
  "nav.dashboard": "Übersicht",
  "nav.untrained": "Trainingsarchiv",

  // ── Status rail (filter cards) ───────────────────────────────────
  "statusRail.all": "Alle",
  "statusRail.new": "Neu",
  "statusRail.progress": "In Bearbeitung",
  "statusRail.cancelled": "Abgebrochen",

  // ── Filter bar ───────────────────────────────────────────────────
  "filter.reset": "Filter zurücksetzen",
  "filter.refresh": "Aktualisieren",

  // ── Table ────────────────────────────────────────────────────────
  "table.loading": "Anomalien werden geladen…",
  "table.error": "Fehler beim Laden: {error}",
  "table.empty": "Keine Anomalien gefunden.",
  "table.sortBy": "Nach „{label}“ sortieren",

  // ── Status badge ─────────────────────────────────────────────────
  "status.new": "Neu",
  "status.progress": "In Bearbeitung",
  "status.cancelled": "Abgebrochen",

  // ── Detail panel ─────────────────────────────────────────────────
  "detail.noneTitle": "Keine Anomalie ausgewählt",
  "detail.noneHint": "Wählen Sie links eine Anomalie, um Details und Aktionen zu sehen.",
  "detail.detected": "Anomalie erkannt — {type}",
  "detail.whatHappened": "Was ist passiert?",
  "detail.noDescription": "Für diese Anomalie liegt keine Beschreibung vor.",
  "detail.plotStandard": "Standard-Plot",
  "detail.plotEnhanced": "Erweiterter Plot",
  "detail.comment": "Kommentar",
  "detail.commentRequired": "(für Statuswechsel erforderlich)",
  "detail.commentPlaceholder": "Begründung / Notiz…",
  "detail.actionInProgress": "In Bearbeitung nehmen",
  "detail.actionCancel": "Abtrainieren",
  "detail.actionEmail": "E-Mail verfassen",
  "detail.actionReset": "Auf „Neu“ zurücksetzen",
  "detail.noticeInProgress": "Status: In Bearbeitung.",
  "detail.noticeCancelled": "Status: Abgebrochen.",
  "detail.noticeNew": "Status: Neu.",

  // ── Anomaly card (email page) ────────────────────────────────────
  "card.detailsTitle": "Details zur Anomalie",

  // ── Stat cards (dashboard) ───────────────────────────────────────
  "card.totalTitle": "Anomalien gesamt",
  "card.criticalTitle": "Kritisch",
  "card.progressTitle": "In Bearbeitung",
  "card.resolvedTitle": "Erledigt",
  "card.ofTotal": "{pct}% gesamt",
  "card.suppliersAffected": "{n} Lieferanten",

  // ── Training archive (untrained anomalies) ──────────────────────
  "untrained.title": "Trainingsarchiv",
  "untrained.subtitle":
    "Diese Anomalien wurden dem Modell abtrainiert — es meldet solche Muster nicht mehr. Mit „Neu trainieren“ fließen sie wieder ins Training ein.",
  "untrained.count": "{n} abtrainiert",
  "untrained.sortNewest": "Neueste zuerst",
  "untrained.sortOldest": "Älteste zuerst",
  "untrained.reason": "Warum abtrainiert?",
  "untrained.noReason": "Keine Begründung hinterlegt.",
  "untrained.untrainedOn": "Abtrainiert am {date}",
  "untrained.retrain": "Neu trainieren",
  "untrained.retraining": "Wird trainiert…",
  "untrained.retrained": "{id} ist zurück im Training.",
  "untrained.emptyTitle": "Nichts abtrainiert",
  "untrained.emptyHint":
    "Das Modell lernt derzeit aus jeder Anomalie. Abgebrochene Fälle erscheinen hier.",
  "untrained.error": "Fehler beim Laden: {error}",

  // ── Signature panel ──────────────────────────────────────────────
  "signature.title": "Signatur",
  "signature.placeholder": "Ihre Signatur…",
  "signature.back": "Zurück",
  "signature.clear": "Leeren",
  "signature.save": "Signatur speichern",
  "signature.saving": "Speichert…",
  "signature.hint": "Diese E-Mail wird mit Ihrer Signatur versehen und an den nächsten Unterzeichner gesendet.",
  "signature.manage": "Signaturen verwalten",
  "signature.sign": "E-Mail signieren",

  // ── Email composer ───────────────────────────────────────────────
  "email.titleVendor": "E-Mail an Lieferant",
  "email.titleInternal": "E-Mail (intern)",
  "email.generate": "KI-Antwort generieren",
  "email.generating": "Generiert…",
  "email.from": "Von:",
  "email.to": "An:",
  "email.subject": "Betreff:",
  "email.subjectPlaceholder": "Betreff",
  "email.toPlaceholder": "empfaenger@example.com",
  "email.notLoadable": "Anomalie nicht ladbar.",
  "email.send": "Senden",
  "email.subjectDefault": "Anomalie {id}",
  "email.noticeGenerated": "KI-Entwurf übernommen.",
  "email.noticeNoRecipient": "Empfänger-E-Mail fehlt.",
  "email.noticeSent": "E-Mail gesendet.",
  "email.noticeSignatureSaved": "Signatur gespeichert.",
  "email.disabledSend": "E-Mail-Versand ist noch nicht aktiviert (Phase 1).",
} as const;

export type TranslationKey = keyof typeof de;

const en: Record<TranslationKey, string> = {
  // ── Common / reused ──────────────────────────────────────────────
  "common.loading": "Loading…",
  "common.sending": "Sending…",
  "common.unknownError": "Unknown error.",
  "common.emailDisabled": "Email feature is not enabled yet (phase 1).",
  "common.anomaly": "Anomaly",
  "common.anomalieId": "Anomaly ID",
  "common.type": "Type",
  "common.vendor": "Supplier",
  "common.category": "Category",
  "common.status": "Status",
  "common.besteller": "Orderer",
  "common.criticality": "Criticality",
  "common.order": "Order",
  "common.article": "Article",
  "common.matchClass": "Match class",
  "common.createdAt": "Created on",
  "common.detected": "Anomaly detected",
  "common.email": "Email",
  "common.phone": "Phone",
  "common.score": "Score",

  // ── Header ───────────────────────────────────────────────────────
  "header.notifications": "Notifications",
  "header.account": "Account",
  "header.home": "Back to overview",
  "header.signOut": "Sign out ({email})",

  // ── Section nav ──────────────────────────────────────────────────
  "nav.sections": "Sections",
  "nav.dashboard": "Overview",
  "nav.untrained": "Training archive",

  // ── Status rail (filter cards) ───────────────────────────────────
  "statusRail.all": "All",
  "statusRail.new": "New",
  "statusRail.progress": "In progress",
  "statusRail.cancelled": "Cancelled",

  // ── Filter bar ───────────────────────────────────────────────────
  "filter.reset": "Reset filters",
  "filter.refresh": "Refresh",

  // ── Table ────────────────────────────────────────────────────────
  "table.loading": "Loading anomalies…",
  "table.error": "Error loading: {error}",
  "table.empty": "No anomalies found.",
  "table.sortBy": "Sort by “{label}”",

  // ── Status badge ─────────────────────────────────────────────────
  "status.new": "New",
  "status.progress": "In progress",
  "status.cancelled": "Cancelled",

  // ── Detail panel ─────────────────────────────────────────────────
  "detail.noneTitle": "No anomaly selected",
  "detail.noneHint": "Select an anomaly on the left to see details and actions.",
  "detail.detected": "Anomaly detected — {type}",
  "detail.whatHappened": "What happened?",
  "detail.noDescription": "No description available for this anomaly.",
  "detail.plotStandard": "Standard plot",
  "detail.plotEnhanced": "Enhanced plot",
  "detail.comment": "Comment",
  "detail.commentRequired": "(required to change status)",
  "detail.commentPlaceholder": "Reason / note…",
  "detail.actionInProgress": "Take in progress",
  "detail.actionCancel": "Untrain",
  "detail.actionEmail": "Compose email",
  "detail.actionReset": "Reset to “New”",
  "detail.noticeInProgress": "Status: In progress.",
  "detail.noticeCancelled": "Status: Cancelled.",
  "detail.noticeNew": "Status: New.",

  // ── Anomaly card (email page) ────────────────────────────────────
  "card.detailsTitle": "Anomaly details",

  // ── Stat cards (dashboard) ───────────────────────────────────────
  "card.totalTitle": "Total Anomalies",
  "card.criticalTitle": "Critical",
  "card.progressTitle": "In Progress",
  "card.resolvedTitle": "Resolved",
  "card.ofTotal": "{pct}% of total",
  "card.suppliersAffected": "{n} suppliers",

  // ── Training archive (untrained anomalies) ──────────────────────
  "untrained.title": "Training archive",
  "untrained.subtitle":
    "These anomalies were untrained from the model — it no longer flags such patterns. “Retrain” feeds them back into training.",
  "untrained.count": "{n} untrained",
  "untrained.sortNewest": "Newest first",
  "untrained.sortOldest": "Oldest first",
  "untrained.reason": "Why untrained?",
  "untrained.noReason": "No reason recorded.",
  "untrained.untrainedOn": "Untrained on {date}",
  "untrained.retrain": "Retrain",
  "untrained.retraining": "Retraining…",
  "untrained.retrained": "{id} is back in training.",
  "untrained.emptyTitle": "Nothing untrained",
  "untrained.emptyHint":
    "The model is currently learning from every anomaly. Cancelled cases show up here.",
  "untrained.error": "Error loading: {error}",

  // ── Signature panel ──────────────────────────────────────────────
  "signature.title": "Signature",
  "signature.placeholder": "Your signature…",
  "signature.back": "Back",
  "signature.clear": "Clear",
  "signature.save": "Save signature",
  "signature.saving": "Saving…",
  "signature.hint": "This email will be signed with your signature and sent to the next signee.",
  "signature.manage": "Manage signatures",
  "signature.sign": "Sign the email",

  // ── Email composer ───────────────────────────────────────────────
  "email.titleVendor": "Email to supplier",
  "email.titleInternal": "Email (internal)",
  "email.generate": "Generate AI reply",
  "email.generating": "Generating…",
  "email.from": "From:",
  "email.to": "To:",
  "email.subject": "Subject:",
  "email.subjectPlaceholder": "Subject",
  "email.toPlaceholder": "recipient@example.com",
  "email.notLoadable": "Could not load anomaly.",
  "email.send": "Send",
  "email.subjectDefault": "Anomaly {id}",
  "email.noticeGenerated": "AI draft applied.",
  "email.noticeNoRecipient": "Recipient email is missing.",
  "email.noticeSent": "Email sent.",
  "email.noticeSignatureSaved": "Signature saved.",
  "email.disabledSend": "Email sending is not enabled yet (phase 1).",
};

export const translations: Record<Lang, Record<TranslationKey, string>> = { de, en };
