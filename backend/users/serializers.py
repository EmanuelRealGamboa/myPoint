"""
Serializers for User Authentication and Management
"""
from rest_framework import serializers
from .models import CustomUser, Turno, LoginAuditLog
from branches.serializers import SedeMinimalSerializer

# Roles that REQUIRE a sede assignment
ROLES_CON_SEDE_OBLIGATORIA = [
    CustomUser.Role.ENCARGADO,
    CustomUser.Role.WORKER,
    CustomUser.Role.CASHIER,
]


# ─── User ─────────────────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    sede = SedeMinimalSerializer(read_only=True)

    class Meta:
        model = CustomUser
        fields = ('id', 'email', 'first_name', 'last_name', 'full_name',
                  'phone', 'role', 'sede', 'is_active', 'created_at',
                  'login_attempts', 'locked_until', 'unlock_requested')
        read_only_fields = ('id', 'created_at', 'login_attempts', 'locked_until', 'unlock_requested')

    def get_full_name(self, obj):
        return obj.get_full_name()


class LoginSerializer(serializers.Serializer):
    """Validates login fields only. Auth logic lives in LoginView."""
    email    = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})


class UserCreateSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, required=True,
                                             style={'input_type': 'password'}, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True,
                                             style={'input_type': 'password'})

    class Meta:
        model  = CustomUser
        fields = ('email', 'first_name', 'last_name', 'phone', 'role', 'sede', 'password', 'password_confirm')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Las contraseñas no coinciden.'})
        role = attrs.get('role')
        sede = attrs.get('sede')
        if role in ROLES_CON_SEDE_OBLIGATORIA and not sede:
            raise serializers.ValidationError(
                {'sede': 'Encargados, trabajadores y cajeros deben tener una sede asignada.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        return CustomUser.objects.create_user(password=password, **validated_data)


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CustomUser
        fields = ('first_name', 'last_name', 'phone', 'role', 'sede', 'is_active')

    def validate(self, attrs):
        role = attrs.get('role', self.instance.role if self.instance else None)
        sede = attrs.get('sede', self.instance.sede if self.instance else None)
        if role in ROLES_CON_SEDE_OBLIGATORIA and not sede:
            raise serializers.ValidationError(
                {'sede': 'Encargados, trabajadores y cajeros deben tener una sede asignada.'})
        return attrs


# ─── Turno ────────────────────────────────────────────────────────────────────

class TurnoSerializer(serializers.ModelSerializer):
    dia_semana_display = serializers.CharField(source='get_dia_semana_display', read_only=True)
    user_name          = serializers.CharField(source='user.get_full_name', read_only=True)
    user_role          = serializers.CharField(source='user.role', read_only=True)
    sede_name          = serializers.CharField(source='sede.name', read_only=True)

    class Meta:
        model  = Turno
        fields = ('id', 'user', 'user_name', 'user_role',
                  'sede', 'sede_name',
                  'dia_semana', 'dia_semana_display',
                  'hora_inicio', 'hora_fin', 'is_active')
        read_only_fields = ('id',)

    def validate(self, attrs):
        user = attrs.get('user', self.instance.user if self.instance else None)
        sede = attrs.get('sede', self.instance.sede if self.instance else None)

        if user and sede and user.sede_id and user.sede_id != sede.id:
            raise serializers.ValidationError({'sede': 'El empleado no pertenece a esta sede.'})

        hora_inicio = attrs.get('hora_inicio', self.instance.hora_inicio if self.instance else None)
        hora_fin    = attrs.get('hora_fin', self.instance.hora_fin if self.instance else None)
        if hora_inicio and hora_fin and hora_fin <= hora_inicio:
            raise serializers.ValidationError(
                {'hora_fin': 'La hora de salida debe ser posterior a la hora de entrada.'})

        return attrs


# ─── LoginAuditLog ────────────────────────────────────────────────────────────

class LoginAuditLogSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model  = LoginAuditLog
        fields = ('id', 'event_type', 'event_type_display', 'email',
                  'ip_address', 'timestamp', 'details')
