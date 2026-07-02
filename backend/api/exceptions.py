"""DRF exception handler that turns service errors into clean JSON responses."""
from __future__ import annotations

from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from .services.dataverse import DataverseError
from .services.flows import FlowError
from .services.graph import GraphError


class FeatureNotEnabled(APIException):
    """A capability that exists in code but is intentionally switched off (e.g. email)."""

    status_code = 501
    default_detail = "This action is not enabled yet."
    default_code = "feature_not_enabled"


def api_exception_handler(exc, context):
    if isinstance(exc, DataverseError):
        return Response(
            {"error": "dataverse_error", "message": str(exc), "detail": exc.detail},
            status=exc.status or 502,
        )
    if isinstance(exc, FlowError):
        return Response(
            {"error": "flow_error", "message": str(exc), "detail": exc.detail},
            status=exc.status or 502,
        )
    if isinstance(exc, GraphError):
        return Response(
            {"error": "graph_error", "message": str(exc), "detail": exc.detail},
            status=exc.status or 502,
        )
    return drf_exception_handler(exc, context)
