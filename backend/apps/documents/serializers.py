from rest_framework import serializers
from .models import Document, DocumentVersion, AuditLog
from apps.authentication.serializers import UserSerializer

class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_detail = UserSerializer(source='uploaded_by', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'file', 'file_url', 'file_size', 'file_type', 
            'category', 'ocr_status', 'extracted_text', 'metadata', 
            'version', 'is_archived', 'created_at', 'updated_at',
            'uploaded_by_detail'
        ]
        read_only_fields = [
            'id', 'file_size', 'file_type', 'ocr_status', 
            'extracted_text', 'metadata', 'version', 'created_at', 
            'updated_at', 'uploaded_by_detail', 'file_url'
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and hasattr(obj.file, 'url'):
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class DocumentVersionSerializer(serializers.ModelSerializer):
    changed_by_detail = UserSerializer(source='changed_by', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentVersion
        fields = [
            'id', 'document', 'version', 'file', 'file_url', 'file_size', 
            'changed_by_detail', 'change_reason', 'created_at'
        ]
        read_only_fields = ['id', 'document', 'version', 'file_size', 'created_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and hasattr(obj.file, 'url'):
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class AuditLogSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_detail', 'action', 'resource_type', 
            'resource_id', 'ip_address', 'user_agent', 'created_at'
        ]
