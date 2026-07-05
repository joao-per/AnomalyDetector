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
UNTRAINED_ENTITY_SET = "at_abtrainierteanomaliens"

# ── Anomaly Report (at_anomalyreport1) ───────────────────────────────────────
ANOMALY = {
    # identity / status
    "guid": "at_anomalyreport1id",          # GUID (display "Anomaly Report")
    "anomalie_id": "at_anomalyid",          # business id, e.g. "26_2470"
    "status": "at_anomalystatus",           # new / in Bearbeitung / abgebrochen
    "status_change_ts": "at_timestampstatuschange",
    # classification / scoring
    "anomaly_type": "at_anomalytype",
    "process_reference": "at_processreference",  # Rechnung / Wareneingang / Bestellkopf / Bestellposition
    "match_class": "at_matchclass",
    "match_explanation": "at_matchexplanation",
    "criticality": "at_criticality",        # int
    "criticality_class": "at_criticalityclass",
    "score": "at_scorenew",                 # decimal (also at_score int / at_anomalyscorefloat)
    # human-readable description
    "description1": "at_anomalydescription1",
    "description2": "at_anomalydescription2",
    "feature_json": "at_featurejson",
    # anomalous feature combinations (details panel, client mock 2026-07-05):
    # up to 3 categorical and 3 numerical name/value pairs. Note the numerical
    # VALUE columns use the cr062_ publisher prefix.
    "cat_feature1": "at_catfeature1",
    "cat_feature1_value": "at_catfeature1value",
    "cat_feature2": "at_catfeature2",
    "cat_feature2_value": "at_catfeature2value",
    "cat_feature3": "at_catfeature3",
    "cat_feature3_value": "at_catfeature3value",
    "num_feature1": "at_feature1",
    "num_feature1_value": "cr062_featurewert1",
    "num_feature2": "at_feature2",
    "num_feature2_value": "cr062_featurewert2",
    "num_feature3": "at_feature3",
    "num_feature3_value": "cr062_featurewert3",
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

# ── Untrained anomalies / ML training feedback (at_abtrainierteanomalien) ────
# Confirmed against live EntityDefinitions + sample rows (2026-07-02). The ML
# pipeline reads this table to suppress known-good patterns; "untrain" appends a
# record here, "retrain" removes it again. Note: rows written by the original
# flow carry the vendor NAME in at_lieferantennummer — we keep that convention.
UNTRAINED = {
    "guid": "at_abtrainierteanomalienid",
    "anomalie_id": "at_anomalieid",          # business id, e.g. "26_2470"
    "anomaly_type": "at_anomalietyp",
    "article_category": "at_artikelgruppe",
    "article_name": "at_artikelname",
    "article_id": "at_artikelnummer",
    "vendor_name": "at_lieferantenname",
    "vendor_number": "at_lieferantennummer",
    "process_ref": "at_prozessbezug",        # mirrors the anomaly's match class
    "reasoning": "at_reasoning",
    "created_at": "cr062_erstelldatum",
}

# ── Anomaly workflow status values (text, confirmed against live rows) ────────
STATUS_NEW = "new"
STATUS_IN_PROGRESS = "in Bearbeitung"
STATUS_CANCELLED = "abgebrochen"   # plain cancel — terminal, no ML side-effects
STATUS_UNTRAINED = "Abtrainiert"   # untrain — also feeds at_abtrainierteanomaliens
STATUS_DONE = "Abgeschlossen"      # closed/completed (set by existing flows)

# Which field receives the comment on a status change (direct-patch fallback).
COMMENT_FIELD = ANOMALY["comment_done"]
