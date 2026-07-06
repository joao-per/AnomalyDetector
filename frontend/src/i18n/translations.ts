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
  "common.processRef": "Prozessbezug",
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

  // ── Login ────────────────────────────────────────────────────────
  "login.title": "Anomaliedetektor",
  "login.subtitle": "Melden Sie sich an, um Lieferanomalien zu prüfen.",
  "login.email": "E-Mail",
  "login.password": "Passwort",
  "login.submit": "Anmelden",
  "login.submitting": "Anmeldung…",
  "login.invalid": "E-Mail oder Passwort ist falsch.",

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
  "table.openNav": "Bestellung in Dynamics NAV öffnen",

  // ── Status badge ─────────────────────────────────────────────────
  "status.new": "Neu",
  "status.progress": "In Bearbeitung",
  "status.cancelled": "Abgebrochen",
  "status.untrained": "Abtrainiert",
  "status.done": "Abgeschlossen",

  // ── Detail panel ─────────────────────────────────────────────────
  "detail.noneTitle": "Keine Anomalie ausgewählt",
  "detail.noneHint": "Wählen Sie links eine Anomalie, um Details und Aktionen zu sehen.",
  "detail.detected": "Anomalie erkannt — {type}",
  "detail.whatHappened": "Was ist passiert?",
  "detail.noDescription": "Für diese Anomalie liegt keine Beschreibung vor.",
  "detail.catFeatures": "Kategorische Anomalien",
  "detail.numFeatures": "Numerische Anomalien",
  "detail.featureFallback": "Merkmal {n}",
  "detail.featureFlag": "erkannt",
  "detail.plotStandard": "Standard-Plot",
  "detail.plotEnhanced": "Erweiterter Plot",
  "detail.plotCategorical": "Kategorischer Plot",
  "detail.comment": "Kommentar",
  "detail.commentRequired": "(für Statuswechsel erforderlich)",
  "detail.commentPlaceholder": "Begründung / Notiz…",
  "detail.actions": "Aktionen",
  "detail.actionInProgress": "In Bearbeitung nehmen",
  "detail.actionUntrain": "Abtrainieren",
  "detail.actionCancel": "Abbrechen",
  "detail.actionEmail": "E-Mail an Lieferant",
  "detail.actionEmailInternal": "E-Mail an Besteller (intern)",
  "detail.actionReset": "Auf „Neu“ zurücksetzen",
  "detail.needsComment": "Kommentar erforderlich",
  "detail.noticeInProgress": "Status: In Bearbeitung.",
  "detail.noticeUntrained": "Status: Abtrainiert.",
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
    "Das Modell lernt derzeit aus jeder Anomalie. Abtrainierte Fälle erscheinen hier.",
  "untrained.error": "Fehler beim Laden: {error}",

  // ── Signature panel ──────────────────────────────────────────────
  "signature.title": "Signatur",
  "signature.placeholder": "Ihre Signatur…",
  "signature.back": "Zurück",
  "signature.clear": "Leeren",
  "signature.save": "Signatur speichern",
  "signature.saving": "Speichert…",
  "signature.hint":
    "Die Signatur wird in Ihrem Benutzerprofil gespeichert und beim Senden automatisch an die E-Mail angehängt. Das Speichern versendet keine E-Mail.",

  // ── Email composer ───────────────────────────────────────────────
  "email.titleVendor": "E-Mail an Lieferant",
  "email.titleInternal": "E-Mail (intern)",
  "email.modeVendor": "Lieferant",
  "email.modeInternal": "Intern",
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
  "email.noticeTemplate": "Vorlagen-Entwurf übernommen (KI-Flow derzeit nicht erreichbar).",
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
  "common.processRef": "Process reference",
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

  // ── Login ────────────────────────────────────────────────────────
  "login.title": "Anomaly Detector",
  "login.subtitle": "Sign in to review supply anomalies.",
  "login.email": "Email",
  "login.password": "Password",
  "login.submit": "Sign in",
  "login.submitting": "Signing in…",
  "login.invalid": "Wrong email or password.",

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
  "table.openNav": "Open order in Dynamics NAV",

  // ── Status badge ─────────────────────────────────────────────────
  "status.new": "New",
  "status.progress": "In progress",
  "status.cancelled": "Cancelled",
  "status.untrained": "Untrained",
  "status.done": "Completed",

  // ── Detail panel ─────────────────────────────────────────────────
  "detail.noneTitle": "No anomaly selected",
  "detail.noneHint": "Select an anomaly on the left to see details and actions.",
  "detail.detected": "Anomaly detected — {type}",
  "detail.whatHappened": "What happened?",
  "detail.noDescription": "No description available for this anomaly.",
  "detail.catFeatures": "Categorical anomalies",
  "detail.numFeatures": "Numerical anomalies",
  "detail.featureFallback": "Feature {n}",
  "detail.featureFlag": "detected",
  "detail.plotStandard": "Standard plot",
  "detail.plotEnhanced": "Enhanced plot",
  "detail.plotCategorical": "Categorical plot",
  "detail.comment": "Comment",
  "detail.commentRequired": "(required to change status)",
  "detail.commentPlaceholder": "Reason / note…",
  "detail.actions": "Actions",
  "detail.actionInProgress": "Take in progress",
  "detail.actionUntrain": "Untrain",
  "detail.actionCancel": "Cancel",
  "detail.actionEmail": "Email to supplier",
  "detail.actionEmailInternal": "Email to orderer (internal)",
  "detail.actionReset": "Reset to “New”",
  "detail.needsComment": "Comment required",
  "detail.noticeInProgress": "Status: In progress.",
  "detail.noticeUntrained": "Status: Untrained.",
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
    "The model is currently learning from every anomaly. Untrained cases show up here.",
  "untrained.error": "Error loading: {error}",

  // ── Signature panel ──────────────────────────────────────────────
  "signature.title": "Signature",
  "signature.placeholder": "Your signature…",
  "signature.back": "Back",
  "signature.clear": "Clear",
  "signature.save": "Save signature",
  "signature.saving": "Saving…",
  "signature.hint":
    "Your signature is stored in your user profile and appended automatically when an email is sent. Saving never sends an email.",

  // ── Email composer ───────────────────────────────────────────────
  "email.titleVendor": "Email to supplier",
  "email.titleInternal": "Email (internal)",
  "email.modeVendor": "Supplier",
  "email.modeInternal": "Internal",
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
  "email.noticeTemplate": "Template draft applied (AI flow currently unavailable).",
  "email.noticeNoRecipient": "Recipient email is missing.",
  "email.noticeSent": "Email sent.",
  "email.noticeSignatureSaved": "Signature saved.",
  "email.disabledSend": "Email sending is not enabled yet (phase 1).",
};

export const translations: Record<Lang, Record<TranslationKey, string>> = { de, en };
