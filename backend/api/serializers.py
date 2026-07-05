"""
Mapping between raw Dataverse records (publisher-prefixed logical names) and the
clean, frontend-friendly JSON the React app consumes. Plain functions because we
map dicts from the Web API, not Django models.
"""
from __future__ import annotations

from . import field_maps as fm


def _feature_pairs(record: dict, pairs: list[tuple[str, str]]) -> list[dict]:
    """Anomalous feature name/value combinations for the details panel.

    A pair is shown iff its VALUE is non-null (client rule 2026-07-05). Two
    data quirks: the ETL writes 0.0 into unused numeric value slots (no
    feature name) — that is filler, not a finding, so it is dropped; and some
    rows carry a value without a name — kept, the frontend labels them
    generically via `index`.
    """
    out: list[dict] = []
    for idx, (name_col, value_col) in enumerate(pairs, start=1):
        value = record.get(value_col)
        if value is None or (isinstance(value, str) and not value.strip()):
            continue
        name = record.get(name_col)
        if isinstance(name, str):
            name = name.strip() or None
        if name is None and isinstance(value, (int, float)) and value == 0:
            continue
        out.append({"index": idx, "name": name, "value": value})
    return out


def map_anomaly(record: dict) -> dict:
    """Dataverse anomaly record -> clean API shape (camelCase)."""
    a = fm.ANOMALY
    g = record.get
    return {
        "id": g(a["guid"]),
        "anomalieId": g(a["anomalie_id"]),
        "status": g(a["status"]),
        "statusChangedAt": g(a["status_change_ts"]),
        # classification / scoring
        "anomalyType": g(a["anomaly_type"]),
        "processReference": g(a["process_reference"]),
        "matchClass": g(a["match_class"]),
        "matchExplanation": g(a["match_explanation"]),
        "criticality": g(a["criticality"]),
        "criticalityClass": g(a["criticality_class"]),
        "score": g(a["score"]),
        # description
        "description1": g(a["description1"]),
        "description2": g(a["description2"]),
        "featureJson": g(a["feature_json"]),
        # anomalous feature combinations (nulls already filtered out)
        "categoricalFeatures": _feature_pairs(
            record,
            [
                (a["cat_feature1"], a["cat_feature1_value"]),
                (a["cat_feature2"], a["cat_feature2_value"]),
                (a["cat_feature3"], a["cat_feature3_value"]),
            ],
        ),
        "numericalFeatures": _feature_pairs(
            record,
            [
                (a["num_feature1"], a["num_feature1_value"]),
                (a["num_feature2"], a["num_feature2_value"]),
                (a["num_feature3"], a["num_feature3_value"]),
            ],
        ),
        # plots
        "plots": {
            "standard": g(a["plot_standard_url"]),
            "enhanced": g(a["plot_enhanced_url"]),
            "categorical": g(a["plot_categorical_url"]),
        },
        # parties
        "vendorName": g(a["vendor_name"]),
        "vendorEmail": g(a["vendor_email"]),
        "vendorPhone": g(a["vendor_phone"]),
        "supplierId": g(a["supplier_id"]),
        "bestellerEmail": g(a["besteller_email"]),
        "besteller": g(a["besteller"]),
        # order / article
        "orderId": g(a["order_id"]),
        "navOrderLink": g(a["nav_order_link"]),
        "articleId": g(a["article_id"]),
        "articleCategory": g(a["article_category"]),
        "articleName": g(a["article_name"]),
        # email drafts
        "draftVendorEmail": g(a["draft_vendor"]),
        "draftInternalEmail": g(a["draft_internal"]),
        # comments
        "commentDone": g(a["comment_done"]),
        "commentAcceptance": g(a["comment_acceptance"]),
        # system
        "createdOn": g(a["created_on"]),
        "modifiedOn": g(a["modified_on"]),
    }


def anomaly_select() -> list[str]:
    """The $select list for anomaly reads (only columns we map → small payloads)."""
    a = fm.ANOMALY
    keys = [
        "guid", "anomalie_id", "status", "status_change_ts",
        "anomaly_type", "process_reference", "match_class", "match_explanation",
        "criticality", "criticality_class", "score",
        "description1", "description2", "feature_json",
        "cat_feature1", "cat_feature1_value", "cat_feature2", "cat_feature2_value",
        "cat_feature3", "cat_feature3_value",
        "num_feature1", "num_feature1_value", "num_feature2", "num_feature2_value",
        "num_feature3", "num_feature3_value",
        "plot_standard_url", "plot_enhanced_url", "plot_categorical_url",
        "vendor_name", "vendor_email", "vendor_phone", "supplier_id",
        "besteller_email", "besteller",
        "order_id", "nav_order_link", "article_id", "article_category", "article_name",
        "draft_vendor", "draft_internal",
        "comment_done", "comment_acceptance",
        "created_on", "modified_on",
    ]
    return [a[k] for k in keys]


def map_supplier(record: dict) -> dict:
    s = fm.SUPPLIER
    g = record.get
    return {
        "id": g(s["guid"]),
        "name": g(s["name"]),
        "email": g(s["email"]),
        "phone": g(s["phone"]),
        "number": g(s["number"]),
        "classification": g(s["classification"]),
        "employeeEmail": g(s["employee_email"]),
        "buyerName": g(s["buyer_name"]),
    }


def map_userdetails(record: dict) -> dict:
    u = fm.USERDETAILS
    g = record.get
    return {
        "id": g(u["guid"]),
        "userId": g(u["user_id"]),
        "signature": g(u["signature"]),
        "username": g(u["username"]),
    }
