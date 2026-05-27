import os
import uuid
from django.db import models
from apps.authentication.models import TenantModel, User

def document_upload_path(instance, filename):
    """Genera la ruta de almacenamiento de archivos organizada por Tenant."""
    ext = filename.split('.')[-1]
    name = f"{uuid.uuid4()}.{ext}"
    return os.path.join(f"tenants_{instance.tenant.id}", "documents", name)

def version_upload_path(instance, filename):
    """Genera la ruta de almacenamiento de versiones anteriores organizada por Tenant."""
    ext = filename.split('.')[-1]
    name = f"{uuid.uuid4()}.{ext}"
    return os.path.join(f"tenants_{instance.document.tenant.id}", "versions", name)


class Document(TenantModel):
    """Modelo principal de Documento con soporte Multi-tenant."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_documents')
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to=document_upload_path)
    file_size = models.IntegerField()  # en bytes
    file_type = models.CharField(max_length=100)  # pdf, png, jpeg, docx, etc.
    category = models.CharField(max_length=100, default='unclassified')  # contrato, liquidacion, etc.
    ocr_status = models.CharField(max_length=50, default='pending')  # pending, completed, failed
    extracted_text = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    version = models.IntegerField(default=1)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.category}"


class DocumentVersion(models.Model):
    """Historial de versiones de un documento."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='versions')
    version = models.IntegerField()
    file = models.FileField(upload_to=version_upload_path)
    file_size = models.IntegerField()
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    change_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.document.title} - v{self.version}"


class AuditLog(TenantModel):
    """Registro de auditoría obligatorio para seguridad y cumplimiento."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=100)  # CREATE, READ, UPDATE, DELETE, DOWNLOAD, LOGIN
    resource_type = models.CharField(max_length=100)  # DOCUMENT, USER, TENANT
    resource_id = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.action}] - {self.resource_type} - {self.created_at}"
