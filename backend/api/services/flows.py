"""
Client for the existing Power Automate flows (invoked via their HTTP triggers).

Phase 1 keeps the working email logic in Power Automate and simply calls it from
the server. URLs are configured via env; a missing URL raises a clear 503 so the
frontend can degrade gracefully until the flow is exposed.
"""
from __future__ import annotations

import requests


class FlowError(Exception):
    def __init__(self, message: str, status: int | None = None, detail=None):
        super().__init__(message)
        self.status = status
        self.detail = detail


def run_flow(url: str | None, payload: dict, *, name: str = "flow") -> dict:
    if not url:
        raise FlowError(
            f"The '{name}' Power Automate URL is not configured on the server.",
            status=503,
        )
    resp = requests.post(url, json=payload, timeout=120)
    if resp.status_code >= 400:
        detail = None
        try:
            detail = resp.json()
        except ValueError:
            detail = resp.text[:1000]
        raise FlowError(
            f"Power Automate '{name}' returned {resp.status_code}.",
            status=resp.status_code,
            detail=detail,
        )
    try:
        return resp.json()
    except ValueError:
        return {"raw": resp.text}
