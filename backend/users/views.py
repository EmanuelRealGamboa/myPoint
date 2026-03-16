"""
Views for User Authentication and Management
"""
from datetime import timedelta
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.db.models import Q, F
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from .serializers import (
    LoginSerializer, UserSerializer, UserCreateSerializer,
    UserUpdateSerializer, TurnoSerializer, LoginAuditLogSerializer,
)
from .models import CustomUser, Turno, PasswordResetToken, LoginAuditLog

MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES    = 30


# ─── Audit log helper ──────────────────────────────────────────────────────────

def _log_event(event_type: str, email: str, user=None, request=None, details: str = '') -> None:
    """Create a LoginAuditLog entry. Never raises."""
    try:
        ip = None
        if request:
            xff = request.META.get('HTTP_X_FORWARDED_FOR')
            ip = xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')
        LoginAuditLog.objects.create(
            event_type=event_type,
            email=email,
            user=user,
            ip_address=ip,
            details=details,
        )
    except Exception:
        pass  # Never break the main flow due to logging failure


# ─── Email helpers ─────────────────────────────────────────────────────────────

def _send_welcome_email(user, plain_password: str) -> None:
    """Send welcome email with login credentials to the new user via Gmail."""
    from django.conf import settings

    sede_name = user.sede.name if user.sede else 'Sin sede asignada'
    role_display = user.get_role_display()

    subject = 'Bienvenido a MotoQFox - Tus credenciales de acceso'

    text_body = (
        f'Hola {user.get_full_name()},\n\n'
        f'Tu cuenta en el sistema MotoQFox ha sido creada exitosamente.\n\n'
        f'Tus credenciales de acceso son:\n'
        f'  Correo:     {user.email}\n'
        f'  Contrasena: {plain_password}\n'
        f'  Rol:        {role_display}\n'
        f'  Sede:       {sede_name}\n\n'
        f'Por seguridad, te recomendamos cambiar tu contrasena la proxima vez que ingreses.\n\n'
        f'Saludos,\nEquipo MotoQFox'
    )

    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;
                border:1px solid #e2e8f0;border-radius:12px;background:#fff;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#2d3748;font-size:22px;margin:0;">&#128693; MotoQFox</h1>
        <p style="color:#718096;margin:4px 0 0;font-size:14px;">Sistema de Inventario y POS</p>
      </div>

      <h2 style="color:#2d3748;font-size:18px;">Bienvenido, {user.get_full_name()}</h2>
      <p style="color:#4a5568;font-size:14px;">Tu cuenta ha sido creada exitosamente. Aqui estan tus credenciales:</p>

      <div style="background:#f7fafc;border-radius:8px;padding:16px 20px;margin:20px 0;
                  border-left:4px solid #4c51bf;">
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr>
            <td style="color:#718096;padding:4px 0;width:110px;">Correo:</td>
            <td style="color:#2d3748;font-weight:600;">{user.email}</td>
          </tr>
          <tr>
            <td style="color:#718096;padding:4px 0;">Contrasena:</td>
            <td style="color:#2d3748;font-weight:600;font-family:monospace;font-size:15px;">{plain_password}</td>
          </tr>
          <tr>
            <td style="color:#718096;padding:4px 0;">Rol:</td>
            <td style="color:#2d3748;font-weight:600;">{role_display}</td>
          </tr>
          <tr>
            <td style="color:#718096;padding:4px 0;">Sede:</td>
            <td style="color:#2d3748;font-weight:600;">{sede_name}</td>
          </tr>
        </table>
      </div>

      <p style="color:#e53e3e;font-size:13px;background:#fff5f5;padding:10px 14px;
                border-radius:6px;border:1px solid #fed7d7;">
        <strong>Importante:</strong> Guarda estas credenciales en un lugar seguro y
        cambia tu contrasena al iniciar sesion por primera vez.
      </p>

      <p style="color:#a0aec0;font-size:12px;text-align:center;margin-top:24px;">
        Este correo fue generado automaticamente por el sistema MotoQFox.<br>
        No respondas a este mensaje.
      </p>
    </div>
    """

    try:
        send_mail(
            subject=subject,
            message=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_body,
            fail_silently=False,
        )
        print(f'[EMAIL] Welcome email sent to {user.email}')
    except Exception as exc:
        print(f'[EMAIL ERROR] Could not send welcome email to {user.email}: {exc}')


def _send_reset_email(user, token_uuid) -> None:
    """Send password-reset link to user."""
    from django.conf import settings
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    reset_link   = f'{frontend_url}/reset-password?token={token_uuid}'

    subject = 'MotoQFox - Restablecer tu contraseña'

    text_body = (
        f'Hola {user.get_full_name()},\n\n'
        f'Recibimos una solicitud para restablecer la contrasena de tu cuenta ({user.email}).\n\n'
        f'Haz clic en el siguiente enlace para crear una nueva contrasena:\n'
        f'{reset_link}\n\n'
        f'Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este correo.\n\n'
        f'Saludos,\nEquipo MotoQFox'
    )

    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;
                border:1px solid #e2e8f0;border-radius:12px;background:#fff;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#2d3748;font-size:22px;margin:0;">&#128274; MotoQFox</h1>
        <p style="color:#718096;margin:4px 0 0;font-size:14px;">Restablecimiento de contraseña</p>
      </div>

      <p style="color:#4a5568;font-size:14px;">
        Hola <strong>{user.get_full_name()}</strong>,<br><br>
        Recibimos una solicitud para restablecer la contrasena de la cuenta asociada a
        <strong>{user.email}</strong>.
      </p>

      <div style="text-align:center;margin:28px 0;">
        <a href="{reset_link}"
           style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;
                  padding:14px 32px;border-radius:8px;text-decoration:none;
                  font-weight:600;font-size:15px;display:inline-block;">
          Restablecer contraseña
        </a>
      </div>

      <p style="color:#718096;font-size:13px;">
        O copia y pega este enlace en tu navegador:<br>
        <span style="color:#4c51bf;word-break:break-all;">{reset_link}</span>
      </p>

      <p style="color:#e53e3e;font-size:13px;background:#fff5f5;padding:10px 14px;
                border-radius:6px;border:1px solid #fed7d7;">
        <strong>Este enlace expira en 1 hora.</strong><br>
        Si no solicitaste restablecer tu contrasena, ignora este correo; tu cuenta esta segura.
      </p>

      <p style="color:#a0aec0;font-size:12px;text-align:center;margin-top:24px;">
        Este correo fue generado automaticamente por el sistema MotoQFox.<br>
        No respondas a este mensaje.
      </p>
    </div>
    """

    try:
        send_mail(
            subject=subject,
            message=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_body,
            fail_silently=False,
        )
        print(f'[EMAIL] Reset email sent to {user.email}')
    except Exception as exc:
        print(f'[EMAIL ERROR] Could not send reset email to {user.email}: {exc}')


# ─── Other helpers ─────────────────────────────────────────────────────────────

def _sede_snapshot(sede):
    """Build a rich stats dict for a single sede (employees, on-shift, stock)."""
    now = timezone.localtime()
    today = now.weekday()   # 0=Mon … 6=Sun
    now_time = now.time()

    emp_qs = CustomUser.objects.filter(is_active=True, sede=sede)
    on_shift_qs = Turno.objects.filter(
        sede=sede,
        is_active=True,
        dia_semana=today,
        hora_inicio__lte=now_time,
        hora_fin__gte=now_time,
    ).select_related('user')

    try:
        from inventory.models import Stock
        low_stock_count    = Stock.objects.filter(sede=sede, quantity__lte=F('min_quantity')).count()
        out_of_stock_count = Stock.objects.filter(sede=sede, quantity=0).count()
    except Exception:
        low_stock_count = out_of_stock_count = 0

    return {
        'id':    sede.id,
        'name':  sede.name,
        'address': sede.address,
        'phone': sede.phone,
        'is_active': sede.is_active,
        'total_employees':  emp_qs.count(),
        'total_encargados': emp_qs.filter(role=CustomUser.Role.ENCARGADO).count(),
        'total_workers':    emp_qs.filter(role=CustomUser.Role.WORKER).count(),
        'total_cashiers':   emp_qs.filter(role=CustomUser.Role.CASHIER).count(),
        'on_shift_now': on_shift_qs.count(),
        'on_shift_users': [
            {'id': t.user.id, 'name': t.user.get_full_name(), 'role': t.user.role}
            for t in on_shift_qs
        ],
        'low_stock_count':    low_stock_count,
        'out_of_stock_count': out_of_stock_count,
    }


def _can_manage_users(requester, target=None):
    """
    ADMINISTRATOR  — can manage anyone.
    ENCARGADO      — can manage WORKER/CASHIER of their own sede only.
    """
    if requester.is_administrator:
        return True
    if requester.is_encargado:
        if target is None:
            return True  # list / create — scope enforced separately
        manageable = (CustomUser.Role.WORKER, CustomUser.Role.CASHIER)
        return target.role in manageable and target.sede_id == requester.sede_id
    return False


# ─── AUTH ─────────────────────────────────────────────────────────────────────

class LoginView(APIView):
    """
    POST /api/auth/login/ — Authenticate user with lockout protection.

    - Tracks failed attempts per account.
    - After MAX_LOGIN_ATTEMPTS (5) failures → locks account for LOCKOUT_MINUTES (30).
    - On success → resets attempt counter.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Datos inválidos',
                'errors': serializer.errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        email    = serializer.validated_data['email']
        password = serializer.validated_data['password']
        now      = timezone.now()

        # ── Look up account ──────────────────────────────────────────────
        try:
            user_obj = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            user_obj = None

        # ── Pre-check: account locked? ───────────────────────────────────
        if user_obj and user_obj.locked_until and user_obj.locked_until > now:
            remaining = int((user_obj.locked_until - now).total_seconds())
            mins, secs = divmod(remaining, 60)
            _log_event(LoginAuditLog.EventType.LOGIN_FAILED, email,
                       user=user_obj, request=request,
                       details=f'Cuenta bloqueada. Tiempo restante: {mins}m {secs}s')
            return Response({
                'success':          False,
                'locked':           True,
                'locked_until':     user_obj.locked_until.isoformat(),
                'remaining_seconds': remaining,
                'unlock_requested': user_obj.unlock_requested,
                'message': (
                    f'Cuenta bloqueada por demasiados intentos fallidos. '
                    f'Intenta de nuevo en {mins} min {secs} seg.'
                ),
            }, status=423)

        # ── Authenticate ─────────────────────────────────────────────────
        user = authenticate(request=request, username=email, password=password)

        if user is None:
            # Wrong credentials
            if user_obj and user_obj.is_active:
                user_obj.login_attempts = (user_obj.login_attempts or 0) + 1
                if user_obj.login_attempts >= MAX_LOGIN_ATTEMPTS:
                    user_obj.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
                    user_obj.save(update_fields=['login_attempts', 'locked_until'])
                    _log_event(LoginAuditLog.EventType.ACCOUNT_LOCKED, email,
                               user=user_obj, request=request,
                               details=f'Bloqueada por {MAX_LOGIN_ATTEMPTS} intentos fallidos.')
                    return Response({
                        'success':          False,
                        'locked':           True,
                        'locked_until':     user_obj.locked_until.isoformat(),
                        'remaining_seconds': LOCKOUT_MINUTES * 60,
                        'unlock_requested': user_obj.unlock_requested,
                        'message': (
                            f'Cuenta bloqueada por {LOCKOUT_MINUTES} minutos '
                            f'por demasiados intentos fallidos.'
                        ),
                    }, status=423)
                user_obj.save(update_fields=['login_attempts'])
                remaining_attempts = max(0, MAX_LOGIN_ATTEMPTS - user_obj.login_attempts)
                _log_event(LoginAuditLog.EventType.LOGIN_FAILED, email,
                           user=user_obj, request=request,
                           details=f'Intento {user_obj.login_attempts}/{MAX_LOGIN_ATTEMPTS}. Quedan {remaining_attempts}.')
                return Response({
                    'success':           False,
                    'locked':            False,
                    'remaining_attempts': remaining_attempts,
                    'message': (
                        f'Credenciales incorrectas. '
                        f'Te queda{"n" if remaining_attempts != 1 else ""} '
                        f'{remaining_attempts} intento{"s" if remaining_attempts != 1 else ""}.'
                    ),
                }, status=status.HTTP_400_BAD_REQUEST)

            elif user_obj and not user_obj.is_active:
                _log_event(LoginAuditLog.EventType.LOGIN_FAILED, email,
                           user=user_obj, request=request, details='Cuenta desactivada.')
                return Response({
                    'success': False,
                    'message': 'Esta cuenta está desactivada. Contacta al administrador.',
                }, status=status.HTTP_400_BAD_REQUEST)

            # Email not found — log generically without revealing existence
            _log_event(LoginAuditLog.EventType.LOGIN_FAILED, email,
                       request=request, details='Email no registrado.')
            return Response({
                'success': False,
                'locked':  False,
                'message': 'Credenciales incorrectas.',
            }, status=status.HTTP_400_BAD_REQUEST)

        if not user.is_active:
            _log_event(LoginAuditLog.EventType.LOGIN_FAILED, email,
                       user=user, request=request, details='Cuenta desactivada.')
            return Response({
                'success': False,
                'message': 'Esta cuenta está desactivada. Contacta al administrador.',
            }, status=status.HTTP_400_BAD_REQUEST)

        # ── Success — reset lockout counter ──────────────────────────────
        user.login_attempts   = 0
        user.locked_until     = None
        user.unlock_requested = False
        user.save(update_fields=['login_attempts', 'locked_until', 'unlock_requested'])
        _log_event(LoginAuditLog.EventType.LOGIN_SUCCESS, email,
                   user=user, request=request)

        refresh = RefreshToken.for_user(user)
        return Response({
            'success': True,
            'message': 'Inicio de sesión exitoso',
            'data': {
                'user':   UserSerializer(user).data,
                'tokens': {'refresh': str(refresh), 'access': str(refresh.access_token)},
            },
        }, status=status.HTTP_200_OK)


class CustomTokenRefreshView(TokenRefreshView):
    """POST /api/auth/refresh/ — Refresh access token."""
    pass


class UserProfileView(APIView):
    """GET /api/auth/profile/ — Return authenticated user's profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'success': True,
            'data': UserSerializer(request.user).data,
        }, status=status.HTTP_200_OK)


# ─── SECURITY — UNLOCK REQUEST ─────────────────────────────────────────────────

class RequestUnlockView(APIView):
    """
    POST /api/auth/request-unlock/
    Body: { email }
    User requests the admin to manually unlock their account.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({'success': False, 'message': 'Email requerido'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.get(email=email)
            if user.is_locked():
                user.unlock_requested = True
                user.save(update_fields=['unlock_requested'])
                _log_event(LoginAuditLog.EventType.UNLOCK_REQUESTED, email,
                           user=user, request=request)
                return Response({
                    'success': True,
                    'message': 'Solicitud enviada al administrador. Te notificarán cuando tu cuenta sea desbloqueada.',
                })
            return Response({
                'success': False,
                'message': 'Tu cuenta no está bloqueada. Puedes iniciar sesión normalmente.',
            }, status=status.HTTP_400_BAD_REQUEST)
        except CustomUser.DoesNotExist:
            return Response({
                'success': True,
                'message': 'Si el correo está registrado y la cuenta está bloqueada, el administrador recibirá tu solicitud.',
            })


class AdminUnlockView(APIView):
    """
    POST /api/auth/admin/unlock/<id>/
    Admin manually unlocks a user account.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not request.user.is_administrator:
            return Response({'success': False, 'message': 'No tienes permisos'},
                            status=status.HTTP_403_FORBIDDEN)
        try:
            user = CustomUser.objects.get(pk=pk)
            user.unlock()
            _log_event(LoginAuditLog.EventType.ACCOUNT_UNLOCKED, user.email,
                       user=user, request=request,
                       details=f'Desbloqueada por administrador: {request.user.email}')
            return Response({
                'success': True,
                'message': f'Cuenta de {user.get_full_name()} desbloqueada exitosamente.',
                'data': UserSerializer(user).data,
            })
        except CustomUser.DoesNotExist:
            return Response({'success': False, 'message': 'Usuario no encontrado'},
                            status=status.HTTP_404_NOT_FOUND)


# ─── SECURITY — PASSWORD RESET ─────────────────────────────────────────────────

class PasswordResetRequestView(APIView):
    """
    POST /api/auth/password-reset/
    Body: { email }
    Generates a reset token and sends an email with the reset link.
    """
    permission_classes = [AllowAny]

    # Generic message to avoid email enumeration
    _GENERIC = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({'success': False, 'message': 'Email requerido'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            user = CustomUser.objects.get(email=email, is_active=True)
            # Invalidate previous unused tokens for this user
            PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
            token_obj = PasswordResetToken.objects.create(
                user=user,
                expires_at=timezone.now() + timedelta(hours=1),
            )
            _send_reset_email(user, token_obj.token)
            _log_event(LoginAuditLog.EventType.PASSWORD_RESET_REQ, email,
                       user=user, request=request)
        except CustomUser.DoesNotExist:
            pass  # Don't reveal existence

        return Response({'success': True, 'message': self._GENERIC})


class PasswordResetConfirmView(APIView):
    """
    POST /api/auth/password-reset/confirm/
    Body: { token, password, password_confirm }
    Validates the token and sets the new password.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        token_str        = request.data.get('token', '').strip()
        password         = request.data.get('password', '')
        password_confirm = request.data.get('password_confirm', '')

        if not token_str or not password:
            return Response({'success': False, 'message': 'Token y contraseña son requeridos'},
                            status=status.HTTP_400_BAD_REQUEST)

        if password != password_confirm:
            return Response({
                'success': False,
                'errors': {'password_confirm': 'Las contraseñas no coinciden.'},
            }, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8:
            return Response({'success': False, 'errors': {'password': 'Mínimo 8 caracteres.'}},
                            status=status.HTTP_400_BAD_REQUEST)

        # Validate token
        try:
            import uuid as _uuid
            token_uuid = _uuid.UUID(token_str)
            token_obj  = PasswordResetToken.objects.select_related('user').get(token=token_uuid)
        except (ValueError, PasswordResetToken.DoesNotExist):
            return Response({'success': False, 'message': 'Token inválido o expirado.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if not token_obj.is_valid():
            return Response({'success': False, 'message': 'El enlace ha expirado o ya fue utilizado.'},
                            status=status.HTTP_400_BAD_REQUEST)

        user = token_obj.user
        user.set_password(password)
        user.login_attempts   = 0
        user.locked_until     = None
        user.unlock_requested = False
        user.save()

        token_obj.used = True
        token_obj.save(update_fields=['used'])
        _log_event(LoginAuditLog.EventType.PASSWORD_RESET_DONE, user.email,
                   user=user, request=request)

        return Response({
            'success': True,
            'message': 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.',
        })


# ─── SECURITY — ADMIN VIEWS ─────────────────────────────────────────────────────

class LockedAccountsView(APIView):
    """
    GET /api/auth/locked-accounts/
    Returns accounts that are currently locked OR have a pending unlock request.
    Admin only.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_administrator:
            return Response({'success': False, 'message': 'No tienes permisos'},
                            status=status.HTTP_403_FORBIDDEN)
        qs = CustomUser.objects.filter(
            Q(locked_until__gt=timezone.now()) | Q(unlock_requested=True)
        ).select_related('sede').order_by('locked_until')
        return Response({'success': True, 'data': UserSerializer(qs, many=True).data})


class LoginAuditLogView(APIView):
    """
    GET /api/auth/audit-log/
    Paginated security event log with optional filters. Admin only.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_administrator:
            return Response({'success': False, 'message': 'No tienes permisos'},
                            status=status.HTTP_403_FORBIDDEN)

        qs = LoginAuditLog.objects.all()

        event_type = request.query_params.get('event_type', '').strip()
        email      = request.query_params.get('email', '').strip()
        if event_type:
            qs = qs.filter(event_type=event_type)
        if email:
            qs = qs.filter(email__icontains=email)

        try:
            page      = max(1, int(request.query_params.get('page', 1)))
            page_size = min(100, max(1, int(request.query_params.get('page_size', 50))))
        except ValueError:
            page, page_size = 1, 50

        total = qs.count()
        start = (page - 1) * page_size

        return Response({
            'success': True,
            'data': {
                'logs': LoginAuditLogSerializer(qs[start:start + page_size], many=True).data,
                'pagination': {
                    'total':       total,
                    'page':        page,
                    'page_size':   page_size,
                    'total_pages': max(1, (total + page_size - 1) // page_size),
                },
            },
        })


# ─── ADMIN / ENCARGADO — DASHBOARD ────────────────────────────────────────────

class AdminDashboardSummaryView(APIView):
    """
    GET /api/auth/admin/dashboard/summary/

    ADMINISTRATOR — global stats + per-sede snapshots (mode='administrator').
    ENCARGADO     — stats for their own sede only   (mode='encargado').
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if not (user.is_administrator or user.is_encargado):
            return Response({
                'success': False,
                'message': 'No tienes permisos para acceder a este recurso',
            }, status=status.HTTP_403_FORBIDDEN)

        from branches.models import Sede

        # ── ENCARGADO mode ───────────────────────────────────────────────────
        if user.is_encargado:
            sede = user.sede
            if not sede:
                return Response({
                    'success': False,
                    'message': 'No tienes sede asignada',
                }, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                'success': True,
                'data': {
                    'mode':  'encargado',
                    'sede':  _sede_snapshot(sede),
                    'user_info': {
                        'name':      user.get_full_name(),
                        'email':     user.email,
                        'role':      user.role,
                        'sede_name': sede.name,
                    },
                },
            }, status=status.HTTP_200_OK)

        # ── ADMINISTRATOR mode ────────────────────────────────────────────────
        sedes = Sede.objects.filter(is_active=True)
        sedes_snapshots = [_sede_snapshot(s) for s in sedes]

        total_qs = CustomUser.objects.filter(is_active=True)
        # Count accounts with pending unlock requests
        unlock_pending = CustomUser.objects.filter(unlock_requested=True).count()

        stats = {
            'total_users':          total_qs.count(),
            'total_administrators': total_qs.filter(role=CustomUser.Role.ADMINISTRATOR).count(),
            'total_encargados':     total_qs.filter(role=CustomUser.Role.ENCARGADO).count(),
            'total_workers':        total_qs.filter(role=CustomUser.Role.WORKER).count(),
            'total_cashiers':       total_qs.filter(role=CustomUser.Role.CASHIER).count(),
            'total_customers':      total_qs.filter(role=CustomUser.Role.CUSTOMER).count(),
            'unlock_pending':       unlock_pending,
        }

        return Response({
            'success': True,
            'data': {
                'mode':          'administrator',
                'statistics':    stats,
                'sedes_summary': sedes_snapshots,
                'user_info': {
                    'name':  user.get_full_name(),
                    'email': user.email,
                    'role':  user.role,
                },
            },
        }, status=status.HTTP_200_OK)


# ─── ADMIN / ENCARGADO — USER MANAGEMENT ──────────────────────────────────────

class UserListCreateView(APIView):
    """
    GET  /api/users/ — List users with filters and pagination.
    POST /api/users/ — Create a new user.

    ADMINISTRATOR can manage all users/sedes.
    ENCARGADO can only manage WORKER/CASHIER of their own sede.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _can_manage_users(request.user):
            return Response({
                'success': False,
                'message': 'No tienes permisos para listar usuarios',
            }, status=status.HTTP_403_FORBIDDEN)

        qs = CustomUser.objects.select_related('sede').order_by('-created_at')

        # Scope ENCARGADO to their sede + limited roles
        if request.user.is_encargado:
            qs = qs.filter(
                sede=request.user.sede,
                role__in=[CustomUser.Role.WORKER, CustomUser.Role.CASHIER],
            )

        # Filters
        search    = request.query_params.get('search', '').strip()
        role      = request.query_params.get('role', '').strip()
        sede_id   = request.query_params.get('sede_id', '').strip()
        is_active = request.query_params.get('is_active', '').strip()

        if search:
            qs = qs.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        if role:
            qs = qs.filter(role=role)
        if sede_id and request.user.is_administrator:
            qs = qs.filter(sede_id=sede_id)
        if is_active in ('true', 'false'):
            qs = qs.filter(is_active=(is_active == 'true'))

        try:
            page      = max(1, int(request.query_params.get('page', 1)))
            page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
        except ValueError:
            page, page_size = 1, 20

        total = qs.count()
        start = (page - 1) * page_size

        return Response({
            'success': True,
            'data': {
                'users': UserSerializer(qs[start:start + page_size], many=True).data,
                'pagination': {
                    'total':       total,
                    'page':        page,
                    'page_size':   page_size,
                    'total_pages': max(1, (total + page_size - 1) // page_size),
                },
            },
        }, status=status.HTTP_200_OK)

    def post(self, request):
        if not _can_manage_users(request.user):
            return Response({
                'success': False,
                'message': 'No tienes permisos para crear usuarios',
            }, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()

        # ENCARGADO: restrict role + force their sede
        if request.user.is_encargado:
            allowed = {CustomUser.Role.WORKER, CustomUser.Role.CASHIER}
            if data.get('role') not in allowed:
                return Response({
                    'success': False,
                    'message': 'Solo puedes crear trabajadores y cajeros',
                }, status=status.HTTP_403_FORBIDDEN)
            data['sede'] = request.user.sede_id

        plain_password = data.get('password', '')
        serializer = UserCreateSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            _send_welcome_email(user, plain_password)
            return Response({
                'success': True,
                'message': 'Usuario creado exitosamente. Se enviaron las credenciales a su correo.',
                'data': UserSerializer(user).data,
            }, status=status.HTTP_201_CREATED)

        return Response({
            'success': False,
            'message': 'Datos inválidos',
            'errors': serializer.errors,
        }, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(APIView):
    """
    GET    /api/users/<id>/ — Retrieve user detail.
    PUT    /api/users/<id>/ — Update user.
    DELETE /api/users/<id>/ — Hard delete user.
    """
    permission_classes = [IsAuthenticated]

    def _get_user(self, pk):
        try:
            return CustomUser.objects.select_related('sede').get(pk=pk)
        except CustomUser.DoesNotExist:
            return None

    def _check_perm(self, request, target):
        if not _can_manage_users(request.user, target):
            return Response({
                'success': False,
                'message': 'No tienes permisos para esta acción',
            }, status=status.HTTP_403_FORBIDDEN)
        return None

    def _require_manager(self, request):
        if not (request.user.is_administrator or request.user.is_encargado):
            return Response({
                'success': False,
                'message': 'No tienes permisos para esta acción',
            }, status=status.HTTP_403_FORBIDDEN)
        return None

    def get(self, request, pk):
        denied = self._require_manager(request)
        if denied:
            return denied
        user = self._get_user(pk)
        if not user:
            return Response({'success': False, 'message': 'Usuario no encontrado'},
                            status=status.HTTP_404_NOT_FOUND)
        denied = self._check_perm(request, user)
        if denied:
            return denied
        return Response({'success': True, 'data': UserSerializer(user).data})

    def put(self, request, pk):
        denied = self._require_manager(request)
        if denied:
            return denied
        user = self._get_user(pk)
        if not user:
            return Response({'success': False, 'message': 'Usuario no encontrado'},
                            status=status.HTTP_404_NOT_FOUND)
        denied = self._check_perm(request, user)
        if denied:
            return denied

        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Usuario actualizado exitosamente',
                'data': UserSerializer(user).data,
            })
        return Response({'success': False, 'message': 'Datos inválidos', 'errors': serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        denied = self._require_manager(request)
        if denied:
            return denied
        user = self._get_user(pk)
        if not user:
            return Response({'success': False, 'message': 'Usuario no encontrado'},
                            status=status.HTTP_404_NOT_FOUND)
        denied = self._check_perm(request, user)
        if denied:
            return denied

        if user.pk == request.user.pk:
            return Response({'success': False, 'message': 'No puedes eliminar tu propio usuario'},
                            status=status.HTTP_400_BAD_REQUEST)

        user.delete()
        return Response({'success': True, 'message': 'Usuario eliminado exitosamente'},
                        status=status.HTTP_200_OK)


# ─── ADMIN / ENCARGADO — TURNO (SCHEDULE) MANAGEMENT ─────────────────────────

class TurnoListCreateView(APIView):
    """
    GET  /api/users/turnos/ — List schedules.
    POST /api/users/turnos/ — Create a schedule.

    ADMINISTRATOR — full access to all sedes.
    ENCARGADO     — scoped to their own sede.
    """
    permission_classes = [IsAuthenticated]

    def _require_manager(self, request):
        if not (request.user.is_administrator or request.user.is_encargado):
            return Response({
                'success': False,
                'message': 'No tienes permisos para gestionar turnos',
            }, status=status.HTTP_403_FORBIDDEN)
        return None

    def get(self, request):
        denied = self._require_manager(request)
        if denied:
            return denied

        qs = Turno.objects.select_related('user', 'sede').order_by(
            'sede__name', 'dia_semana', 'hora_inicio'
        )

        if request.user.is_encargado:
            qs = qs.filter(sede=request.user.sede)

        sede_id   = request.query_params.get('sede_id')
        user_id   = request.query_params.get('user_id')
        dia       = request.query_params.get('dia_semana')
        is_active = request.query_params.get('is_active')

        if sede_id and request.user.is_administrator:
            qs = qs.filter(sede_id=sede_id)
        if user_id:
            qs = qs.filter(user_id=user_id)
        if dia is not None:
            qs = qs.filter(dia_semana=dia)
        if is_active in ('true', 'false'):
            qs = qs.filter(is_active=(is_active == 'true'))

        return Response({
            'success': True,
            'data': TurnoSerializer(qs, many=True).data,
        })

    def post(self, request):
        denied = self._require_manager(request)
        if denied:
            return denied

        data = request.data.copy()

        if request.user.is_encargado:
            data['sede'] = request.user.sede_id

        serializer = TurnoSerializer(data=data)
        if serializer.is_valid():
            turno = serializer.save()
            return Response({
                'success': True,
                'message': 'Turno creado exitosamente',
                'data': TurnoSerializer(turno).data,
            }, status=status.HTTP_201_CREATED)

        return Response({
            'success': False,
            'message': 'Datos inválidos',
            'errors': serializer.errors,
        }, status=status.HTTP_400_BAD_REQUEST)


class TurnoDetailView(APIView):
    """
    GET    /api/users/turnos/<id>/ — Retrieve a schedule.
    PUT    /api/users/turnos/<id>/ — Update a schedule.
    DELETE /api/users/turnos/<id>/ — Delete a schedule.
    """
    permission_classes = [IsAuthenticated]

    def _get_turno(self, pk):
        try:
            return Turno.objects.select_related('user', 'sede').get(pk=pk)
        except Turno.DoesNotExist:
            return None

    def _check_access(self, request, turno):
        if request.user.is_administrator:
            return None
        if request.user.is_encargado and turno.sede_id == request.user.sede_id:
            return None
        return Response({
            'success': False,
            'message': 'No tienes permisos para esta acción',
        }, status=status.HTTP_403_FORBIDDEN)

    def _require_manager(self, request):
        if not (request.user.is_administrator or request.user.is_encargado):
            return Response({
                'success': False,
                'message': 'No tienes permisos',
            }, status=status.HTTP_403_FORBIDDEN)
        return None

    def get(self, request, pk):
        denied = self._require_manager(request)
        if denied:
            return denied
        turno = self._get_turno(pk)
        if not turno:
            return Response({'success': False, 'message': 'Turno no encontrado'},
                            status=status.HTTP_404_NOT_FOUND)
        denied = self._check_access(request, turno)
        if denied:
            return denied
        return Response({'success': True, 'data': TurnoSerializer(turno).data})

    def put(self, request, pk):
        denied = self._require_manager(request)
        if denied:
            return denied
        turno = self._get_turno(pk)
        if not turno:
            return Response({'success': False, 'message': 'Turno no encontrado'},
                            status=status.HTTP_404_NOT_FOUND)
        denied = self._check_access(request, turno)
        if denied:
            return denied

        serializer = TurnoSerializer(turno, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Turno actualizado exitosamente',
                'data': TurnoSerializer(turno).data,
            })
        return Response({'success': False, 'message': 'Datos inválidos', 'errors': serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        denied = self._require_manager(request)
        if denied:
            return denied
        turno = self._get_turno(pk)
        if not turno:
            return Response({'success': False, 'message': 'Turno no encontrado'},
                            status=status.HTTP_404_NOT_FOUND)
        denied = self._check_access(request, turno)
        if denied:
            return denied

        turno.delete()
        return Response({'success': True, 'message': 'Turno eliminado exitosamente'})
