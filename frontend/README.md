# Anomaly Detector — Frontend (React)

The new React UI for the Stiegl Anomaliedetektor. It replaces the Power Apps
canvas app's looks while talking to the **Django BFF** (`../backend`), which in
turn proxies Dataverse + Power Automate. The Azure ETL/SQL/ML pipeline is untouched.

Built to the Figma design **"AD" → page `MacBook Pro 16" - 51`**.

## Stack

- **Vite 6** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (theme tokens from the Figma palette in `src/index.css`)
- **@tanstack/react-query** for data fetching / cache invalidation
- **Poppins** + **Inter** bundled locally via `@fontsource` (no external font requests)

## Setup

```bash
cd frontend
npm install
cp .env.example .env     # set VITE_API_BASE_URL + VITE_USER_EMAIL
npm run dev              # http://localhost:5173
```

The BFF must be running too (see `../backend/README.md`):

```bash
cd ../backend && .venv/bin/python manage.py runserver
```

> Live anomaly data needs `DATAVERSE_CLIENT_SECRET` set in `backend/.env`.
> Without it the app loads and renders, but the table shows a load error.

## Environment

| Var | Purpose |
|---|---|
| `VITE_API_BASE_URL` | BFF base, incl. `/api` (default `http://127.0.0.1:8000/api`) |
| `VITE_USER_EMAIL` | Phase-1 acting user, sent as `X-User-Email` (becomes Entra SSO) |

## Layout

| Path | Purpose |
|---|---|
| `src/api/` | Typed BFF client (`client.ts`), endpoint fns (`anomalies.ts`), React-Query hooks (`hooks.ts`), DTO types (`types.ts`) |
| `src/i18n/` | Bilingual (DE/EN) — `translations.ts` (typed dictionary) + `i18n.tsx` (provider + `useI18n()` / `t()`) |
| `src/components/` | `PageShell`, `AppHeader`, `StatCards`, `FilterBar`, `AnomalyTable`, `SupplierAvatar`, `StatusBadge`, `DetailPanel`, `ScoreGauge`, `AnomalyCard`, `SignaturePanel`, `icons` |
| `src/pages/Dashboard.tsx` | List + detail screen; holds filter/selection state |
| `src/pages/EmailComposer.tsx` | Email composer screen (compose / generate / send / signature) |
| `src/lib/format.ts` | Status/criticality/score formatting helpers |
| `src/lib/supplierLogos.ts` | Maps a supplier name to its logo (for the table avatars) |
| `src/lib/emailTemplate.ts` | Default vendor/internal email bodies with field substitution |
| `src/index.css` | Tailwind import + brand design tokens (`@theme`) |
| `src/assets/` | Stiegl logo, supplier logos (Rauh / Krones / Drukarnia), decorative beer + foam |
| `_design_reference/` | Raw Figma exports (CSS dump, screenshots) — reference only, gitignored |

## Routes

| Path | Page | Figma frame |
|---|---|---|
| `/` | Dashboard (list + detail) | `MacBook Pro 16" - 51` |
| `/anomalies/:id/email` | Email composer (`?type=internal` for the internal variant) | `MacBook Pro 16" - 55` |

## Dashboard (`/`)

- **Header** — Stiegl logo (links home), notification + account buttons.
- **Stat cards** (top row) — Total Anomalies / Critical / In Progress / Resolved
  with live counts, %-of-total, and a sparkline. Each card is also a live filter
  (click to narrow the table; "Total" clears it).
- **Filter bar** — dropdowns over the real anomaly fields (Lieferant, Typ,
  Kategorie, Kritikalität) + reset + refresh.
- **Anomaly table** — striped, selectable rows; supplier logo avatars next to the
  vendor name; criticality highlighted red.
- **Detail panel** (right, red) — score ring gauge, "Anomalie erkannt" badge,
  match explanation, plot links, details list, comment box, and the workflow
  actions (In Bearbeitung nehmen / Abbrechen / Zurücksetzen). "E-Mail verfassen"
  navigates to the composer.

## Email composer (`/anomalies/:id/email`)

- **Anomaly card** (left, red) — condensed gauge + details for the anomaly.
- **Composer sheet** (center) — From / To / Subject / Body, seeded from a German/
  English template with the anomaly's fields substituted. "KI-Antwort generieren"
  calls `generate_email`; "Senden" calls `send_vendor_email` / `send_internal_email`.
- **Signature panel** (right) — loads/saves the user's signature (`me/signature/`,
  not gated) and appends it on send. Stored as text (`at_signatur`), edited as text.

> Email **generate/send** hit the gated BFF endpoints, so they surface a
> "noch nicht aktiviert (Phase 1)" notice until `EMAIL_ACTIONS_ENABLED=true`.
> Signature load/save works today.

## Internationalisation

The UI is **bilingual: German + English**, via a tiny typed context (`src/i18n`).
A DE/EN toggle in the header switches language; the choice persists in
`localStorage` (`ad.lang`) and defaults from the browser language. `translations.ts`
holds both dictionaries — `de` is the source of truth and `en` is typed
`Record<TranslationKey, string>`, so the compiler flags any missing key. Email
body templates exist in both languages and follow the active language.

## Status

- ✅ Builds (`npm run build`) and type-checks (`npm run typecheck`) clean.
- ✅ Dev server serves; CORS + `X-User-Email` verified against the live BFF.
- ✅ Reads (list) + status actions wired to the BFF endpoints.
- ⏸️ **Email draft/send** buttons call the gated endpoint and surface the
  "noch nicht aktiviert" (501) notice until `EMAIL_ACTIONS_ENABLED` is turned on.

## Design ↔ data notes

The Figma mock used Portuguese placeholder labels (Gestor / Unidade / Projeto /
Risco) and sample rows. The real Dataverse data is German/English with different
fields, so the **visual design is reproduced faithfully** but columns/filters are
bound to the **actual anomaly fields**. Worth a quick review with the client to
confirm which columns/filters they want surfaced.

## Deferred / next

- List **pagination** (BFF caps at 200; client filters the loaded set today).
- **Entra SSO** to replace the `X-User-Email` stub.
- Wire **email** actions once the Power Automate approach is decided.
- Per-anomaly **detail fetch** is currently derived from the list payload (the
  list already returns full records); add a dedicated refetch if the list moves
  to a light projection.
