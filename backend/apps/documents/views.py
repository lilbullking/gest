import os
import threading
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Document, DocumentVersion, AuditLog
from .serializers import DocumentSerializer, DocumentVersionSerializer, AuditLogSerializer
from apps.authentication.models import get_current_tenant
from apps.core_processing.services.ocr_service import process_file_content
from apps.core_processing.services.ai_classifier import classify_and_extract

def record_audit_log(request, action, resource_type, resource_id):
    """Registra una acción en el log de auditoría."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    tenant = get_current_tenant() or (request.user.tenant if request.user.is_authenticated else None)
    
    if tenant:
        AuditLog.objects.create(
            tenant=tenant,
            user=request.user if request.user.is_authenticated else None,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            ip_address=ip,
            user_agent=user_agent
        )

def async_process_document(document_id, file_path, file_name, tenant_id):
    """HILO DE FONDO: Ejecuta OCR y clasificación sin bloquear el servidor web."""
    from apps.authentication.models import set_current_tenant, Tenant
    from .models import Document
    
    try:
        # Configurar contexto del Tenant en este hilo
        tenant = Tenant.objects.get(id=tenant_id)
        set_current_tenant(tenant)
        
        # 1. OCR (Extracción de texto)
        text, status_ocr = process_file_content(file_path, file_name)
        
        # 2. IA Classifier (Clasificación e información)
        category = 'unclassified'
        metadata = {}
        if status_ocr == 'completed':
            category, metadata = classify_and_extract(text, file_name)
        
        # 3. Guardar en base de datos
        doc = Document.objects.get(id=document_id)
        doc.ocr_status = status_ocr
        doc.extracted_text = text
        doc.category = category
        doc.metadata = metadata
        doc.save()
        
    except Exception as e:
        try:
            doc = Document.objects.get(id=document_id)
            doc.ocr_status = 'failed'
            doc.metadata = {'error_message': str(e)}
            doc.save()
        except Exception:
            pass


class DocumentListCreateView(APIView):
    """Listar y crear documentos corporativos (Multi-tenant)."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        # Listar documentos del Tenant actual (filtrados automáticamente por el TenantManager)
        docs = Document.objects.filter(is_archived=False)
        
        # Filtros de búsqueda (por categoría o búsqueda libre en contenido OCR/título)
        category = request.query_params.get('category')
        q = request.query_params.get('q')
        
        if category:
            docs = docs.filter(category=category)
            
        if q:
            # Buscar en título o texto OCR extraído
            docs = docs.filter(title__icontains=q) | docs.filter(extracted_text__icontains=q)
            
        docs = docs.order_by('-created_at')
        serializer = DocumentSerializer(docs, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        file_obj = request.FILES.get('file')
        title = request.data.get('title')

        if not file_obj:
            return Response({"error": "Debe subir un archivo."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not title:
            title = file_obj.name

        # Validaciones de Tenant
        tenant = request.user.tenant
        if not tenant:
            return Response({"error": "Usuario sin Tenant asignado."}, status=status.HTTP_400_BAD_REQUEST)

        # Detectar tipo y peso
        file_size = file_obj.size
        ext = file_obj.name.split('.')[-1].lower()

        # Guardar en base de datos transaccionalmente
        with transaction.atomic():
            doc = Document.objects.create(
                tenant=tenant,
                uploaded_by=request.user,
                title=title,
                file=file_obj,
                file_size=file_size,
                file_type=ext,
                ocr_status='processing'
            )
        
        # Registrar en Auditoría
        record_audit_log(request, 'CREATE', 'DOCUMENT', doc.id)

        # Disparar hilo en segundo plano para OCR e IA
        file_path = doc.file.path
        threading.Thread(
            target=async_process_document,
            args=(doc.id, file_path, file_obj.name, tenant.id)
        ).start()

        serializer = DocumentSerializer(doc, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Ver, actualizar y eliminar/archivar un documento."""
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        # Filtrado automático por Tenant en el Manager
        return Document.objects.filter(is_archived=False)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Registrar lectura en auditoría
        record_audit_log(request, 'READ', 'DOCUMENT', instance.id)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        response = super().update(request, *args, **kwargs)
        # Registrar modificación en auditoría
        record_audit_log(request, 'UPDATE', 'DOCUMENT', instance.id)
        return response

    def perform_destroy(self, instance):
        # En vez de borrar físicamente, archivamos por auditoría
        instance.is_archived = True
        instance.save()
        # Registrar eliminación en auditoría
        record_audit_log(self.request, 'DELETE', 'DOCUMENT', instance.id)


class DocumentUploadNewVersionView(APIView):
    """Sube una nueva versión reemplazando el archivo principal del documento."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, id):
        doc = get_object_or_404(Document, id=id, is_archived=False)
        file_obj = request.FILES.get('file')
        change_reason = request.data.get('change_reason', 'Nueva versión subida')

        if not file_obj:
            return Response({"error": "Debe proporcionar un archivo."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Crear registro de versión anterior en la tabla de versiones
        with transaction.atomic():
            DocumentVersion.objects.create(
                document=doc,
                version=doc.version,
                file=doc.file,
                file_size=doc.file_size,
                changed_by=request.user,
                change_reason=change_reason
            )

            # 2. Reemplazar el archivo y actualizar los metadatos de la versión actual
            doc.file = file_obj
            doc.file_size = file_obj.size
            doc.file_type = file_obj.name.split('.')[-1].lower()
            doc.version += 1
            doc.ocr_status = 'processing'
            doc.save()

        # Registrar en Auditoría
        record_audit_log(request, 'UPLOAD_NEW_VERSION', 'DOCUMENT', doc.id)

        # Disparar procesamiento OCR de la nueva versión
        file_path = doc.file.path
        threading.Thread(
            target=async_process_document,
            args=(doc.id, file_path, file_obj.name, request.user.tenant.id)
        ).start()

        return Response(DocumentSerializer(doc, context={'request': request}).data, status=status.HTTP_200_OK)


class DocumentVersionsHistoryView(APIView):
    """Retorna el historial de versiones de un documento."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        doc = get_object_or_404(Document, id=id, is_archived=False)
        versions = doc.versions.all().order_by('-version')
        serializer = DocumentVersionSerializer(versions, many=True, context={'request': request})
        return Response(serializer.data)


class AuditLogsListView(APIView):
    """Muestra la lista de Logs de Auditoría (Solo administradores o auditores del Tenant)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ['admin', 'hr', 'auditor']:
            return Response({"error": "No posee permisos para ver registros de auditoría."}, status=status.HTTP_403_FORBIDDEN)
        
        logs = AuditLog.objects.all().order_by('-created_at')
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)
