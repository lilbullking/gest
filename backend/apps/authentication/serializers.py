from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Tenant, User

class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'tax_id', 'domain', 'created_at', 'is_active']


class UserSerializer(serializers.ModelSerializer):
    tenant = TenantSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'tenant']


class RegisterSerializer(serializers.Serializer):
    company_name = serializers.CharField(max_length=255)
    tax_id = serializers.CharField(max_length=50)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)

    def validate_tax_id(self, value):
        if Tenant.objects.filter(tax_id=value).exists():
            raise serializers.ValidationError("Esta empresa ya se encuentra registrada.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este correo electrónico ya está registrado.")
        return value

    def create(self, validated_data):
        # Crear la empresa (Tenant)
        tenant = Tenant.objects.create(
            name=validated_data['company_name'],
            tax_id=validated_data['tax_id']
        )
        # Crear el usuario Administrador
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            tenant=tenant,
            role='admin'
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['tenant_id'] = str(user.tenant.id) if user.tenant else None
        token['email'] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': str(self.user.id),
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'role': self.user.role,
            'tenant': {
                'id': str(self.user.tenant.id) if self.user.tenant else None,
                'name': self.user.tenant.name if self.user.tenant else None,
                'tax_id': self.user.tenant.tax_id if self.user.tenant else None,
            }
        }
        return data
