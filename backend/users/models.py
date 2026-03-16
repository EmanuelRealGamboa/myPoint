"""
Custom User Model for MotoQFox POS System
"""
import uuid
from datetime import timedelta
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'ADMINISTRATOR')
        if extra_fields.get('is_staff') is not True:
            raise ValueError('El superusuario debe tener is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('El superusuario debe tener is_superuser=True')
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMINISTRATOR  = 'ADMINISTRATOR',  'Administrador'
        ENCARGADO      = 'ENCARGADO',      'Encargado de Sede'
        JEFE_MECANICO  = 'JEFE_MECANICO',  'Jefe de Mecánicos'
        MECANICO       = 'MECANICO',       'Mecánico'
        WORKER         = 'WORKER',         'Trabajador'
        CASHIER        = 'CASHIER',        'Cajero'
        CUSTOMER       = 'CUSTOMER',       'Cliente'

    id         = models.AutoField(primary_key=True)
    email      = models.EmailField(verbose_name='Correo electrónico', max_length=255, unique=True, db_index=True)
    first_name = models.CharField(verbose_name='Nombre(s)', max_length=150)
    last_name  = models.CharField(verbose_name='Apellidos', max_length=150)
    phone      = models.CharField(verbose_name='Teléfono', max_length=20, blank=True, default='')
    role       = models.CharField(verbose_name='Rol', max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    sede       = models.ForeignKey(
        'branches.Sede',
        verbose_name='Sede',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='users'
    )
    is_active    = models.BooleanField(verbose_name='Activo', default=True)
    is_staff     = models.BooleanField(verbose_name='Es staff', default=False)
    is_superuser = models.BooleanField(verbose_name='Es superusuario', default=False)
    created_at   = models.DateTimeField(verbose_name='Fecha de creación', default=timezone.now)
    updated_at   = models.DateTimeField(verbose_name='Fecha de actualización', auto_now=True)

    # ── Security: login lockout ────────────────────────────────────────────
    login_attempts   = models.IntegerField(verbose_name='Intentos fallidos', default=0)
    locked_until     = models.DateTimeField(verbose_name='Bloqueado hasta', null=True, blank=True)
    unlock_requested = models.BooleanField(verbose_name='Solicitud de desbloqueo', default=False)

    objects = CustomUserManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email} - {self.get_role_display()}"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name

    def is_locked(self):
        """Return True if the account is currently locked."""
        return bool(self.locked_until and self.locked_until > timezone.now())

    def lock(self, minutes=30):
        """Lock the account for `minutes` minutes."""
        self.locked_until = timezone.now() + timedelta(minutes=minutes)
        self.save(update_fields=['locked_until', 'login_attempts', 'unlock_requested'])

    def unlock(self):
        """Clear lockout and reset counters."""
        self.login_attempts   = 0
        self.locked_until     = None
        self.unlock_requested = False
        self.save(update_fields=['login_attempts', 'locked_until', 'unlock_requested'])

    # ── Role helpers ──────────────────────────────────────────────────────
    @property
    def is_administrator(self):
        return self.role == self.Role.ADMINISTRATOR

    @property
    def is_encargado(self):
        return self.role == self.Role.ENCARGADO

    @property
    def is_worker(self):
        return self.role == self.Role.WORKER

    @property
    def is_cashier(self):
        return self.role == self.Role.CASHIER

    @property
    def is_customer(self):
        return self.role == self.Role.CUSTOMER

    @property
    def is_jefe_mecanico(self):
        return self.role == self.Role.JEFE_MECANICO

    @property
    def is_mecanico(self):
        return self.role == self.Role.MECANICO

    @property
    def can_manage_sede(self):
        """True for roles that manage a specific sede (not global admins)."""
        return self.role in (
            self.Role.ENCARGADO, self.Role.JEFE_MECANICO,
            self.Role.MECANICO, self.Role.WORKER, self.Role.CASHIER
        )


# ─────────────────────────────────────────────────────────────────────────────
#  TURNO — Weekly work schedule for an employee
# ─────────────────────────────────────────────────────────────────────────────

class Turno(models.Model):
    """
    Represents a recurring weekly shift for a user at a given sede.
    dia_semana follows Python's weekday(): 0=Monday … 6=Sunday.
    """

    class DiaSemana(models.IntegerChoices):
        LUNES     = 0, 'Lunes'
        MARTES    = 1, 'Martes'
        MIERCOLES = 2, 'Miércoles'
        JUEVES    = 3, 'Jueves'
        VIERNES   = 4, 'Viernes'
        SABADO    = 5, 'Sábado'
        DOMINGO   = 6, 'Domingo'

    user       = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='turnos',
        verbose_name='Empleado'
    )
    sede       = models.ForeignKey(
        'branches.Sede',
        on_delete=models.CASCADE,
        related_name='turnos',
        verbose_name='Sede'
    )
    dia_semana  = models.IntegerField(choices=DiaSemana.choices, verbose_name='Día de la semana')
    hora_inicio = models.TimeField(verbose_name='Hora de entrada')
    hora_fin    = models.TimeField(verbose_name='Hora de salida')
    is_active   = models.BooleanField(default=True, verbose_name='Activo')

    class Meta:
        db_table = 'users_turnos'
        unique_together = ('user', 'dia_semana')
        ordering = ['dia_semana', 'hora_inicio']
        verbose_name = 'Turno'
        verbose_name_plural = 'Turnos'

    def __str__(self):
        dia = self.DiaSemana(self.dia_semana).label
        return f'{self.user.get_full_name()} — {dia} {self.hora_inicio:%H:%M}–{self.hora_fin:%H:%M}'


# ─────────────────────────────────────────────────────────────────────────────
#  PASSWORD RESET TOKEN
# ─────────────────────────────────────────────────────────────────────────────

class PasswordResetToken(models.Model):
    """Single-use token for password reset. Expires after 1 hour."""
    user       = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='reset_tokens')
    token      = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used       = models.BooleanField(default=False)

    class Meta:
        db_table = 'users_password_reset_tokens'
        ordering = ['-created_at']
        verbose_name = 'Token de restablecimiento'
        verbose_name_plural = 'Tokens de restablecimiento'

    def is_valid(self):
        return not self.used and self.expires_at > timezone.now()

    def __str__(self):
        return f'{self.user.email} — {self.token} ({"usado" if self.used else "válido"})'


# ─────────────────────────────────────────────────────────────────────────────
#  LOGIN AUDIT LOG — Security event log
# ─────────────────────────────────────────────────────────────────────────────

class LoginAuditLog(models.Model):
    class EventType(models.TextChoices):
        LOGIN_SUCCESS       = 'LOGIN_SUCCESS',       'Inicio de sesión exitoso'
        LOGIN_FAILED        = 'LOGIN_FAILED',        'Intento fallido'
        ACCOUNT_LOCKED      = 'ACCOUNT_LOCKED',      'Cuenta bloqueada'
        ACCOUNT_UNLOCKED    = 'ACCOUNT_UNLOCKED',    'Cuenta desbloqueada'
        UNLOCK_REQUESTED    = 'UNLOCK_REQUESTED',    'Solicitud de desbloqueo'
        PASSWORD_RESET_REQ  = 'PASSWORD_RESET_REQ',  'Solicitud de restablecimiento'
        PASSWORD_RESET_DONE = 'PASSWORD_RESET_DONE', 'Contraseña restablecida'

    event_type = models.CharField(
        max_length=30, choices=EventType.choices,
        verbose_name='Tipo de evento'
    )
    email      = models.EmailField(verbose_name='Correo')
    user       = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='audit_logs',
        verbose_name='Usuario'
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP')
    timestamp  = models.DateTimeField(auto_now_add=True, verbose_name='Fecha y hora')
    details    = models.TextField(blank=True, default='', verbose_name='Detalles')

    class Meta:
        db_table = 'users_login_audit_log'
        ordering = ['-timestamp']
        verbose_name = 'Registro de acceso'
        verbose_name_plural = 'Registros de acceso'

    def __str__(self):
        return f'[{self.timestamp:%Y-%m-%d %H:%M}] {self.event_type} — {self.email}'
