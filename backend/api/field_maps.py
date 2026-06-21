"""
Central Dataverse schema mapping — CONFIRMED against the live environment
(2026-06-28 via EntityDefinitions metadata + sample rows).

If the Dataverse schema changes, this is the only file that needs editing.

Note on names:
- The anomaly table's PRIMARY KEY (GUID) column `at_anomalyreport1id` has the
  display name "Anomaly Report". In the canvas app `SelectedAnomaly.'Anomaly Report'`
  therefore means the record GUID — that is what the flows receive to identify a record.
- The email-draft columns use a different publisher prefix: `cr062_…`.
- The supplier entity SET is `at_supplierinformations` (plural).
"""

# ── Entity sets (plural collection names in the Web API path) ────────────────
ANOMALY_ENTITY_SET = "at_anomalyreport1s"
SUPPLIER_ENTITY_SET = "at_supplierinformations"
USERDETAILS_ENTITY_SET = "at_userdetailses"

# ── Anomaly Report (at_anomalyreport1) ───────────────────────────────────────
ANOMALY = {
    # identity / status
    "guid": "at_anomalyreport1id",          # GUID (display "Anomaly Report")
    "anomalie_id": "at_anomalyid",          # business id, e.g. "26_2470"
    "status": "at_anomalystatus",           # new / in Bearbeitung / abgebrochen
    "status_change_ts": "at_timestampstatuschange",
    # classification / scoring
    "anomaly_type": "at_anomalytype",
    "match_class": "at_matchclass",
    "match_explanation": "at_matchexplanation",
    "criticality": "at_criticality",        # int
    "criticality_class": "at_criticalityclass",
    "score": "at_scorenew",                 # decimal (also at_score int / at_anomalyscorefloat)
    # human-readable description
    "description1": "at_anomalydescription1",
    "description2": "at_anomalydescription2",
    "feature_json": "at_featurejson",
    # plots (Blob URLs, with SAS already appended)
    "plot_standard_url": "at_plotdescription",
    "plot_enhanced_url": "at_plot_html_enhanced",
    "plot_categorical_url": "at_cat_plot_url",
    # parties
    "vendor_name": "at_lieferantenname",
    "vendor_email": "at_lieferantenemail",
    "vendor_phone": "at_lieferantentelefonnummer",
    "supplier_id": "at_supplierid",
    "besteller_email": "at_bestelleremail",
    "besteller": "cr062_besteller",
    # order / article
    "order_id": "at_orderid",
    "nav_order_link": "at_navorderlink",
    "article_id": "at_artikelid",
    "article_category": "at_artikelkategorie",
    "article_name": "cr062_artikelname",
    # email drafts (note cr062_ prefix)
    "draft_vendor": "cr062_emailvorschlaglieferant",
    "draft_internal": "cr062_emailvorschlagintern",
    # comments captured on status changes
    "comment_done": "at_erledigtkommentar",
    "comment_acceptance": "at_kommentarakzeptanzmultiline",
    "change_history": "at_changehistory",
    # system
    "created_on": "createdon",
    "modified_on": "modifiedon",
}

# ── User Details (at_userdetails) ────────────────────────────────────────────
USERDETAILS = {
    "guid": "at_userdetailsid",
    "user_id": "at_userid",       # == User().Email
    "signature": "at_signatur",
    "username": "at_username",
}

# ── Supplier Information (at_supplierinformations) ───────────────────────────
SUPPLIER = {
    "guid": "at_supplierinformationid",
    "name": "at_lieferantenname",
    "email": "at_lieferantenemail",
    "phone": "at_lieferantentelefonnummer",
    "number": "at_suppliernumber",
    "classification": "at_classification",     # ABC
    "employee_email": "at_employeeemail",
    "buyer_name": "cr062_einkaufername",
}

# ── Anomaly workflow status values (text, confirmed: sample row = "new") ──────
STATUS_NEW = "new"
STATUS_IN_PROGRESS = "in Bearbeitung"
STATUS_CANCELLED = "abgebrochen"

# Which field receives the comment on a status change (direct-patch fallback).
COMMENT_FIELD = ANOMALY["comment_done"]
