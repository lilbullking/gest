from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User
from .serializers import RegisterSerializer, UserSerializer, CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    """Permite registrar una nueva empresa (Tenant) y su primer usuario Administrador."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class CustomTokenObtainPairView(TokenObtainPairView):
    """Autentica a un usuario y retorna los tokens JWT con metadatos del Tenant y Rol."""
    serializer_class = CustomTokenObtainPairSerializer


class UserProfileView(generics.RetrieveAPIView):
    """Retorna la información del usuario autenticado."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class TenantUsersView(APIView):
    """Gestión de usuarios dentro del mismo Tenant (Multi-tenant)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.tenant:
            return Response({"error": "El usuario no pertenece a ningún Tenant."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Filtro estricto explícito por Tenant de la sesión del usuario
        users = User.objects.filter(tenant=request.user.tenant)
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Control de Acceso basado en Roles (RBAC)
        if request.user.role != 'admin':
            return Response({"error": "Acceso denegado. Se requiere rol de Administrador."}, status=status.HTTP_403_FORBIDDEN)
        
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        role = request.data.get('role', 'employee')

        if not email or not password:
            return Response({"error": "Debe proporcionar correo electrónico y contraseña."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({"error": "Este correo electrónico ya está registrado."}, status=status.HTTP_400_BAD_REQUEST)

        if role not in ['admin', 'hr', 'employee', 'auditor']:
            return Response({"error": "Rol no válido."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            email=email,
            username=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            tenant=request.user.tenant,
            role=role
        )
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
