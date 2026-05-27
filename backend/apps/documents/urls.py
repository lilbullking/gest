from django.urls import path
from .views import (
    DocumentListCreateView, 
    DocumentDetailView, 
    DocumentUploadNewVersionView, 
    DocumentVersionsHistoryView,
    AuditLogsListView
)

urlpatterns = [
    path('', DocumentListCreateView.as_view(), name='document_list_create'),
    path('<uuid:id>/', DocumentDetailView.as_view(), name='document_detail'),
    path('<uuid:id>/new-version/', DocumentUploadNewVersionView.as_view(), name='document_new_version'),
    path('<uuid:id>/versions/', DocumentVersionsHistoryView.as_view(), name='document_versions_history'),
    path('audit-logs/', AuditLogsListView.as_view(), name='audit_logs_list'),
]
