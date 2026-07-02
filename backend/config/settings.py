"""
Django settings for the Anomaly Detector backend-for-frontend (BFF).

Phase 1: this service holds all secrets, proxies Dataverse for anomaly data, and
exposes a clean JSON API to the React frontend. It stores no domain data itself
(the SQLite DB is only for Django internals/sessions).
"""
from pathlib import Path

from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env sitting next to manage.py (local dev). In prod, use real env vars.
load_dotenv(BASE_DIR / ".env")


def env(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


def env_bool(key: str, default: bool = False) -> bool:
    return env(key, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def env_list(key: str, default: str = "") -> list[str]:
    return [v.strip() for v in env(key, default).split(",") if v.strip()]


# ── Core ─────────────────────────────────────────────────────────────────────
SECRET_KEY = env("DJANGO_SECRET_KEY", "dev-insecure-key-change-me")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.security.SecurityMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    },
]

# Django internals only — no domain data lives here in Phase 1.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True

# ── CORS ─────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
)
CORS_ALLOW_HEADERS = (
    "accept",
    "authorization",
    "content-type",
    "x-user-email",
)

# ── DRF ──────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "EXCEPTION_HANDLER": "api.exceptions.api_exception_handler",
    # Enforces a valid Entra Bearer token on every endpoint while
    # ENTRA_AUTH_ENABLED=true; a no-op in Phase-1 fallback mode.
    "DEFAULT_AUTHENTICATION_CLASSES": ["api.auth.EntraAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": [],
}

# ── Dataverse ────────────────────────────────────────────────────────────────
DATAVERSE_URL = env("DATAVERSE_URL", "https://stiegl-developerdefault.crm4.dynamics.com")
DATAVERSE_API_VERSION = env("DATAVERSE_API_VERSION", "v9.2")
DATAVERSE_TOKEN_URL = env(
    "DATAVERSE_TOKEN_URL",
    "https://login.microsoftonline.com/dfe9186e-bd11-4b76-9d24-0dddd4a395c9/oauth2/v2.0/token",
)
DATAVERSE_CLIENT_ID = env("DATAVERSE_CLIENT_ID")
DATAVERSE_CLIENT_SECRET = env("DATAVERSE_CLIENT_SECRET")

# ── Power Automate flow URLs ─────────────────────────────────────────────────
# Draft generation uses the existing HTTP-trigger flow. For SENDING, a flow URL
# takes precedence; if none is set, the backend falls back to Microsoft Graph
# sendMail (see GRAPH_SENDER_UPN below). EMAIL_ACTIONS_ENABLED=false turns the
# generate/send endpoints into HTTP 501 (kill switch).
EMAIL_ACTIONS_ENABLED = env_bool("EMAIL_ACTIONS_ENABLED", True)
GENERATE_EMAIL_FLOW_URL = env("GENERATE_EMAIL_FLOW_URL")
EXTERNAL_EMAIL_FLOW_URL = env("EXTERNAL_EMAIL_FLOW_URL")
INTERNAL_EMAIL_FLOW_URL = env("INTERNAL_EMAIL_FLOW_URL")
SET_STATUS_IN_PROGRESS_FLOW_URL = env("SET_STATUS_IN_PROGRESS_FLOW_URL")
SET_STATUS_CANCELLED_FLOW_URL = env("SET_STATUS_CANCELLED_FLOW_URL")

# ── Microsoft Graph (email sending fallback) ─────────────────────────────────
# Mailbox the BFF sends from when no send-flow URL is configured. Requires the
# app registration to hold the *application* permission Mail.Send (admin
# consented). Defaults to the Dataverse app registration's credentials.
GRAPH_SENDER_UPN = env("GRAPH_SENDER_UPN")
GRAPH_CLIENT_ID = env("GRAPH_CLIENT_ID", DATAVERSE_CLIENT_ID)
GRAPH_CLIENT_SECRET = env("GRAPH_CLIENT_SECRET", DATAVERSE_CLIENT_SECRET)
GRAPH_TOKEN_URL = env("GRAPH_TOKEN_URL", DATAVERSE_TOKEN_URL)

# ── Auth ─────────────────────────────────────────────────────────────────────
# Entra ID SSO (Phase 2): the SPA signs users in with MSAL and calls this API
# with a Bearer token, validated in api/auth.py. While disabled, the Phase-1
# X-User-Email header fallback is used — local dev only, never production.
ENTRA_AUTH_ENABLED = env_bool("ENTRA_AUTH_ENABLED", False)
ENTRA_TENANT_ID = env("ENTRA_TENANT_ID", "dfe9186e-bd11-4b76-9d24-0dddd4a395c9")
# Audience of the API app registration the SPA requests tokens for —
# "api://<api-client-id>" (or the bare client id, depending on the app manifest).
ENTRA_API_AUDIENCE = env("ENTRA_API_AUDIENCE")
# Phase-1 fallback identity for local dev.
DEV_DEFAULT_USER_EMAIL = env("DEV_DEFAULT_USER_EMAIL")
