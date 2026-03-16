"""
Serializers for Sede (Branch) management
"""
from rest_framework import serializers
from .models import Sede


class SedeSerializer(serializers.ModelSerializer):
    """
    Full serializer for Sede — used in admin management views
    """
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Sede
        fields = (
            'id',
            'name',
            'address',
            'phone',
            'is_active',
            'user_count',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'user_count', 'created_at', 'updated_at')

    def get_user_count(self, obj):
        return obj.users.filter(is_active=True).count()


class SedeMinimalSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for Sede — used inside UserSerializer
    """
    class Meta:
        model = Sede
        fields = ('id', 'name', 'address', 'phone')
