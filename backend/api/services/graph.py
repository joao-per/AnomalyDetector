"""
Minimal Microsoft Graph client — the email-sending fallback.

The original send flows live in Power Automate, but their HTTP-trigger URLs were
never exposed. Until they are, the BFF can send directly through Graph using the
same Entra app registration (client credentials) with a Graph-scoped token.
Requires the *application* permission Mail.Send (admin consented) and a mailbox
to send from (GRAPH_SENDER_UPN).
"""
from __future__ import annotations

import threading
import time

import requests
from django.conf import settings

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


class GraphError(Exception):
    """Raised when Graph returns an error or auth fails."""

    def __init__(self, message: str, status: int | None = None, detail=None):
        super().__init__(message)
        self.status = status
        self.detail = detail


class GraphClient:
    def __init__(self) -> None:
        self._token: str | None = None
        self._token_expiry: float = 0.0
        self._lock = threading.Lock()

    def _get_token(self) -> str:
        with self._lock:
            if self._token and time.time() < self._token_expiry - 60:
                return self._token
            if not settings.GRAPH_CLIENT_SECRET:
                raise GraphError(
                    "GRAPH_CLIENT_SECRET is not configured on the server.",
                    status=503,
                )
            resp = requests.post(
                settings.GRAPH_TOKEN_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": settings.GRAPH_CLIENT_ID,
                    "client_secret": settings.GRAPH_CLIENT_SECRET,
                    "scope": "https://graph.microsoft.com/.default",
                },
                timeout=30,
            )
            if resp.status_code != 200:
                raise GraphError(
                    "Failed to acquire Microsoft Graph token.",
                    status=resp.status_code,
                    detail=_safe_json(resp),
                )
            payload = resp.json()
            self._token = payload["access_token"]
            self._token_expiry = time.time() + int(payload.get("expires_in", 3600))
            return self._token

    def send_mail(
        self,
        *,
        sender: str,
        to: list[str],
        subject: str,
        body: str,
        reply_to: str | None = None,
    ) -> None:
        """POST /users/{sender}/sendMail — Graph answers 202 with no body."""
        message: dict = {
            "subject": subject,
            "body": {"contentType": "Text", "content": body},
            "toRecipients": [{"emailAddress": {"address": a}} for a in to],
        }
        if reply_to:
            message["replyTo"] = [{"emailAddress": {"address": reply_to}}]
        resp = requests.post(
            f"{GRAPH_BASE}/users/{sender}/sendMail",
            headers={
                "Authorization": f"Bearer {self._get_token()}",
                "Content-Type": "application/json",
            },
            json={"message": message, "saveToSentItems": True},
            timeout=60,
        )
        if resp.status_code >= 400:
            raise GraphError(
                f"Microsoft Graph sendMail failed ({resp.status_code}).",
                status=resp.status_code,
                detail=_safe_json(resp),
            )


def _safe_json(resp: requests.Response):
    try:
        return resp.json()
    except ValueError:
        return resp.text[:1000]


# Module-level singleton — token cache is shared across requests.
graph = GraphClient()
