import uuid
import threading
from django.db import models
from django.contrib.auth.models import AbstractUser

# Almacenamiento local del hilo para el contexto del Tenant actual
_thread_locals = threading.local()

def get_current_tenant():
    """Obtiene el tenant asignado al hilo actual."""
    return getattr(_thread_locals, 'tenant', None)

def set_current_tenant(tenant):
    """Establece el tenant para el hilo actual."""
    _thread_locals.tenant = tenant

def clear_current_tenant():
    """Limpia el tenant del hilo actual."""
    if hasattr(_thread_locals, 'tenant'):
        del _thread_locals.tenant


class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    tax_id = models.CharField(max_length=50, unique=True)
    domain = models.CharField(max_length=100, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, null=True, blank=True, related_name='users')
    role = models.CharField(max_length=50, default='employee') # admin, hr, employee, auditor
    
    # Redefinir email como único
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)

    # Configuración de Django
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    # Resolver conflicto de grupos y permisos
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='nubcore_user_groups',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='nubcore_user_permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )

    def __str__(self):
        return f"{self.email} ({self.tenant.name if self.tenant else 'No Tenant'})"


class TenantManager(models.Manager):
    """Manager personalizado para filtrar automáticamente consultas por Tenant."""
    def get_queryset(self):
        tenant = get_current_tenant()
        queryset = super().get_queryset()
        if tenant:
            return queryset.filter(tenant=tenant)
        return queryset


class TenantModel(models.Model):
    """Modelo abstracto que todos los modelos Multi-tenant deben heredar."""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)

    objects = TenantManager()
    unfiltered_objects = models.Manager()

    class Meta:
        abstract = True
