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
    "DEFAULT_AUTHENTICATION_CLASSES": [],
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
# Email actions are deferred (the Power Automate flows are Power Apps-invoked, not
# plain HTTP). Until the approach is decided, the generate/send endpoints return 501.
EMAIL_ACTIONS_ENABLED = env_bool("EMAIL_ACTIONS_ENABLED", False)
GENERATE_EMAIL_FLOW_URL = env("GENERATE_EMAIL_FLOW_URL")
EXTERNAL_EMAIL_FLOW_URL = env("EXTERNAL_EMAIL_FLOW_URL")
INTERNAL_EMAIL_FLOW_URL = env("INTERNAL_EMAIL_FLOW_URL")
SET_STATUS_IN_PROGRESS_FLOW_URL = env("SET_STATUS_IN_PROGRESS_FLOW_URL")
SET_STATUS_CANCELLED_FLOW_URL = env("SET_STATUS_CANCELLED_FLOW_URL")

# ── Auth (Phase 1 stub) ──────────────────────────────────────────────────────
DEV_DEFAULT_USER_EMAIL = env("DEV_DEFAULT_USER_EMAIL")
