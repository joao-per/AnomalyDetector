"""
HTTP API for the React frontend. Thin controllers — all logic lives in
api/services/anomalies.py. Responses are clean camelCase JSON.
"""
from __future__ import annotations

from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth import get_user_email
from .services import anomalies as svc


class HealthView(APIView):
    def get(self, request):
        return Response({"status": "ok", "service": "anomaly-bff", "phase": 1})


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


class AnomalyRetrainView(APIView):
    def post(self, request, guid: str):
        return Response(svc.retrain_anomaly(guid))


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
                guid, draft=draft, target_email=target, user=get_user_email(request)
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
                guid, draft=draft, target_email=target, user=get_user_email(request)
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
