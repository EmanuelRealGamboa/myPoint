# Seguridad OWASP — MotoQFox

**Referencia**: OWASP Top 10:2025
**Stack**: Django 5.x + DRF + React 19 + JWT

---

## Resumen de Implementación por Fase

| # | Vulnerabilidad OWASP | Cuando implementar | Estado |
|---|---------------------|-------------------|--------|
| A01 | Broken Access Control | Desde Fase 1 (base) + Fase 7 | 🟡 Parcial |
| A02 | Security Misconfiguration | Fase 7 + Fase 8 (producción) | 🔲 Pendiente |
| A03 | Software Supply Chain | CI/CD (Fase 8) | 🔲 Pendiente |
| A04 | Cryptographic Failures | Fase 7 | 🔲 Pendiente |
| A05 | Injection | Desde inicio (ORM) | ✅ Protegido por Django ORM |
| A06 | Insecure Design | Arquitectura base | ✅ Multi-sede por diseño |
| A07 | Authentication Failures | Fase 7 | 🔲 Pendiente |
| A08 | Software/Data Integrity | CI/CD + dependencias | 🔲 Pendiente |
| A09 | Security Logging | Fase 6 (audit log) | 🔲 Pendiente |
| A10 | Mishandling Exceptions | Fase 7 | 🔲 Pendiente |

---

## A01 — Broken Access Control

**Riesgo**: El más común. Un usuario accede a datos o funciones que no le corresponden.

### Ya implementado ✅
- JWT requerido en todos los endpoints (excepto `/auth/login/` y `/auth/refresh/`)
- `ProtectedRoute` en frontend verifica rol antes de renderizar
- `ProtectedRoute` redirige al panel correcto si el rol no coincide
- Dashboard solo accesible por ADMINISTRATOR

### Por implementar (Fase 7)
```python
# 1. Filtrado por sede en todos los endpoints de datos
# Cada queryset debe filtrar por la sede del usuario autenticado

class VentaListView(ListAPIView):
    def get_queryset(self):
        user = self.request.user
        if user.is_administrator:
            sede_id = self.request.query_params.get('sede_id')
            if sede_id:
                return Venta.objects.filter(sede_id=sede_id)
            return Venta.objects.all()
        # WORKER y CASHIER solo ven su sede
        return Venta.objects.filter(sede=user.sede)

# 2. Permisos por objeto con django-guardian
# pip install django-guardian
from guardian.shortcuts import assign_perm

# Al crear un usuario, asignarle permisos a su sede
def asignar_permisos_sede(user, sede):
    assign_perm('branches.view_sede', user, sede)
    assign_perm('branches.change_sede', user, sede)  # Solo admin

# 3. Nunca usar IDs predecibles en URLs críticas sin verificar propiedad
# MAL:
GET /api/ventas/1/   # ¿Es la venta del usuario autenticado?

# BIEN: siempre verificar propiedad en get_queryset()
```

---

## A02 — Security Misconfiguration

### Por implementar en settings/production.py (Fase 8)
```python
# settings/production.py

DEBUG = False  # NUNCA True en producción
SECRET_KEY = config('DJANGO_SECRET_KEY')
ALLOWED_HOSTS = config('ALLOWED_HOSTS').split(',')

# HTTPS obligatorio
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Cookies seguras
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True

# Headers de seguridad
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# NO exponer info del framework
DEFAULT_EXCEPTION_REPORTER = None

# CORS estricto
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS').split(',')
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
```

```bash
# Verificar configuración antes de cada deploy
python manage.py check --deploy --fail-level WARNING
# Si hay warnings, el deploy falla en CI/CD
```

---

## A03 — Software Supply Chain Failures

### Por implementar en CI/CD (Fase 8)
```bash
# Backend: auditar dependencias Python
pip install pip-audit
pip-audit --requirement requirements.txt --fail-on-vuln

# Frontend: auditar dependencias Node
npm audit --audit-level=high
# Si hay vulnerabilidades altas, falla el pipeline

# Dependabot automático en GitHub
# .github/dependabot.yml ya configurado (ver arquitectura.md)
```

### Buenas prácticas aplicadas desde ahora
- `requirements.txt` con versiones exactas (sin `>=`)
- `package-lock.json` siempre en el repo
- Revisar CHANGELOG antes de actualizar dependencias mayores

---

## A04 — Cryptographic Failures

### Por implementar (Fase 7)

**1. Argon2 para contraseñas (reemplaza PBKDF2)**
```bash
pip install argon2-cffi
```
```python
# settings.py
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',  # Primero = por defecto
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',  # Fallback para usuarios viejos
]
```

**2. JWT más seguro**
```python
# settings.py
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),  # Reducir de 60 a 15 min
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'SIGNING_KEY': config('JWT_SIGNING_KEY'),  # Clave separada del SECRET_KEY
    'ALGORITHM': 'HS256',
}

# Instalar blacklist para invalidar tokens al logout
INSTALLED_APPS = [
    ...
    'rest_framework_simplejwt.token_blacklist',
]
```

**3. Refresh token en httpOnly cookie (Fase 7)**
```python
# views.py - Login retorna access token en body, refresh en cookie httpOnly
class LoginView(APIView):
    def post(self, request):
        # ... validar credenciales ...
        response = Response({
            'success': True,
            'data': {
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            }
        })
        # Refresh token en cookie httpOnly (no accesible por JavaScript)
        response.set_cookie(
            key='refresh_token',
            value=str(refresh),
            httponly=True,
            secure=True,  # Solo HTTPS
            samesite='Lax',
            max_age=7 * 24 * 60 * 60  # 7 días
        )
        return response
```

```typescript
// Frontend: access token en memoria (Zustand), NO en localStorage
// store/authStore.ts
import { create } from 'zustand';

interface AuthStore {
  accessToken: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (token, user) => set({ accessToken: token, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
}));
// El token se pierde al recargar → se obtiene nuevo con el refresh cookie
```

---

## A05 — Injection (SQL Injection)

### Ya protegido por Django ORM ✅
El ORM de Django usa queries parametrizadas automáticamente.

### Precauciones adicionales (mantener siempre)
```python
# NUNCA hacer esto:
Producto.objects.raw(f"SELECT * FROM productos WHERE nombre = '{nombre}'")
Producto.objects.extra(where=[f"precio > {precio}"])

# SIEMPRE usar el ORM o parametrizar:
Producto.objects.filter(nombre__icontains=nombre)
Producto.objects.raw("SELECT * FROM productos WHERE nombre = %s", [nombre])

# Validar todos los inputs con serializers antes de cualquier operación
class ProductoBusquedaSerializer(serializers.Serializer):
    q = serializers.CharField(max_length=200, required=False)
    categoria_id = serializers.IntegerField(required=False, min_value=1)
    sede_id = serializers.IntegerField(required=False, min_value=1)
```

---

## A07 — Authentication Failures

### Por implementar (Fase 7)

**1. Rate limiting y bloqueo por fuerza bruta**
```bash
pip install django-axes
```
```python
# settings.py
INSTALLED_APPS = ['axes', ...]
AUTHENTICATION_BACKENDS = [
    'axes.backends.AxesStandaloneBackend',
    'django.contrib.auth.backends.ModelBackend',
]
AXES_FAILURE_LIMIT = 5         # Bloquear tras 5 intentos
AXES_COOLOFF_TIME = 1          # 1 hora de bloqueo
AXES_LOCK_OUT_BY_COMBINATION_USER_AND_IP = True
AXES_RESET_ON_SUCCESS = True
```

**2. Rate limiting en endpoints**
```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day',
        'login': '5/minute',           # Crítico
        'password_reset': '3/hour',
    }
}

# views.py - Aplicar throttle al login
from rest_framework.throttling import ScopedRateThrottle

class LoginView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'
```

**3. Validación de contraseña robusta**
```python
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8}
    },
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
```

**4. Timeout de sesión en frontend (Fase 7)**
```typescript
// hooks/useSessionTimeout.ts
import { useEffect, useRef } from 'react';

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutos
const WARNING_TIME = 2 * 60 * 1000;      // Avisar 2 min antes

export function useSessionTimeout(onTimeout: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const warningTimer = useRef<ReturnType<typeof setTimeout>>();

  const resetTimer = () => {
    clearTimeout(timer.current);
    clearTimeout(warningTimer.current);

    warningTimer.current = setTimeout(() => {
      // Mostrar modal "Tu sesión expirará en 2 minutos"
    }, INACTIVITY_LIMIT - WARNING_TIME);

    timer.current = setTimeout(() => {
      onTimeout(); // Hacer logout
    }, INACTIVITY_LIMIT);
  };

  useEffect(() => {
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, []);
}
```

---

## A08 — Software and Data Integrity Failures

### Implementar en Fase 8
```yaml
# .github/workflows/ci.yml — Verificar integridad
- name: Verify dependency hashes (Python)
  run: pip install --require-hashes -r requirements.txt

- name: Audit dependencies
  run: |
    pip-audit --requirement requirements.txt
    npm audit --audit-level=moderate --prefix frontend
```

---

## A09 — Security Logging and Alerting Failures

### Por implementar en Fase 6 (Audit Log)

```python
# middleware/audit_log.py
import json
import logging
from django.utils import timezone

audit_logger = logging.getLogger('audit')

ACCIONES_CRITICAS = [
    ('POST', '/api/ventas/'),
    ('DELETE', '/api/ventas/'),
    ('POST', '/api/auth/login/'),
    ('PUT', '/api/users/'),
    ('POST', '/api/inventario/entradas/'),
    ('POST', '/api/cierres/'),
]

class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Registrar acciones críticas
        if self._es_accion_critica(request):
            audit_logger.info(json.dumps({
                'timestamp': timezone.now().isoformat(),
                'user': str(request.user),
                'method': request.method,
                'path': request.path,
                'status': response.status_code,
                'ip': self._get_ip(request),
            }))

        return response

    def _es_accion_critica(self, request):
        for method, path in ACCIONES_CRITICAS:
            if request.method == method and request.path.startswith(path):
                return True
        return False

    def _get_ip(self, request):
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            return x_forwarded.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
```

```python
# settings.py — Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'audit': {
            'format': '%(asctime)s %(message)s'
        },
    },
    'handlers': {
        'audit_file': {
            'class': 'logging.FileHandler',
            'filename': 'logs/audit.log',
            'formatter': 'audit',
        },
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'audit': {
            'handlers': ['audit_file', 'console'],
            'level': 'INFO',
        },
        'django.security': {
            'handlers': ['audit_file'],
            'level': 'WARNING',
        },
    },
}
```

---

## A10 — Mishandling of Exceptional Conditions

### Por implementar (Fase 7)
```python
# Nunca exponer excepciones internas al cliente

# MAL:
try:
    resultado = operacion_compleja()
except Exception as e:
    return Response({'error': str(e)}, status=500)
    # El stacktrace puede revelar rutas, versiones, lógica interna

# BIEN:
import logging
logger = logging.getLogger(__name__)

try:
    resultado = operacion_compleja()
except Exception as e:
    logger.exception(f"Error inesperado en VentaView: {e}")
    return Response({
        'success': False,
        'message': 'Ocurrió un error interno. Por favor contacta al administrador.'
    }, status=500)
    # El error real va al log, NO al cliente
```

```python
# Handler global de errores 404 y 500 en Django
# config/views.py
from rest_framework.response import Response
from rest_framework import status

def handler404(request, exception):
    return Response({'success': False, 'message': 'Recurso no encontrado'}, status=404)

def handler500(request):
    return Response({'success': False, 'message': 'Error interno del servidor'}, status=500)

# config/urls.py
handler404 = 'config.views.handler404'
handler500 = 'config.views.handler500'
```

---

## Content Security Policy (CSP)

```python
# pip install django-csp
# settings.py
MIDDLEWARE = [
    ...
    'csp.middleware.CSPMiddleware',
]

CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'",)          # Sin 'unsafe-inline' ni 'unsafe-eval'
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")  # Para CSS-in-JS si es necesario
CSP_IMG_SRC = ("'self'", "data:", "https:")
CSP_FONT_SRC = ("'self'",)
CSP_CONNECT_SRC = ("'self'", "https://motoqfox-backend.railway.app")
CSP_FRAME_ANCESTORS = ("'none'",)     # Previene clickjacking
CSP_FORM_ACTION = ("'self'",)
```

---

## XSS en React

```typescript
// React escapa automáticamente, pero vigilar estos casos:

// PELIGRO 1: dangerouslySetInnerHTML
// MAL:
<div dangerouslySetInnerHTML={{ __html: descripcionProducto }} />

// BIEN: instalar DOMPurify
// npm install dompurify @types/dompurify
import DOMPurify from 'dompurify';
const htmlSeguro = DOMPurify.sanitize(descripcionProducto);
<div dangerouslySetInnerHTML={{ __html: htmlSeguro }} />

// PELIGRO 2: Links con javascript:
// MAL:
<a href={userInput}>Click</a>

// BIEN: validar protocolo
const urlSegura = url.startsWith('https://') ? url : '#';
<a href={urlSegura}>Click</a>
```

---

## Checklist de Seguridad por Deploy

Ejecutar antes de cada release a producción:

```bash
# Backend
python manage.py check --deploy --fail-level WARNING
pip-audit --requirement requirements.txt
python -m pytest --tb=short  # Todos los tests deben pasar

# Frontend
npm audit --audit-level=high
npm run lint
npm run build  # El build no debe tener errores

# Manual
[ ] DEBUG = False en producción
[ ] SECRET_KEY no está en el repositorio
[ ] JWT_SIGNING_KEY es diferente de SECRET_KEY
[ ] CORS_ALLOWED_ORIGINS solo incluye el dominio de producción
[ ] Todas las cookies tienen Secure + HttpOnly + SameSite
[ ] HSTS habilitado
[ ] Logs de auditoría funcionando
[ ] Rate limiting probado manualmente
```
