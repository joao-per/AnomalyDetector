# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Internal tool for Stiegl's operations team to review supply anomalies (deliveries / invoices).
It replaces an old Power Apps canvas app with a nicer UI but does **not** touch the upstream
Azure ETL/ML pipeline that detects the anomalies — that data is read/written through Dataverse.

The system is a **backend-for-frontend (BFF)**: a Django/DRF service holds all secrets and
proxies Microsoft Dataverse + Power Automate, exposing a clean camelCase JSON API to a React
dashboard. The backend stores **no domain data** itself (SQLite is only for Django internals).

## Commands

**Backend** (`backend/`, runs at `http://127.0.0.1:8000`)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill DATAVERSE_CLIENT_SECRET for live data
python manage.py runserver
```
There are no Django models/migrations for domain data, and no test suite yet.

**Frontend** (`frontend/`, runs at `http://localhost:5173`)
```bash
npm install
cp .env.example .env          # set VITE_API_BASE_URL + VITE_USER_EMAIL
npm run dev
npm run build                 # tsc --noEmit type-check, then vite build
npm run typecheck             # tsc --noEmit only
```
The frontend needs the backend running; the backend needs a valid `DATAVERSE_CLIENT_SECRET`
to load live data (otherwise Dataverse calls return a 503).

## Backend architecture

Request flow: `api/urls.py` → thin `APIView`s in `api/views.py` → all logic in
`api/services/anomalies.py` → Dataverse/Power Automate clients.

- **`api/services/dataverse.py`** — Dataverse Web API client (module-level `dataverse`
  singleton). OAuth2 client-credentials; bearer token cached in-process until expiry. Generic
  OData `list/retrieve/update/create` helpers. Raises `DataverseError`.
- **`api/services/flows.py`** — calls existing Power Automate HTTP-trigger flows via `run_flow`.
  A missing flow URL raises `FlowError(503)` so the feature degrades instead of crashing.
- **`api/services/anomalies.py`** — the business logic; the server-side equivalent of the
  canvas app's Power Fx actions. Enforces status-transition guards (e.g. Close/Untrain only
  allowed from status `new`, comment required) on the server.
- **`api/field_maps.py`** — the **single source of truth** for the Dataverse schema. Maps clean
  names → publisher-prefixed logical column names (`at_…`, some `cr062_…`) and entity-set names.
  If the Dataverse schema changes, edit only this file. Note: the anomaly primary-key column is
  `at_anomalyreport1id` (display name "Anomaly Report") — that GUID is what flows use to
  identify a record, distinct from the business `at_anomalyid` (e.g. `"26_2470"`).
- **`api/serializers.py`** — plain functions mapping raw Dataverse dicts ↔ camelCase JSON
  (these are not DRF serializers). `anomaly_select()` keeps payloads small by `$select`-ing only
  mapped columns.
- **`api/services/graph.py`** — Microsoft Graph client (`graph` singleton), used as the
  email-sending fallback (`sendMail` from the `GRAPH_SENDER_UPN` mailbox) when no send-flow URL
  is configured. Needs the application permission Mail.Send. Raises `GraphError`.
- **`api/exceptions.py`** — `api_exception_handler` turns `DataverseError`/`FlowError`/
  `GraphError` into clean JSON with the upstream status; defines `FeatureNotEnabled` (HTTP 501).
- **`api/auth.py`** — identity + access control. `LOGIN_REQUIRED` (default true) locks every
  endpoint except `/api/health/` and `/api/auth/*` behind a signed-in user via the
  `LoginRequired` DRF permission. Sign-in paths: **Django session login** (POST
  `/api/auth/login/` with email+password, `SessionAuthentication` without CSRF — the cookie is
  SameSite=Lax, so frontend and API must share a host) or **Entra Bearer tokens**
  (`ENTRA_AUTH_ENABLED=true`, validated against the tenant JWKS). The `X-User-Email` header
  fallback only applies with `LOGIN_REQUIRED=false` — local experiments only. Create accounts
  with `manage.py createsuperuser` or `User.objects` in the shell.

## Frontend architecture

Vite + React 19 + TypeScript + Tailwind v4. `@` aliases `src/`. Routes (`App.tsx`): `/login`
(session sign-in over a WebGL ferrofluid backdrop — `components/Ferrofluid.tsx`, ogl), and three
`RequireAuth`-guarded routes: `/` Dashboard, `/untrained` Untrained (training archive: anomalies
with status `Abtrainiert`, grouped by creation date, with a Retrain action),
`/anomalies/:id/email` EmailComposer.

- **`src/auth/RequireAuth.tsx`** — route guard on `GET /api/auth/me/` (`useMe()`); anonymous
  visitors land on `/login`. **`src/api/auth.ts`** — login/logout/me calls; the header's user
  chip signs out.
- **`src/auth/entra.ts`** — MSAL sign-in (redirect flow at boot in `main.tsx`), activated only
  when all three `VITE_ENTRA_*` vars are set; otherwise session login applies.
- **`src/api/client.ts`** — typed `fetch` wrapper; sends `Authorization: Bearer …` in SSO mode,
  else `X-User-Email` from `VITE_USER_EMAIL`; throws `ApiError`.
- **`src/api/anomalies.ts`** — one function per BFF route. **`src/api/hooks.ts`** — React Query
  hooks; status mutations invalidate the anomaly list + affected detail.
- **`src/i18n/`** — bilingual DE/EN. Default language is German; `translations.ts` holds keyed
  strings and the `TranslationKey` type. Use the `t()` from `useI18n()` for all user-facing text.
- State: React Query for server data (`main.tsx` sets `staleTime: 30s`, no refetch-on-focus);
  local component state for filters/sorting/selection (see `Dashboard.tsx`).

## Conventions & gotchas

- **API boundary is camelCase** (frontend); Dataverse is publisher-prefixed snake-case. The
  `serializers` + `field_maps` layer is the only place these two worlds meet — keep mappings
  there, don't sprinkle raw `at_…` names elsewhere.
- **Email sending picks the first configured path**: send-flow URL → Microsoft Graph
  (`GRAPH_SENDER_UPN`) → clean 503. `EMAIL_ACTIONS_ENABLED=false` is a kill switch that turns
  the generate/send endpoints into 501. Status changes and signatures work regardless.
- **Untrain ≠ cancel.** Untrain sets status `Abtrainiert` AND inserts a row into
  `at_abtrainierteanomaliens` (the table the pipeline reads to suppress patterns); retrain
  deletes the matching rows again. Cancel sets status `abgebrochen` with no ML side-effects.
  The feedback insert translates the anomaly's German `at_processreference`
  (Rechnung/Wareneingang/…) to the pipeline's process tokens (`invoice`/`goods_delivery`/…) —
  see `_PROCESS_REF` in `services/anomalies.py`.
- **Status-change flows are optional**: if `SET_STATUS_*_FLOW_URL` is blank, the backend writes
  the transition directly to Dataverse (default). If a flow URL is set, the flow is assumed to
  handle its own side-effects (including the untrain feedback insert).
- **The default anomaly list hides `Abtrainiert` and `abgebrochen`** (server-side OData filter
  in `list_anomalies`); an explicit `?status=` query still returns them (the `/untrained` page
  relies on this). Independently, `HIDDEN_ARTICLE_CATEGORIES` (default `PFANDART`) is excluded
  from EVERY list, status filter or not. The details panel's "Was ist passiert" shows `at_anomalydescription1` only —
  `at_matchexplanation` is deliberately not surfaced (too technical for the ops team).
- **Secrets live only in `.env` files** (gitignored). `DATAVERSE_CLIENT_SECRET` and the flow
  URLs must never be committed.
