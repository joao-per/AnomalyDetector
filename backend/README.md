# Anomaly Detector — Backend-for-Frontend (Django)

Phase 1 of the React rebuild. This Django + DRF service is a **backend-for-frontend
(BFF)**: it holds all secrets server-side, proxies **Dataverse** for anomaly data,
calls the existing **Power Automate** flows for emails, and exposes a clean JSON
API to the React app. The Azure ETL/SQL/ML pipeline is **not touched**.

> Why a backend at all? So the Dataverse client secret never ships to the browser,
> and React talks to clean REST instead of Dataverse OData. See
> `../docs/BACKEND_AZURE_DOCUMENTATION.md` §9.

## Architecture

```
React SPA ──HTTP/JSON──► Django BFF ──► Dataverse Web API   (anomalies, suppliers, signatures)
                              │
                              └────────► Power Automate flows (generate/send email, [status])
                              └────────► Blob plot URLs are passed straight through to the SPA
```

## Layout

| Path | Purpose |
|---|---|
| `config/` | Django project (settings, urls, wsgi/asgi) |
| `api/services/dataverse.py` | Dataverse Web API client (client-credentials OAuth + token cache) |
| `api/services/flows.py` | Power Automate HTTP-trigger client |
| `api/services/anomalies.py` | **Business logic** — the server-side port of the canvas-app actions |
| `api/field_maps.py` | **Single source of Dataverse logical names** — confirm against live schema |
| `api/serializers.py` | Dataverse record ↔ clean camelCase JSON |
| `api/views.py`, `api/urls.py` | HTTP endpoints |
| `api/auth.py` | Phase-1 user identity (`X-User-Email`); TODO Entra SSO |

## Setup

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill in DATAVERSE_CLIENT_SECRET (rotated!)
python manage.py migrate      # Django internals only (sqlite)
python manage.py runserver    # http://127.0.0.1:8000
```

Smoke test (no Dataverse needed):
```bash
curl http://127.0.0.1:8000/api/health/
```

## API

All responses are JSON. Send the acting user as `X-User-Email: someone@stiegl…`
(temporary — becomes Entra SSO).

| Method | Path | Body | Action |
|---|---|---|---|
| GET | `/api/health/` | — | liveness |
| GET | `/api/anomalies/?status=new` | — | list anomalies (optional status filter) |
| GET | `/api/anomalies/{id}/` | — | one anomaly |
| POST | `/api/anomalies/{id}/close/` | `{comment}` | → status **in Bearbeitung** (only from `new`) |
| POST | `/api/anomalies/{id}/untrain/` | `{comment}` | → status **abgebrochen** (only from `new`) |
| POST | `/api/anomalies/{id}/retrain/` | — | → status **new** |
| POST | `/api/anomalies/{id}/generate-email/` | `{internal: bool}` | AI email draft (vendor/internal) |
| POST | `/api/anomalies/{id}/send-vendor-email/` | `{draft, targetEmail}` | save draft + send to vendor |
| POST | `/api/anomalies/{id}/send-internal-email/` | `{draft, targetEmail}` | save draft + send internally |
| GET | `/api/suppliers/` | — | supplier list |
| GET | `/api/me/signature/` | — | current user's email signature |
| PUT | `/api/me/signature/` | `{signature}` | upsert signature |

`{id}` is the Dataverse GUID returned as `id` in the list/detail responses.

## Status

- ✅ App boots, system check clean, `/api/health/` OK.
- ✅ `api/field_maps.py` **confirmed against the live Dataverse schema** (2026-06-28).
- ✅ Reads (`/anomalies/`, `/suppliers/`, `/me/signature/`) verified against live data.
- ✅ Write-path verified live & reversibly: close/untrain/retrain (incl. status guards) + signature upsert.
- ✅ Email actions intentionally gated (HTTP 501) behind `EMAIL_ACTIONS_ENABLED` until the approach is decided.

## ⚠️ Before the full workflow is faithful

1. **`DATAVERSE_CLIENT_SECRET`** — put the secret in `.env` (or pass as env var). Per the
   team's plan it stays as-is until the new stack is live, then gets **rotated** at cutover.
2. **Send-email flow URLs** — `GENERATE_EMAIL_FLOW_URL` is known and used. The *send* flows
   (`EXTERNAL_/INTERNAL_EMAIL_FLOW_URL`) need HTTP-trigger URLs from Power Automate before
   `send-*-email` endpoints work.
3. **Status-change side effects (OPEN)** — by default status changes are written straight to
   Dataverse. But a table `at_abtrainierteanomaliens` ("untrained anomalies") exists, so the
   original **Untrain** flow likely also writes ML training feedback there. To preserve that,
   either set `SET_STATUS_CANCELLED_FLOW_URL` (call the real flow) or replicate the insert in
   `services/anomalies.py`. Decide before go-live.

## Production notes

- Replace the `X-User-Email` stub in `api/auth.py` with **Entra ID** token validation (MSAL/JWKS).
- Source secrets from **Key Vault `Anomalidetektor`** / Linode env, never files.
- Deploy with `gunicorn config.wsgi` behind your reverse proxy on Linode.
