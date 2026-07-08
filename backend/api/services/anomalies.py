"""
Business logic for the anomaly workflow — the server-side equivalent of the Power
Fx actions in the canvas app (see docs/BACKEND_AZURE_DOCUMENTATION.md §7.3).

Reads/writes go through Dataverse; email + (optionally) status flows go through
Power Automate. Status guards from the canvas app are enforced here on the server.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from django.conf import settings
from rest_framework.exceptions import NotFound, ValidationError

from .. import field_maps as fm
from .. import serializers
from ..exceptions import FeatureNotEnabled
from .dataverse import dataverse
from .flows import FlowError, run_flow
from .graph import graph

logger = logging.getLogger(__name__)


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
    parts: list[str] = []
    if status:
        parts.append(f"{a['status']} eq '{_esc(status)}'")
    else:
        # Default view: hide untrained/cancelled/completed records. They stay
        # reachable via an explicit ?status= filter (e.g. the /untrained page).
        s = a["status"]
        parts.append(
            f"({s} eq null or ({s} ne '{fm.STATUS_UNTRAINED}' "
            f"and {s} ne '{fm.STATUS_CANCELLED}' "
            f"and {s} ne '{fm.STATUS_DONE}'))"
        )
    # Hidden article categories (e.g. PFANDART) are excluded from EVERY list,
    # regardless of the status filter.
    if settings.HIDDEN_ARTICLE_CATEGORIES:
        c = a["article_category"]
        clauses = " and ".join(
            f"{c} ne '{_esc(cat)}'" for cat in settings.HIDDEN_ARTICLE_CATEGORIES
        )
        parts.append(f"({c} eq null or ({clauses}))")
    flt = " and ".join(parts)
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
    """'Untrain' → status 'Abtrainiert'. Only allowed from 'new'; comment required.

    Besides the status change, this records the anomaly in the
    `at_abtrainierteanomaliens` table — the ML training feedback the pipeline
    uses to stop flagging this pattern. When SET_STATUS_UNTRAINED_FLOW_URL is
    set the flow performs that insert itself; on the direct-patch path we do
    it here.
    """
    return _change_status(
        guid,
        new_status=fm.STATUS_UNTRAINED,
        comment=comment,
        user=user,
        require_status=fm.STATUS_NEW,
        flow_url=settings.SET_STATUS_UNTRAINED_FLOW_URL,
        flow_name="SetStatusAbtrainiert",
        on_direct=lambda record: _record_training_feedback(
            record, comment=comment, user=user
        ),
    )


def cancel_anomaly(guid: str, *, comment: str, user: str) -> dict:
    """'Cancel' → status 'abgebrochen'. Only allowed from 'new'; comment
    required. Plain terminal state — unlike untrain, the ML pipeline keeps
    flagging this pattern."""
    return _change_status(
        guid,
        new_status=fm.STATUS_CANCELLED,
        comment=comment,
        user=user,
        require_status=fm.STATUS_NEW,
        flow_url=settings.SET_STATUS_CANCELLED_FLOW_URL,
        flow_name="SetStatusAbgebrochen",
    )


def retrain_anomaly(guid: str, *, user: str) -> dict:
    """'Retrain' → status back to 'new', and the training feedback is withdrawn
    (matching `at_abtrainierteanomaliens` rows are deleted) so the ML pipeline
    starts flagging this pattern again."""
    a = fm.ANOMALY
    record = _retrieve(guid)
    _remove_training_feedback(record.get(a["anomalie_id"]))
    dataverse.update(
        fm.ANOMALY_ENTITY_SET,
        guid,
        {
            a["status"]: fm.STATUS_NEW,
            a["change_history"]: _appended_history(
                record,
                new_status=fm.STATUS_NEW,
                user=user,
                comment="Neu trainiert (Training-Feedback zurückgezogen)",
            ),
        },
    )
    return get_anomaly(guid)


# The anomaly stores the process as a German label, but the feedback table (and
# the ML pipeline reading it) uses the SQL-layer process names — confirmed from
# rows the original flow wrote (invoice / goods_delivery / purchase_header).
_PROCESS_REF = {
    "rechnung": "invoice",
    "wareneingang": "goods_delivery",
    "bestellkopf": "purchase_header",
    "bestellposition": "purchase_line",
}


def _record_training_feedback(record: dict, *, comment: str, user: str) -> None:
    """Append the anomaly to the untrained-anomalies table (ML training feedback)."""
    a, u = fm.ANOMALY, fm.UNTRAINED
    vendor = record.get(a["vendor_name"]) or "Unknown Vendor"
    process = (record.get(a["process_reference"]) or "").strip()
    process = _PROCESS_REF.get(process.lower(), process)
    dataverse.create(
        fm.UNTRAINED_ENTITY_SET,
        {
            u["anomalie_id"]: record.get(a["anomalie_id"]),
            u["anomaly_type"]: record.get(a["anomaly_type"]),
            u["article_category"]: record.get(a["article_category"]),
            u["article_name"]: record.get(a["article_name"]),
            u["article_id"]: record.get(a["article_id"]),
            u["vendor_name"]: vendor,
            # rows written by the original flow carry the vendor NAME here when
            # no supplier number exists — keep that convention for the pipeline
            u["vendor_number"]: record.get(a["supplier_id"]) or vendor,
            u["process_ref"]: process,
            u["reasoning"]: (
                "Die Anomalie ist Teil der abtrainierten Anomalien, weil: "
                f"{comment.strip()} (abtrainiert von {user})"
            ),
            u["created_at"]: _now_iso(),
        },
    )


def _remove_training_feedback(anomalie_id: str | None) -> None:
    """Delete all feedback rows for a business id (idempotent — 0 rows is fine)."""
    if not anomalie_id:
        return
    u = fm.UNTRAINED
    rows = dataverse.list(
        fm.UNTRAINED_ENTITY_SET,
        select=[u["guid"]],
        filter=f"{u['anomalie_id']} eq '{_esc(anomalie_id)}'",
    )
    for row in rows:
        dataverse.delete(fm.UNTRAINED_ENTITY_SET, row[u["guid"]])


def _appended_history(record: dict, *, new_status: str, user: str, comment: str) -> str:
    """The anomaly's change history with a new entry PREPENDED (newest first —
    the convention the canvas app used, matching entries like
    '20.04.2026 09:55 - Status geändert zu ... von ... | Mit dem Kommentar: ...')."""
    ts = datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M")
    entry = f"{ts} - Status geändert zu {new_status} von {user}"
    if comment and comment.strip():
        entry += f" | Mit dem Kommentar: {comment.strip()}"
    existing = (record.get(fm.ANOMALY["change_history"]) or "").strip()
    return f"{entry}\n{existing}" if existing else entry


def _change_status(
    guid: str,
    *,
    new_status: str,
    comment: str,
    user: str,
    require_status: str,
    flow_url: str,
    flow_name: str,
    on_direct=None,
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
                a["change_history"]: _appended_history(
                    record, new_status=new_status, user=user, comment=comment
                ),
            },
        )
        # Extra side-effects the original flow performed (e.g. the untrain
        # training-feedback insert) — only needed on the direct path.
        if on_direct:
            on_direct(record)
    return get_anomaly(guid)


# ── "Erklär mal" — AI explanation of the anomaly's plot image ────────────────
def explain_anomaly(guid: str) -> dict:
    """Calls the Erklär-mal flow with the anomaly's plot image URL
    (at_testbildurl); the flow answers {"Antwort": "<explanation>"}."""
    record = _retrieve(guid)
    a = fm.ANOMALY
    image_url = record.get(a["test_image_url"])
    if not image_url:
        raise ValidationError(
            "This anomaly has no plot image (at_testbildurl) to explain."
        )
    result = run_flow(
        settings.EXPLAIN_ANOMALY_FLOW_URL,
        {"url": image_url, "anomalyId": record.get(a["anomalie_id"])},
        name="ErklaerMal",
    )
    answer = None
    if isinstance(result, dict):
        answer = result.get("Antwort") or result.get("antwort") or result.get("answer")
    return {"answer": answer, "raw": result}


# ── Email draft generation (Power Automate AI flow, template fallback) ───────
def generate_email(guid: str, *, internal: bool) -> dict:
    """Draft via the AI flow when it is reachable; otherwise fall back to a
    server-side template so the composer always gets a usable draft.

    The HTTP-trigger flow ("exthttp – LieferantenEMail generieren") answers 202
    with an empty body: it runs GPT and writes the result into the anomaly's
    draft column in Dataverse. So after triggering it we poll the record until
    the fresh draft appears (typically a few seconds)."""
    _require_email_enabled()
    a = fm.ANOMALY
    record = _retrieve(guid)
    draft_field = a["draft_internal"] if internal else a["draft_vendor"]
    previous = (record.get(draft_field) or "").strip()

    if settings.GENERATE_EMAIL_FLOW_URL:
        vendor_email = record.get(a["vendor_email"]) or "nicht vorhanden"
        payload = {
            "anomalieId": record.get(a["anomalie_id"]),
            "typ": "Intern" if internal else "Lieferant",
            "lieferantenName": record.get(a["vendor_name"]),
            "lieferantenEmail": vendor_email,
            # The flow expects the record GUID here (canvas app passed 'Anomaly Report').
            "anomalyReport": record.get(a["guid"]),
        }
        try:
            result = run_flow(
                settings.GENERATE_EMAIL_FLOW_URL, payload, name="LieferantenEMailgenerieren"
            )
            text = ""
            if isinstance(result, dict):
                text = (result.get("emailtextresponse") or "").strip()
            if not text:
                text = _await_generated_draft(guid, draft_field, previous)
            if text:
                return {"emailText": text, "source": "flow", "raw": result}
            logger.warning(
                "AI email flow accepted the request but no draft appeared in "
                "time — using template draft."
            )
        except FlowError as exc:
            logger.warning("AI email flow unavailable (%s) — using template draft.", exc)

    return {
        "emailText": _template_email_text(record, internal=internal),
        "source": "template",
        "raw": None,
    }


def _await_generated_draft(
    guid: str, draft_field: str, previous: str, *, timeout: float = 45, interval: float = 3
) -> str:
    """Poll the anomaly's draft column until the flow has written a new value."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        time.sleep(interval)
        row = dataverse.retrieve(fm.ANOMALY_ENTITY_SET, guid, select=[draft_field])
        text = (row.get(draft_field) or "").strip()
        if text and text != previous:
            return text
    return ""


def _template_email_text(record: dict, *, internal: bool) -> str:
    """German draft built from the anomaly's facts (the signature is appended
    client-side). Used whenever the AI flow can't be reached."""
    a = fm.ANOMALY
    g = record.get
    facts = "\n".join(
        f"• {label}: {value}"
        for label, value in [
            ("Anomalie", f"{g(a['anomalie_id']) or '—'} – {g(a['anomaly_type']) or '—'}"),
            ("Bestellung", g(a["order_id"]) or "—"),
            ("Artikel", f"{g(a['article_name']) or g(a['article_id']) or '—'}"
                        f" ({g(a['article_category']) or '—'})"),
            ("Prozess", g(a["process_reference"]) or "—"),
        ]
    )
    description = (g(a["match_explanation"]) or g(a["description1"]) or "").strip()
    if description == (g(a["anomaly_type"]) or "").strip():
        description = ""  # no value in repeating the type as the "explanation"
    if description:
        description = f"\n{description}\n"

    if internal:
        return (
            "Hallo,\n\n"
            f"der Anomaliedetektor hat zur Bestellung {g(a['order_id']) or '—'} eine "
            "Auffälligkeit gemeldet:\n\n"
            f"{facts}\n"
            f"{description}\n"
            "Bitte um kurze Einschätzung, ob die Abweichung nachvollziehbar ist oder "
            "weiter untersucht werden soll.\n\n"
            "Vielen Dank und freundliche Grüße"
        )
    return (
        "Sehr geehrte Damen und Herren,\n\n"
        "bei der Prüfung unserer Bestell- und Lieferdaten wurde zu Ihrer Lieferung "
        "eine Auffälligkeit festgestellt:\n\n"
        f"{facts}\n"
        f"{description}\n"
        "Wir bitten Sie um kurze Prüfung des Sachverhalts und um Rückmeldung, ob es "
        "sich um eine Abweichung Ihrerseits handelt oder ob uns weitere Informationen "
        "fehlen.\n\n"
        "Mit freundlichen Grüßen"
    )


# ── Sending emails (save draft to Dataverse, then flow OR Graph) ─────────────
def _normalize_draft(draft: str, *, subject: str, record: dict) -> str:
    """The send flows split the saved draft at 'Betreff:' to isolate the email
    subject (AI drafts always start with such a line) — add one if missing."""
    if "Betreff:" in draft:
        return draft
    a = fm.ANOMALY
    subj = subject.strip() or f"Anomalie {record.get(a['anomalie_id'])}"
    return f"Betreff: {subj}\n\n{draft}"


def send_vendor_email(
    guid: str, *, draft: str, target_email: str, user: str, subject: str = ""
) -> dict:
    _require_email_enabled()
    a = fm.ANOMALY
    record = _retrieve(guid)
    stored = _normalize_draft(draft, subject=subject, record=record)
    dataverse.update(fm.ANOMALY_ENTITY_SET, guid, {a["draft_vendor"]: stored})
    return _dispatch_email(
        record,
        draft=draft,
        target_email=target_email,
        user=user,
        subject=subject,
        flow_url=settings.EXTERNAL_EMAIL_FLOW_URL,
        flow_name="ExternalEmailFlow",
        flow_payload={
            "anomalieId": record.get(a["anomalie_id"]),
            "user": user,
            "zielEmail": target_email,
        },
    )


def send_internal_email(
    guid: str, *, draft: str, target_email: str, user: str, subject: str = ""
) -> dict:
    _require_email_enabled()
    a = fm.ANOMALY
    record = _retrieve(guid)
    stored = _normalize_draft(draft, subject=subject, record=record)
    dataverse.update(fm.ANOMALY_ENTITY_SET, guid, {a["draft_internal"]: stored})
    return _dispatch_email(
        record,
        draft=draft,
        target_email=target_email,
        user=user,
        subject=subject,
        flow_url=settings.INTERNAL_EMAIL_FLOW_URL,
        flow_name="InternalEmailFlow",
        flow_payload={
            "anomalieId": record.get(a["anomalie_id"]),
            "user": user,
            "zielEmail": target_email,
            "bestellerEmail": record.get(a["besteller_email"]),
        },
    )


def _dispatch_email(
    record: dict,
    *,
    draft: str,
    target_email: str,
    user: str,
    subject: str,
    flow_url: str,
    flow_name: str,
    flow_payload: dict,
) -> dict:
    """Send via the Power Automate flow when its URL is configured, otherwise
    fall back to Microsoft Graph sendMail (GRAPH_SENDER_UPN mailbox)."""
    if flow_url:
        result = run_flow(flow_url, flow_payload, name=flow_name)
        return {"sent": True, "via": "flow", "raw": result}

    if settings.GRAPH_SENDER_UPN:
        a = fm.ANOMALY
        graph.send_mail(
            sender=settings.GRAPH_SENDER_UPN,
            to=[target_email],
            subject=subject.strip() or f"Anomalie {record.get(a['anomalie_id'])}",
            body=draft,
            reply_to=user,
        )
        return {"sent": True, "via": "graph", "raw": None}

    raise FlowError(
        f"No send path configured: set the '{flow_name}' flow URL or "
        "GRAPH_SENDER_UPN (Graph sendMail fallback).",
        status=503,
    )


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
