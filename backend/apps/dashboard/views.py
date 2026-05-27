from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from apps.documents.models import Document, AuditLog
from apps.documents.serializers import AuditLogSerializer
from apps.authentication.models import User

class DashboardKPIsView(APIView):
    """Retorna métricas agregadas e indicadores clave para el Dashboard corporativo (Multi-tenant)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # 1. KPIs Básicos (El TenantManager filtra automáticamente por tenant de forma implícita)
        active_docs = Document.objects.filter(is_archived=False)
        total_documents = active_docs.count()
        
        total_size = active_docs.aggregate(total=Sum('file_size'))['total'] or 0
        pending_ocr = active_docs.filter(ocr_status__in=['pending', 'processing']).count()
        
        # Usuarios activos
        total_users = User.objects.filter(tenant=request.user.tenant, is_active=True).count()

        # 2. Distribución de Documentos por Categoría
        category_counts = (
            active_docs.values('category')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        categories_distribution = {item['category']: item['count'] for item in category_counts}

        # 3. Tendencia de Subidas Mensuales (últimos 6 meses)
        monthly_trend = (
            active_docs.annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')[:6]
        )
        monthly_uploads = [
            {
                "month": item['month'].strftime("%b %Y") if item['month'] else "N/A",
                "count": item['count']
            }
            for item in monthly_trend
        ]

        # 4. Actividad Reciente (Últimos 5 logs de auditoría)
        recent_logs = AuditLog.objects.all().order_by('-created_at')[:6]
        recent_activity = AuditLogSerializer(recent_logs, many=True).data

        # 5. Estructura de Respuesta
        data = {
            "kpis": {
                "total_documents": total_documents,
                "total_size_bytes": total_size,
                "pending_ocr": pending_ocr,
                "active_users": total_users
            },
            "categories_distribution": categories_distribution,
            "monthly_uploads": monthly_uploads,
            "recent_activity": recent_activity
        }
        
        return Response(data)
