from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import set_current_tenant, clear_current_tenant

class TenantMiddleware(MiddlewareMixin):
    """
    Middleware para detectar el contexto del Tenant actual a partir de la sesión del usuario
    o de los headers de la API (Token JWT) y asignarlo al hilo de ejecución actual.
    """
    def process_request(self, request):
        # Limpiar cualquier tenant anterior para evitar fugas de información
        set_current_tenant(None)
        
        # Caso 1: Usuario ya autenticado mediante sesión estándar (ej. Django Admin)
        if request.user and request.user.is_authenticated:
            if hasattr(request.user, 'tenant') and request.user.tenant:
                set_current_tenant(request.user.tenant)
                return
        
        # Caso 2: Petición API REST con cabecera Authorization Bearer
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            try:
                jwt_authenticator = JWTAuthentication()
                raw_token = auth_header.split(' ')[1]
                validated_token = jwt_authenticator.get_validated_token(raw_token)
                user = jwt_authenticator.get_user(validated_token)
                if user and user.tenant:
                    request.user = user
                    set_current_tenant(user.tenant)
            except Exception:
                # Si el token es inválido o expiró, dejamos que DRF lance el 401 en la vista correspondientemente
                pass

    def process_response(self, request, response):
        # Limpiar el contexto al finalizar la petición
        clear_current_tenant()
        return response
    
    def process_exception(self, request, exception):
        # Asegurar limpieza incluso en caso de errores en la vista
        clear_current_tenant()
        return None
