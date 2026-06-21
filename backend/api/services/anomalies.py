"""
Business logic for the anomaly workflow — the server-side equivalent of the Power
Fx actions in the canvas app (see docs/BACKEND_AZURE_DOCUMENTATION.md §7.3).

Reads/writes go through Dataverse; email + (optionally) status flows go through
Power Automate. Status guards from the canvas app are enforced here on the server.
"""
from __future__ import annotations

from datetime import datetime, timezone

from django.conf import settings
from rest_framework.exceptions import NotFound, ValidationError

from .. import field_maps as fm
from .. import serializers
from ..exceptions import FeatureNotEnabled
from .dataverse import dataverse
from .flows import run_flow


def _require_email_enabled() -> None:
    if not settings.EMAIL_ACTIONS_ENABLED:
        raise FeatureNotEnabled(
            "Email actions are not enabled yet (the email approach is still being "
            "decided). Set EMAIL_ACTIONS_ENABLED=true once the flows are wired."
        )


def _esc(value: str) -> str:
    """Escape a string for an OData $filter literal."""
    return value.replace("'", "''")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Reads ────────────────────────────────────────────────────────────────────
def list_anomalies(*, status: str | None = None, top: int = 200) -> list[dict]:
    a = fm.ANOMALY
    flt = f"{a['status']} eq '{_esc(status)}'" if status else None
    records = dataverse.list(
        fm.ANOMALY_ENTITY_SET,
        select=serializers.anomaly_select(),
        filter=flt,
        orderby=f"{a['created_on']} desc",
        top=top,
    )
    return [serializers.map_anomaly(r) for r in records]


def get_anomaly(guid: str) -> dict:
    record = _retrieve(guid)
    return serializers.map_anomaly(record)


def _retrieve(guid: str) -> dict:
    try:
        return dataverse.retrieve(
            fm.ANOMALY_ENTITY_SET, guid, select=serializers.anomaly_select()
        )
    except Exception as exc:  # noqa: BLE001 - surfaced as NotFound for a clean 404
        raise NotFound(f"Anomaly '{guid}' not found.") from exc


# ── Status transitions (mirror Close / Untrain / Retrain) ────────────────────
def close_anomaly(guid: str, *, comment: str, user: str) -> dict:
    """'Close' → status 'in Bearbeitung'. Only allowed from 'new'; comment required."""
    return _change_status(
        guid,
        new_status=fm.STATUS_IN_PROGRESS,
        comment=comment,
        user=user,
        require_status=fm.STATUS_NEW,
        flow_url=settings.SET_STATUS_IN_PROGRESS_FLOW_URL,
        flow_name="SetStatusInBearbeitung",
    )


def untrain_anomaly(guid: str, *, comment: str, user: str) -> dict:
    """'Untrain' → status 'abgebrochen'. Only allowed from 'new'; comment required.

    NOTE: a Dataverse table `at_abtrainierteanomaliens` ("untrained anomalies")
    exists, so the ORIGINAL SetStatusAbgebrochen flow probably also writes the
    record there as ML training feedback. The Phase-1 direct-patch path only sets
    the status — to preserve the feedback, configure SET_STATUS_CANCELLED_FLOW_URL
    (so this calls the real flow) or replicate the insert here. See README / OPEN.
    """
    return _change_status(
        guid,
        new_status=fm.STATUS_CANCELLED,
        comment=comment,
        user=user,
        require_status=fm.STATUS_NEW,
        flow_url=settings.SET_STATUS_CANCELLED_FLOW_URL,
        flow_name="SetStatusAbgebrochen",
    )


def retrain_anomaly(guid: str) -> dict:
    """'Retrain' → status back to 'new' (no guard, no comment)."""
    a = fm.ANOMALY
    dataverse.update(fm.ANOMALY_ENTITY_SET, guid, {a["status"]: fm.STATUS_NEW})
    return get_anomaly(guid)


def _change_status(
    guid: str,
    *,
    new_status: str,
    comment: str,
    user: str,
    require_status: str,
    flow_url: str,
    flow_name: str,
) -> dict:
    if not comment or not comment.strip():
        raise ValidationError({"comment": "A comment is required for this action."})

    record = _retrieve(guid)
    a = fm.ANOMALY
    current = (record.get(a["status"]) or "").strip().lower()
    if current != require_status.lower():
        raise ValidationError(
            f"Action not allowed: status must be '{require_status}', "
            f"but it is '{record.get(a['status'])}'."
        )

    if flow_url:
        # Preserve the original flow's side-effects. The canvas app passed the
        # record GUID (the 'Anomaly Report' column) as the identifier.
        run_flow(
            flow_url,
            {
                "anomalyReportId": guid,
                "anomalieId": record.get(a["anomalie_id"]),
                "comment": comment,
                "user": user,
            },
            name=flow_name,
        )
    else:
        # Phase-1 default: write the transition straight to Dataverse.
        dataverse.update(
            fm.ANOMALY_ENTITY_SET,
            guid,
            {
                a["status"]: new_status,
                fm.COMMENT_FIELD: comment,
                a["status_change_ts"]: _now_iso(),
            },
        )
    return get_anomaly(guid)


# ── Email draft generation (Power Automate) ──────────────────────────────────
def generate_email(guid: str, *, internal: bool) -> dict:
    _require_email_enabled()
    a = fm.ANOMALY
    record = _retrieve(guid)
    vendor_email = record.get(a["vendor_email"]) or "nicht vorhanden"
    payload = {
        "anomalieId": record.get(a["anomalie_id"]),
        "typ": "Intern" if internal else "Lieferant",
        "lieferantenName": record.get(a["vendor_name"]),
        "lieferantenEmail": vendor_email,
        # The flow expects the record GUID here (canvas app passed 'Anomaly Report').
        "anomalyReport": record.get(a["guid"]),
    }
    result = run_flow(
        settings.GENERATE_EMAIL_FLOW_URL, payload, name="LieferantenEMailgenerieren"
    )
    return {"emailText": result.get("emailtextresponse"), "raw": result}


# ── Sending emails (save draft to Dataverse, then run the send flow) ─────────
def send_vendor_email(guid: str, *, draft: str, target_email: str, user: str) -> dict:
    _require_email_enabled()
    a = fm.ANOMALY
    record = _retrieve(guid)
    dataverse.update(fm.ANOMALY_ENTITY_SET, guid, {a["draft_vendor"]: draft})
    result = run_flow(
        settings.EXTERNAL_EMAIL_FLOW_URL,
        {"anomalieId": record.get(a["anomalie_id"]), "user": user, "zielEmail": target_email},
        name="ExternalEmailFlow",
    )
    return {"sent": True, "raw": result}


def send_internal_email(guid: str, *, draft: str, target_email: str, user: str) -> dict:
    _require_email_enabled()
    a = fm.ANOMALY
    record = _retrieve(guid)
    dataverse.update(fm.ANOMALY_ENTITY_SET, guid, {a["draft_internal"]: draft})
    result = run_flow(
        settings.INTERNAL_EMAIL_FLOW_URL,
        {
            "anomalieId": record.get(a["anomalie_id"]),
            "user": user,
            "zielEmail": target_email,
            "bestellerEmail": record.get(a["besteller_email"]),
        },
        name="InternalEmailFlow",
    )
    return {"sent": True, "raw": result}


# ── Suppliers ────────────────────────────────────────────────────────────────
def list_suppliers(*, top: int = 1000) -> list[dict]:
    records = dataverse.list(fm.SUPPLIER_ENTITY_SET, top=top)
    return [serializers.map_supplier(r) for r in records]


# ── User signature (upsert into at_userdetails, keyed by email) ──────────────
def get_signature(user_email: str) -> dict:
    u = fm.USERDETAILS
    rows = dataverse.list(
        fm.USERDETAILS_ENTITY_SET,
        filter=f"{u['user_id']} eq '{_esc(user_email)}'",
        top=1,
    )
    if not rows:
        return {"userId": user_email, "signature": None}
    return serializers.map_userdetails(rows[0])


def set_signature(user_email: str, signature: str) -> dict:
    u = fm.USERDETAILS
    rows = dataverse.list(
        fm.USERDETAILS_ENTITY_SET,
        filter=f"{u['user_id']} eq '{_esc(user_email)}'",
        top=1,
    )
    if rows:
        guid = rows[0][u["guid"]]
        dataverse.update(fm.USERDETAILS_ENTITY_SET, guid, {u["signature"]: signature})
    else:
        dataverse.create(
            fm.USERDETAILS_ENTITY_SET,
            {u["user_id"]: user_email, u["signature"]: signature},
        )
    return get_signature(user_email)
