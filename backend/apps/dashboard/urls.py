from django.urls import path
from .views import DashboardKPIsView

urlpatterns = [
    path('', DashboardKPIsView.as_view(), name='dashboard_kpis'),
]
