# Anomaly Detector

Internal tool for reviewing supply anomalies (deliveries / invoices) at Stiegl.
A **Django backend-for-frontend (BFF)** proxies Dataverse + Power Automate, and a
**React dashboard** gives the operations team a faster, nicer UI than the old
Power Apps canvas app. The Azure ETL/ML pipeline that detects the anomalies is
untouched.

## Structure

| Path | What |
|---|---|
| `backend/` | Django + DRF BFF — proxies Dataverse, exposes a typed REST API |
| `frontend/` | Vite + React + TypeScript + Tailwind dashboard (bilingual DE/EN) |

## Quick start

**Backend** (`http://127.0.0.1:8000`)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill DATAVERSE_CLIENT_SECRET
python manage.py runserver
```

**Frontend** (`http://localhost:5173`)

```bash
cd frontend
npm install
cp .env.example .env        # set VITE_API_BASE_URL + VITE_USER_EMAIL
npm run dev
```

The frontend needs the backend running, and the backend needs a valid
`DATAVERSE_CLIENT_SECRET` to load live data.

## Notes

- Secrets live only in `.env` files (gitignored) — never commit them.
- Auth is a Phase-1 `X-User-Email` stub, to be replaced by Entra SSO.
- Email generate/send actions are gated off (`EMAIL_ACTIONS_ENABLED=false`)
  until the Power Automate approach is finalized.
