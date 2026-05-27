import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nubcore_project.settings')
django.setup()

from apps.authentication.models import Tenant, User
from apps.documents.models import Document

def seed():
    print("Iniciando la siembra de la base de datos (Seeding)...")
    
    # Limpiar datos existentes
    Document.objects.all().delete()
    User.objects.all().delete()
    Tenant.objects.all().delete()
    
    # Crear Tenants
    tenant_alfa = Tenant.objects.create(
        name="Constructora Alfa S.A.",
        tax_id="76.123.456-K",
        domain="alfa.cl"
    )
    tenant_beta = Tenant.objects.create(
        name="Tecnología Beta Ltda.",
        tax_id="78.987.654-3",
        domain="beta.com"
    )
    
    # Crear usuarios de Alfa
    User.objects.create_user(
        email="carlos.admin@alfa.cl",
        username="carlos.admin@alfa.cl",
        password="password123",
        first_name="Carlos",
        last_name="González",
        role="admin",
        tenant=tenant_alfa
    )
    User.objects.create_user(
        email="maria.hr@alfa.cl",
        username="maria.hr@alfa.cl",
        password="password123",
        first_name="María",
        last_name="Rosas",
        role="hr",
        tenant=tenant_alfa
    )
    User.objects.create_user(
        email="juan.perez@alfa.cl",
        username="juan.perez@alfa.cl",
        password="password123",
        first_name="Juan",
        last_name="Pérez",
        role="employee",
        tenant=tenant_alfa
    )
    
    # Crear usuarios de Beta
    User.objects.create_user(
        email="sofia.ceo@beta.com",
        username="sofia.ceo@beta.com",
        password="password123",
        first_name="Sofía",
        last_name="Valenzuela",
        role="admin",
        tenant=tenant_beta
    )
    User.objects.create_user(
        email="patricia.hr@beta.com",
        username="patricia.hr@beta.com",
        password="password123",
        first_name="Patricia",
        last_name="Soto",
        role="hr",
        tenant=tenant_beta
    )
    User.objects.create_user(
        email="diego.dev@beta.com",
        username="diego.dev@beta.com",
        password="password123",
        first_name="Diego",
        last_name="Mendoza",
        role="employee",
        tenant=tenant_beta
    )
    
    print("Siembra completada con éxito.")

if __name__ == '__main__':
    seed()
