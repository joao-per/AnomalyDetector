"""
Phase-1 user identity.

Several actions need the acting user's email (the canvas app used `User().Email`):
the signature key, the 'user' argument to the status-change flows, and the sender
of generated emails. Until Entra SSO is wired, the frontend sends it in the
`X-User-Email` header, with an optional local-dev fallback.

PRODUCTION TODO: replace this with real auth — validate an Entra ID access token
(Authorization: Bearer ...) via MSAL/JWKS and read the verified email/UPN claim.
Do not trust a client-supplied header in production.
"""
from __future__ import annotations

from django.conf import settings
from rest_framework.exceptions import PermissionDenied


def get_user_email(request) -> str:
    email = request.headers.get("X-User-Email") or settings.DEV_DEFAULT_USER_EMAIL
    if not email:
        raise PermissionDenied(
            "No user identity. Send the 'X-User-Email' header "
            "(or set DEV_DEFAULT_USER_EMAIL for local dev)."
        )
    return email.strip()
