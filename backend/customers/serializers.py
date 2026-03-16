from rest_framework import serializers
from users.models import CustomUser
from .models import ClienteProfile


class ClienteRegistroSerializer(serializers.Serializer):
    """Used for public registration endpoint."""
    first_name = serializers.CharField(max_length=150)
    last_name  = serializers.CharField(max_length=150)
    email      = serializers.EmailField()
    password   = serializers.CharField(min_length=6, write_only=True)
    telefono   = serializers.CharField(max_length=20, required=False, allow_blank=True)
    fecha_nac  = serializers.DateField(required=False, allow_null=True)

    def validate_email(self, value):
        if CustomUser.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError('Ya existe una cuenta con este email.')
        return value.lower()

    def create(self, validated_data):
        telefono  = validated_data.pop('telefono', '')
        fecha_nac = validated_data.pop('fecha_nac', None)
        password  = validated_data.pop('password')

        user = CustomUser.objects.create_user(
            role='CUSTOMER',
            is_active=True,
            **validated_data,
        )
        user.set_password(password)
        user.save()

        ClienteProfile.objects.create(
            usuario=user,
            telefono=telefono or '',
            fecha_nac=fecha_nac,
        )
        return user


class ClienteProfileSerializer(serializers.ModelSerializer):
    email      = serializers.EmailField(source='usuario.email', read_only=True)
    first_name = serializers.CharField(source='usuario.first_name')
    last_name  = serializers.CharField(source='usuario.last_name')
    qr_token   = serializers.UUIDField(read_only=True)

    class Meta:
        model = ClienteProfile
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'telefono', 'fecha_nac', 'foto_url', 'puntos', 'qr_token', 'created_at',
        ]
        read_only_fields = ['id', 'puntos', 'qr_token', 'created_at']

    def update(self, instance, validated_data):
        usuario_data = validated_data.pop('usuario', {})
        if 'first_name' in usuario_data:
            instance.usuario.first_name = usuario_data['first_name']
        if 'last_name' in usuario_data:
            instance.usuario.last_name = usuario_data['last_name']
        instance.usuario.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ClienteBusquedaSerializer(serializers.ModelSerializer):
    """Lightweight serializer used by POS to find customers."""
    nombre = serializers.SerializerMethodField()
    email  = serializers.EmailField(source='usuario.email', read_only=True)

    class Meta:
        model = ClienteProfile
        fields = ['id', 'nombre', 'email', 'telefono', 'foto_url', 'puntos', 'qr_token']

    def get_nombre(self, obj):
        return obj.usuario.get_full_name()
