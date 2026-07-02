"""
User identity — Entra ID SSO with a Phase-1 fallback.

Two modes, switched by ENTRA_AUTH_ENABLED:

- **Entra SSO (production).** The frontend signs the user in with MSAL and sends
  an Entra-issued access token as `Authorization: Bearer …`. We validate the
  signature against the tenant's JWKS, plus issuer/audience/expiry, and take the
  acting user from the token's preferred_username/email/upn claim. Enforced on
  every endpoint via the `EntraAuthentication` DRF class (see settings).

- **Phase-1 fallback (local dev).** The acting user's email arrives in the
  `X-User-Email` header (or DEV_DEFAULT_USER_EMAIL). Not secure — a client can
  claim any identity — so never run production with ENTRA_AUTH_ENABLED=false.
"""
from __future__ import annotations

import threading

import jwt
from django.conf import settings
from jwt import PyJWKClient
from rest_framework.authentication import (
    BaseAuthentication,
    SessionAuthentication as DRFSessionAuthentication,
)
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework.permissions import BasePermission

_jwks_lock = threading.Lock()
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    """Tenant JWKS client, shared across requests (PyJWKClient caches the keys)."""
    global _jwks_client
    with _jwks_lock:
        if _jwks_client is None:
            _jwks_client = PyJWKClient(
                "https://login.microsoftonline.com/"
                f"{settings.ENTRA_TENANT_ID}/discovery/v2.0/keys",
                cache_keys=True,
            )
        return _jwks_client


def _validate_bearer(request) -> str:
    """Validate the Entra access token and return the user's email/UPN."""
    if not settings.ENTRA_API_AUDIENCE:
        raise AuthenticationFailed(
            "ENTRA_AUTH_ENABLED is on but ENTRA_API_AUDIENCE is not configured."
        )
    header = request.headers.get("Authorization") or ""
    if not header.startswith("Bearer "):
        raise AuthenticationFailed(
            "Missing Bearer token — sign in via Entra ID (SSO is enabled)."
        )
    token = header[len("Bearer "):].strip()

    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.ENTRA_API_AUDIENCE,
            options={"require": ["exp", "iss", "aud"]},
        )
    except jwt.PyJWTError as exc:
        raise AuthenticationFailed(f"Invalid Entra token: {exc}") from exc

    tenant = settings.ENTRA_TENANT_ID
    allowed_issuers = {
        f"https://login.microsoftonline.com/{tenant}/v2.0",  # v2 tokens
        f"https://sts.windows.net/{tenant}/",                # v1 tokens
    }
    if claims.get("iss") not in allowed_issuers:
        raise AuthenticationFailed("Token was issued by an unexpected tenant.")

    email = (
        claims.get("preferred_username") or claims.get("email") or claims.get("upn")
    )
    if not email:
        raise AuthenticationFailed("Token carries no email/UPN claim.")
    return str(email).strip()


class _ApiUser:
    """Minimal request.user for DRF — we have no Django user model for SSO users."""

    is_authenticated = True

    def __init__(self, email: str) -> None:
        self.email = email
        self.username = email

    def __str__(self) -> str:
        return self.email


class EntraAuthentication(BaseAuthentication):
    """DRF authentication class: enforces a valid Entra token on every request
    while ENTRA_AUTH_ENABLED; a no-op in Phase-1 fallback mode."""

    def authenticate(self, request):
        if not settings.ENTRA_AUTH_ENABLED:
            return None
        return (_ApiUser(_validate_bearer(request)), None)

    def authenticate_header(self, request):  # → 401 (not 403) on failure
        return "Bearer"


class SessionAuthentication(DRFSessionAuthentication):
    """Django login-session auth for the SPA (see LoginView/LogoutView).

    CSRF enforcement is skipped: the session cookie is SameSite=Lax, so
    cross-site POSTs never carry it in the first place, and the SPA talks to
    this API from a different origin (port) without a CSRF token exchange."""

    def enforce_csrf(self, request):
        return


class LoginRequired(BasePermission):
    """Locks every endpoint behind a signed-in user (login session or Entra
    token) while LOGIN_REQUIRED is on. Health + auth endpoints opt out via
    `permission_classes = []`."""

    message = "Sign in required."

    def has_permission(self, request, view):
        if not settings.LOGIN_REQUIRED:
            return True
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated)


def get_user_email(request) -> str:
    """The acting user's email for signature keys, flow calls and email sending."""
    if settings.ENTRA_AUTH_ENABLED:
        email = getattr(getattr(request, "user", None), "email", "")
        return email or _validate_bearer(request)

    user = getattr(request, "user", None)
    if user is not None and getattr(user, "is_authenticated", False):
        email = (getattr(user, "email", "") or getattr(user, "username", "")).strip()
        if email:
            return email

    email = request.headers.get("X-User-Email") or settings.DEV_DEFAULT_USER_EMAIL
    if not email:
        raise PermissionDenied(
            "No user identity. Sign in (or send the 'X-User-Email' header / set "
            "DEV_DEFAULT_USER_EMAIL for local dev)."
        )
    return email.strip()
