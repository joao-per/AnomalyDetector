from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.HealthView.as_view()),

    # Session auth (Django login)
    path("auth/login/", views.LoginView.as_view()),
    path("auth/logout/", views.LogoutView.as_view()),
    path("auth/me/", views.MeView.as_view()),

    # Anomalies
    path("anomalies/", views.AnomalyListView.as_view()),
    path("anomalies/<str:guid>/", views.AnomalyDetailView.as_view()),
    path("anomalies/<str:guid>/close/", views.AnomalyCloseView.as_view()),
    path("anomalies/<str:guid>/untrain/", views.AnomalyUntrainView.as_view()),
    path("anomalies/<str:guid>/retrain/", views.AnomalyRetrainView.as_view()),
    path("anomalies/<str:guid>/generate-email/", views.AnomalyGenerateEmailView.as_view()),
    path("anomalies/<str:guid>/send-vendor-email/", views.AnomalySendVendorEmailView.as_view()),
    path("anomalies/<str:guid>/send-internal-email/", views.AnomalySendInternalEmailView.as_view()),

    # Suppliers
    path("suppliers/", views.SupplierListView.as_view()),

    # Current user's signature
    path("me/signature/", views.SignatureView.as_view()),
]
