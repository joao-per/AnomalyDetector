"""
HTTP API for the React frontend. Thin controllers — all logic lives in
api/services/anomalies.py. Responses are clean camelCase JSON.
"""
from __future__ import annotations

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth import get_user_email
from .services import anomalies as svc


class HealthView(APIView):
    authentication_classes = []  # stays reachable for monitoring even with SSO on
    permission_classes = []

    def get(self, request):
        return Response({"status": "ok", "service": "anomaly-bff", "phase": 1})


# ── Session auth (Django login) ──────────────────────────────────────────────
def _me_payload(user) -> dict:
    name = ""
    get_full_name = getattr(user, "get_full_name", None)
    if callable(get_full_name):
        name = (get_full_name() or "").strip()
    return {
        "email": getattr(user, "email", "") or getattr(user, "username", ""),
        "username": getattr(user, "username", ""),
        "name": name or None,
    }


class LoginView(APIView):
    permission_classes = []  # reachable while signed out, obviously

    def post(self, request):
        data = request.data or {}
        identifier = (data.get("email") or data.get("username") or "").strip()
        password = data.get("password") or ""
        if not identifier or not password:
            raise ValidationError({"detail": "Email and password are required."})

        user = authenticate(request, username=identifier, password=password)
        if user is None and "@" in identifier:
            # Accounts are usually keyed by email — allow logging in with it.
            match = User.objects.filter(email__iexact=identifier).first()
            if match:
                user = authenticate(request, username=match.username, password=password)
        if user is None:
            return Response({"detail": "Invalid email or password."}, status=401)

        login(request, user)
        return Response(_me_payload(user))


class LogoutView(APIView):
    permission_classes = []

    def post(self, request):
        logout(request)
        return Response({"loggedOut": True})


class MeView(APIView):
    permission_classes = []  # answers 401 itself so the SPA can probe quietly

    def get(self, request):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return Response({"detail": "Not signed in."}, status=401)
        return Response(_me_payload(user))


class AnomalyListView(APIView):
    def get(self, request):
        status = request.query_params.get("status")
        return Response(svc.list_anomalies(status=status))


class AnomalyDetailView(APIView):
    def get(self, request, guid: str):
        return Response(svc.get_anomaly(guid))


class AnomalyCloseView(APIView):
    def post(self, request, guid: str):
        comment = (request.data or {}).get("comment", "")
        return Response(
            svc.close_anomaly(guid, comment=comment, user=get_user_email(request))
        )


class AnomalyUntrainView(APIView):
    def post(self, request, guid: str):
        comment = (request.data or {}).get("comment", "")
        return Response(
            svc.untrain_anomaly(guid, comment=comment, user=get_user_email(request))
        )


class AnomalyCancelView(APIView):
    def post(self, request, guid: str):
        comment = (request.data or {}).get("comment", "")
        return Response(
            svc.cancel_anomaly(guid, comment=comment, user=get_user_email(request))
        )


class AnomalyRetrainView(APIView):
    def post(self, request, guid: str):
        return Response(svc.retrain_anomaly(guid, user=get_user_email(request)))


class AnomalyGenerateEmailView(APIView):
    def post(self, request, guid: str):
        internal = bool((request.data or {}).get("internal", False))
        return Response(svc.generate_email(guid, internal=internal))


class AnomalySendVendorEmailView(APIView):
    def post(self, request, guid: str):
        data = request.data or {}
        draft = data.get("draft", "")
        target = data.get("targetEmail")
        if not target:
            raise ValidationError({"targetEmail": "Required."})
        return Response(
            svc.send_vendor_email(
                guid,
                draft=draft,
                target_email=target,
                user=get_user_email(request),
                subject=data.get("subject", ""),
            )
        )


class AnomalySendInternalEmailView(APIView):
    def post(self, request, guid: str):
        data = request.data or {}
        draft = data.get("draft", "")
        target = data.get("targetEmail")
        if not target:
            raise ValidationError({"targetEmail": "Required."})
        return Response(
            svc.send_internal_email(
                guid,
                draft=draft,
                target_email=target,
                user=get_user_email(request),
                subject=data.get("subject", ""),
            )
        )


class SupplierListView(APIView):
    def get(self, request):
        return Response(svc.list_suppliers())


class SignatureView(APIView):
    def get(self, request):
        return Response(svc.get_signature(get_user_email(request)))

    def put(self, request, *args, **kwargs):
        signature = (request.data or {}).get("signature", "")
        return Response(svc.set_signature(get_user_email(request), signature))
