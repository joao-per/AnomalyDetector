"""
Thin Dataverse Web API client.

Authenticates with OAuth2 *client-credentials* (the app registration's secret lives
here on the server, never in the browser) and caches the bearer token until it
expires. Exposes minimal OData CRUD helpers used by the rest of the app.
"""
from __future__ import annotations

import threading
import time

import requests
from django.conf import settings


class DataverseError(Exception):
    """Raised when Dataverse returns an error or auth fails."""

    def __init__(self, message: str, status: int | None = None, detail=None):
        super().__init__(message)
        self.status = status
        self.detail = detail


class DataverseClient:
    def __init__(self) -> None:
        self._token: str | None = None
        self._token_expiry: float = 0.0
        self._lock = threading.Lock()

    # ── config ──
    @property
    def _base(self) -> str:
        return settings.DATAVERSE_URL.rstrip("/")

    @property
    def _api(self) -> str:
        return f"{self._base}/api/data/{settings.DATAVERSE_API_VERSION}"

    # ── auth ──
    def _get_token(self) -> str:
        with self._lock:
            if self._token and time.time() < self._token_expiry - 60:
                return self._token
            if not settings.DATAVERSE_CLIENT_SECRET:
                raise DataverseError(
                    "DATAVERSE_CLIENT_SECRET is not configured on the server.",
                    status=503,
                )
            resp = requests.post(
                settings.DATAVERSE_TOKEN_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": settings.DATAVERSE_CLIENT_ID,
                    "client_secret": settings.DATAVERSE_CLIENT_SECRET,
                    "scope": f"{self._base}/.default",
                },
                timeout=30,
            )
            if resp.status_code != 200:
                raise DataverseError(
                    "Failed to acquire Dataverse token.",
                    status=resp.status_code,
                    detail=_safe_json(resp),
                )
            payload = resp.json()
            self._token = payload["access_token"]
            self._token_expiry = time.time() + int(payload.get("expires_in", 3600))
            return self._token

    def _headers(self, extra: dict | None = None) -> dict:
        headers = {
            "Authorization": f"Bearer {self._get_token()}",
            "Accept": "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            "Content-Type": "application/json; charset=utf-8",
        }
        if extra:
            headers.update(extra)
        return headers

    # ── CRUD ──
    def list(
        self,
        entity_set: str,
        *,
        select: list[str] | None = None,
        filter: str | None = None,
        orderby: str | None = None,
        top: int | None = None,
        expand: str | None = None,
    ) -> list[dict]:
        params: dict[str, str] = {}
        if select:
            params["$select"] = ",".join(select)
        if filter:
            params["$filter"] = filter
        if orderby:
            params["$orderby"] = orderby
        if top:
            params["$top"] = str(top)
        if expand:
            params["$expand"] = expand
        resp = requests.get(
            f"{self._api}/{entity_set}", headers=self._headers(), params=params, timeout=60
        )
        _raise_for_status(resp)
        return resp.json().get("value", [])

    def retrieve(self, entity_set: str, guid: str, *, select: list[str] | None = None) -> dict:
        params: dict[str, str] = {}
        if select:
            params["$select"] = ",".join(select)
        resp = requests.get(
            f"{self._api}/{entity_set}({guid})",
            headers=self._headers(),
            params=params,
            timeout=60,
        )
        _raise_for_status(resp)
        return resp.json()

    def update(self, entity_set: str, guid: str, data: dict) -> dict | None:
        resp = requests.patch(
            f"{self._api}/{entity_set}({guid})",
            headers=self._headers({"Prefer": "return=representation"}),
            json=data,
            timeout=60,
        )
        _raise_for_status(resp)
        return resp.json() if resp.content else None

    def create(self, entity_set: str, data: dict) -> dict | None:
        resp = requests.post(
            f"{self._api}/{entity_set}",
            headers=self._headers({"Prefer": "return=representation"}),
            json=data,
            timeout=60,
        )
        _raise_for_status(resp)
        return resp.json() if resp.content else None


def _safe_json(resp: requests.Response):
    try:
        return resp.json()
    except ValueError:
        return resp.text[:1000]


def _raise_for_status(resp: requests.Response) -> None:
    if resp.status_code >= 400:
        raise DataverseError(
            f"Dataverse API error ({resp.status_code}).",
            status=resp.status_code,
            detail=_safe_json(resp),
        )


# Module-level singleton — token cache is shared across requests.
dataverse = DataverseClient()
