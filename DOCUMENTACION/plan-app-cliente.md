# Plan de Implementación — App Móvil de Clientes MotoQFox

> **Fecha de creación:** 10/03/2026
> **Estado:** Planificación
> **Autor:** Claude Code (análisis técnico)

---

## 1. Visión General

La **App de Clientes MotoQFox** es una aplicación móvil (descargable e instalable) que permite a los clientes de la tienda:

- Registrarse y tener un perfil digital
- Ver su historial de compras en tiempo real
- Recibir sus tickets digitales después de cada venta
- Acumular puntos y obtener cupones de descuento
- Mostrar un código QR para identificarse en caja
- Recibir notificaciones de promociones y beneficios

La cajera, desde el POS del sistema actual, escanea o busca al cliente y asocia la venta a su perfil automáticamente.

---

## 2. Análisis de Tecnologías

### 2.1 Opciones evaluadas

| Tecnología | Tipo | Lenguaje | iOS | Android | Notificaciones push | Complejidad |
|---|---|---|---|---|---|---|
| **PWA** | Web instalable | React/TS | ⚠️ Limitado (Safari) | ✅ | ⚠️ Solo Web Push | Baja |
| **React Native + Expo** | Nativa | React/TS | ✅ | ✅ | ✅ FCM + APNs | Media |
| **Flutter** | Nativa | Dart | ✅ | ✅ | ✅ | Alta (nuevo lenguaje) |
| **Ionic + Capacitor** | Web wrapeada | React/TS | ✅ | ✅ | ✅ | Media |

### 2.2 Recomendación: Estrategia en dos etapas

#### Etapa A — PWA (corto plazo, lanzamiento rápido)
**Usar React + TypeScript** (mismo stack del proyecto) como **Progressive Web App**.

- El cliente abre la URL desde su celular y toca "Agregar a inicio" → queda como app en su pantalla
- Sin necesidad de App Store ni Play Store
- Comparte código con el frontend actual (componentes, tipos, servicios)
- Se puede desarrollar y lanzar en semanas, no meses
- 100% online (no ocupa espacio de descarga real)

**Limitación principal:** en iPhone/Safari, las notificaciones push tienen soporte parcial (mejoró en iOS 16.4+). En Android funciona perfectamente.

#### Etapa B — React Native con Expo (mediano plazo, app nativa)
Cuando se quiera publicar en **App Store** y **Google Play** con experiencia nativa completa.

- Misma lógica de negocio en TypeScript, solo cambia la capa de UI (React Native components)
- **Expo** simplifica enormemente la compilación, distribución y actualizaciones OTA
- Push notifications reales con **Expo Notifications** (usa FCM para Android y APNs para iOS)
- Expo Go permite probar en el celular sin compilar
- Publicación en ambas tiendas desde un solo código

**Razón para no empezar aquí directamente:** requiere cuenta de desarrollador Apple ($99/año), proceso de aprobación de App Store (1-7 días), y configuración de certificados de push. La PWA entrega valor antes.

### 2.3 Stack Recomendado (completo)

```
Frontend App Cliente:
  Fase A: React 19 + TypeScript + Vite (PWA) — mismo stack
  Fase B: React Native + Expo SDK 52 + TypeScript

Backend (Django — ya existe, se extiende):
  - Nuevos endpoints en app `customers` y `coupons`
  - Extensión de app `sales` para asociar cliente

Notificaciones:
  Fase A: Email transaccional (SendGrid o Resend — gratuito hasta 3k/mes)
  Fase B: Expo Push Notifications (FCM + APNs, gratuito en volúmenes pequeños)

QR Code:
  Backend: librería `qrcode` (Python) — genera imagen PNG
  Frontend: librería `react-qr-code` (SVG puro, sin dependencias nativas)

Base de datos: PostgreSQL (ya existe, se añaden tablas nuevas)
```

---

## 3. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA MOTOQFOX                          │
│                                                              │
│  ┌─────────────┐     ┌──────────────┐    ┌───────────────┐  │
│  │  Admin Panel │     │ Encargado    │    │  Cajero (POS) │  │
│  │  (web)       │     │ (web)        │    │  (web)        │  │
│  └─────────────┘     └──────────────┘    └───────┬───────┘  │
│                                                  │           │
│                                          Escanea QR /        │
│                                          busca cliente        │
│                                                  │           │
│  ┌───────────────────────────────────────────────▼────────┐  │
│  │              Django REST API (backend)                  │  │
│  │  /api/customers/  /api/coupons/  /api/sales/ (extendido)│  │
│  └───────────────────────────────┬─────────────────────────┘  │
│                                  │                            │
│                             PostgreSQL                        │
└──────────────────────────────────┼─────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   APP MÓVIL CLIENTE          │
                    │   (PWA → React Native)       │
                    │                              │
                    │  Registro / Login            │
                    │  Mi QR                       │
                    │  Mis Compras + Tickets        │
                    │  Mis Cupones                 │
                    │  Mi Perfil                   │
                    └─────────────────────────────┘
```

---

## 4. Modelos de Base de Datos (nuevos)

### App `customers`

```python
class ClienteProfile(models.Model):
    """Extiende al CustomUser con rol CUSTOMER"""
    usuario      = OneToOneField(CustomUser, PROTECT, related_name='cliente_profile')
    telefono     = CharField(max_length=20, blank=True)
    fecha_nac    = DateField(null=True, blank=True)
    qr_token     = UUIDField(default=uuid4, unique=True)   # ID único para el QR
    foto_url     = CharField(max_length=500, blank=True)
    puntos       = PositiveIntegerField(default=0)          # puntos acumulados
    created_at   = DateTimeField(auto_now_add=True)
    class Meta: db_table = 'customers_perfiles'
```

### App `coupons`

```python
class TipoCupon(TextChoices):
    BIENVENIDA  = 'BIENVENIDA'   # al registrarse
    POST_COMPRA = 'POST_COMPRA'  # después de X compras
    CUMPLEANOS  = 'CUMPLEANOS'   # mes de cumpleaños
    MANUAL      = 'MANUAL'       # generado por admin/encargado

class Cupon(models.Model):
    codigo          = CharField(max_length=20, unique=True)  # ej. BIENVENIDA-A3F9
    tipo            = CharField(choices=TipoCupon)
    descripcion     = CharField(max_length=200)
    descuento_pct   = DecimalField(null=True)   # ej. 10.00 → 10%
    descuento_fijo  = DecimalField(null=True)   # ej. 50.00 → $50 MXN
    valido_desde    = DateTimeField()
    valido_hasta    = DateTimeField()
    usos_maximos    = PositiveIntegerField(default=1)
    usos_actuales   = PositiveIntegerField(default=0)
    sede            = FK(Sede, null=True)        # null = válido en todas
    is_active       = BooleanField(default=True)
    class Meta: db_table = 'coupons_cupones'

class CuponCliente(models.Model):
    """Asignación de un cupón a un cliente específico"""
    cliente  = FK(ClienteProfile, PROTECT)
    cupon    = FK(Cupon, PROTECT)
    canjeado = BooleanField(default=False)
    venta    = FK('sales.Venta', null=True)      # qué venta lo usó
    class Meta:
        db_table = 'coupons_cupones_cliente'
        unique_together = ('cliente', 'cupon')
```

### Extensión app `sales`

```python
# Agregar campo a Venta (migración):
cliente = FK('customers.ClienteProfile', null=True, blank=True, related_name='ventas')
puntos_ganados = PositiveIntegerField(default=0)
cupon_aplicado = FK('coupons.Cupon', null=True, blank=True)
```

---

## 5. Endpoints nuevos (API)

### Públicos (sin auth)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/customers/registro/` | Registro nuevo cliente |
| POST | `/api/customers/login/` | Login (usa el JWT existente) |

### Cliente autenticado
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/customers/perfil/` | Ver y editar perfil propio |
| GET | `/api/customers/mi-qr/` | Devuelve imagen PNG del QR |
| GET | `/api/customers/mis-compras/` | Historial de ventas asociadas |
| GET | `/api/customers/mis-compras/<id>/ticket/` | HTML/PDF del ticket |
| GET | `/api/customers/mis-cupones/` | Cupones disponibles |
| GET | `/api/customers/mis-puntos/` | Puntos acumulados |

### POS (cajero)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/customers/buscar/?q=<telefono/nombre>` | Buscar cliente en caja |
| GET | `/api/customers/por-qr/<token>/` | Obtener cliente por QR token |

### Admin / Encargado
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/customers/` | Listado de clientes (con filtros) |
| GET/PUT | `/api/customers/<id>/` | Ver/editar cliente |
| GET | `/api/coupons/` | Listado de cupones |
| POST | `/api/coupons/` | Crear cupón manual |
| POST | `/api/coupons/asignar/` | Asignar cupón a cliente(s) |

---

## 6. Pantallas de la App Móvil

### Flujo de usuario nuevo
```
Splash → Bienvenida → Registro → Verificación → Home
```

### Pantallas principales

| Pantalla | Descripción |
|----------|-------------|
| **Splash / Bienvenida** | Logo, botones "Iniciar sesión" / "Registrarse" |
| **Registro** | Nombre, email, teléfono, contraseña, fecha de nacimiento (opcional) |
| **Login** | Email + contraseña |
| **Home / Dashboard** | Puntos, cupones disponibles, última compra, QR rápido |
| **Mi QR** | Código QR grande y legible, nombre del cliente, botón "Aumentar brillo" |
| **Mis Compras** | Lista de ventas (fecha, total, sede) con scroll infinito |
| **Detalle de Compra** | Items, totales, método de pago, botón "Ver ticket" / "Compartir" |
| **Mis Cupones** | Lista de cupones activos (con código, vencimiento, estado) |
| **Mi Perfil** | Editar datos, foto de perfil, historial de puntos |
| **Notificaciones** | Inbox de mensajes/promociones recibidas |

---

## 7. Flujo Completo en Punto de Venta

```
Cliente llega a caja
        │
        ▼
Cajera pregunta: "¿Tienes la app?"
        │
  ┌─────┴─────┐
  │ SÍ        │ NO
  │           │
  ▼           ▼
Cliente abre  Cajera busca por
app → Mi QR   teléfono o nombre
  │           │
  └─────┬─────┘
        │
        ▼
POS muestra nombre + foto del cliente
Cupones activos del cliente aparecen
        │
        ▼
Cajera agrega productos al carrito
        │
        ▼
Si cliente tiene cupón → cajera lo selecciona → descuento aplicado
        │
        ▼
Cobro completado
        │
        ▼
Sistema automáticamente:
  ✓ Guarda venta con FK al cliente
  ✓ Suma puntos al cliente
  ✓ Marca cupón como canjeado (si se usó)
  ✓ Genera cupón post-compra (si aplica regla)
  ✓ Envía ticket digital por email / push notification
        │
        ▼
Cliente ve la compra en su app en tiempo real
```

---

## 8. Fases de Implementación

---

### FASE C0 — Preparación (1 semana)
**Objetivo:** Dejar el backend listo para recibir clientes.

**Backend:**
- [ ] Crear app Django `customers`
- [ ] Modelo `ClienteProfile` con `qr_token` (UUID)
- [ ] Endpoint POST `/api/customers/registro/` (público, sin JWT)
- [ ] Endpoint GET `/api/customers/perfil/` (cliente autenticado)
- [ ] Endpoint GET `/api/customers/mi-qr/` (retorna imagen QR en base64 o PNG)
- [ ] Endpoint GET `/api/customers/por-qr/<token>/` (para el POS)
- [ ] Endpoint GET `/api/customers/buscar/?q=` (para el POS)
- [ ] Migraciones

**Frontend POS:**
- [ ] En `POSView`, añadir sección "Asociar cliente" (sobre el carrito)
  - Input de búsqueda por nombre/teléfono → muestra nombre + foto
  - O botón "Escanear QR" (abre cámara en futuro; por ahora input manual)
- [ ] Al crear la venta (`PaymentModal`), incluir `cliente_id` si hay cliente seleccionado

**Entregables:** Clientes pueden registrarse vía API. La cajera puede asociar un cliente a la venta.

---

### FASE C1 — PWA Básica (2-3 semanas)
**Objetivo:** App instalable en el celular del cliente con registro, QR y compras.

**Proyecto nuevo:** `frontend-cliente/` (React + TypeScript + Vite)
- Configurado como PWA: `manifest.json` + Service Worker (`vite-plugin-pwa`)
- Diseño **mobile-first**, tema oscuro/claro
- Ruta de producción: `cliente.motoqfox.com` (o subpath `/app`)

**Pantallas:**
- [ ] Splash y bienvenida
- [ ] Registro (`POST /api/customers/registro/`)
- [ ] Login (usa el mismo JWT del sistema)
- [ ] Home / Dashboard (puntos, último ticket, acceso rápido al QR)
- [ ] Mi QR (imagen grande, nombre del cliente)
- [ ] Mis Compras (listado + detalle)
- [ ] Ver Ticket (HTML bonito del ticket)
- [ ] Mi Perfil (editar datos)

**Entregables:** Cliente puede descargar la "app" tocando "Agregar a pantalla de inicio", registrarse, ver su QR y su historial de compras.

---

### FASE C2 — Cupones y Puntos (1-2 semanas)
**Objetivo:** Sistema de fidelización básico.

**Backend:**
- [ ] Crear app Django `coupons`
- [ ] Modelos `Cupon` y `CuponCliente`
- [ ] Lógica automática al registrarse → generar `CuponCliente` de bienvenida (10% o $50)
- [ ] Lógica automática post-compra → cada 5 compras, generar cupón
- [ ] Endpoint GET `/api/customers/mis-cupones/`
- [ ] Endpoint POST `/api/coupons/canjear/` (se llama desde el POS al cobrar)
- [ ] Lógica de puntos: 1 punto por cada $10 MXN en compras

**POS:**
- [ ] Cuando se selecciona un cliente, mostrar sus cupones activos
- [ ] Permitir seleccionar y aplicar un cupón → descuento aplicado al total

**App cliente:**
- [ ] Pantalla "Mis Cupones" (código, descripción, vencimiento, QR del cupón)
- [ ] Pantalla "Mis Puntos" (total, historial de movimientos)

**Entregables:** Programa de lealtad funcional. Cliente ve sus cupones en la app, cajera los aplica en caja.

---

### FASE C3 — Notificaciones por Email (1 semana)
**Objetivo:** El cliente recibe su ticket y cupones por email automáticamente.

**Backend:**
- [ ] Integrar **Resend** o **SendGrid** (ambos tienen plan gratuito: 3,000 emails/mes)
- [ ] Template HTML de email para ticket de compra
- [ ] Template HTML de email de bienvenida (con cupón de bienvenida)
- [ ] Template HTML para notificación de nuevo cupón
- [ ] Disparar email automáticamente al completar una venta con cliente asociado
- [ ] Configuración en `.env`: `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`

**Entregables:** Cajera cierra venta → cliente recibe email con su ticket en segundos.

---

### FASE C4 — Panel de Clientes para Admin/Encargado (1 semana)
**Objetivo:** Visibilidad y gestión de la base de clientes.

**Frontend Admin:**
- [ ] Nueva sección "Clientes" en el panel admin
  - Tabla con: nombre, email, teléfono, # compras, total gastado, puntos, fecha registro
  - Filtros: sede, fecha de registro, rango de compras
  - Click en cliente → ver perfil completo + historial

**Frontend Encargado:**
- [ ] Card "Clientes de la sede" en SedeOverview
  - KPIs: total clientes, nuevos este mes, compras con cliente asociado (%)
- [ ] Vista de detalle de cliente con sus compras en la sede

**Entregables:** Administrador y encargado tienen visibilidad completa de su base de clientes.

---

### FASE C5 — React Native con Expo (2-4 semanas)
**Objetivo:** App nativa publicada en App Store y Google Play.

**Por qué en esta fase:**
- Antes de llegar aquí ya se tiene la PWA funcionando con usuarios reales
- Se puede reutilizar 80% de la lógica (hooks, servicios, tipos) de la PWA
- Se reescribe solo la capa de UI (React Native components)

**Setup:**
- [ ] Crear proyecto con `npx create-expo-app@latest cliente-native --template`
- [ ] Copiar `api/`, `types/`, `hooks/` desde la PWA
- [ ] Reemplazar HTML/CSS por componentes RN (`View`, `Text`, `FlatList`, etc.)
- [ ] Configurar **Expo Router** (file-based routing, similar a Next.js)

**Funcionalidades nativas adicionales:**
- [ ] **Push notifications reales** con `expo-notifications` (FCM + APNs)
  - Ticket llega como push, no solo email
  - Notificación de nuevo cupón disponible
- [ ] **Escaneo de QR en el POS** (en el celular de la cajera, si se desea)
- [ ] **Cámara para foto de perfil** con `expo-image-picker`
- [ ] **Biometría** (FaceID/Huella) para login rápido con `expo-local-authentication`
- [ ] **Modo offline** (ver últimas compras y QR sin internet)

**Publicación:**
- [ ] Build con `eas build --platform all`
- [ ] Submit a Google Play (`eas submit --platform android`)
- [ ] Submit a App Store (`eas submit --platform ios`) ← requiere cuenta Apple Dev

**Entregables:** App nativa descargable en ambas tiendas con push notifications.

---

## 9. Archivos del Proyecto

### Nuevos en backend
```
backend/
  customers/
    __init__.py
    apps.py
    models.py          # ClienteProfile
    serializers.py
    views.py
    urls.py
    migrations/
  coupons/
    __init__.py
    apps.py
    models.py          # Cupon, CuponCliente
    serializers.py
    views.py
    urls.py
    signals.py         # auto-crear cupón bienvenida al registrarse
    migrations/
```

### Nuevos en frontend (PWA)
```
frontend-cliente/
  public/
    manifest.json
    icons/             # app icons 192x192, 512x512
  src/
    api/
      customers.service.ts
      coupons.service.ts
    types/
      customer.types.ts
      coupon.types.ts
    components/
      QRDisplay.tsx
      TicketView.tsx
      CuponCard.tsx
    pages/
      SplashPage.tsx
      BienvenidaPage.tsx
      RegistroPage.tsx
      LoginPage.tsx
      HomePage.tsx
      MiQRPage.tsx
      MisComprasPage.tsx
      DetalleCompraPage.tsx
      MisCuponesPage.tsx
      MisPuntosPage.tsx
      PerfilPage.tsx
    App.tsx
    main.tsx
    vite.config.ts     # con vite-plugin-pwa
```

### Cambios en frontend admin/cajero existente
```
frontend/src/
  components/
    cashier/
      ClienteSelector.tsx    # nuevo: buscar/asociar cliente en POS
    admin/
      customers/
        ClientesListView.tsx  # nuevo: tabla de clientes
        ClienteDetailView.tsx # nuevo: perfil de cliente
    encargado/
      ClientesCard.tsx        # nuevo: KPIs de clientes en SedeOverview
  pages/
    DashboardPage.tsx         # agregar sección "Clientes"
    EncargadoPanel.tsx        # agregar ClientesCard
```

---

## 10. Estimación de Esfuerzo

| Fase | Descripción | Esfuerzo estimado |
|------|-------------|-------------------|
| C0 | Backend base clientes + integración POS | 3-5 días |
| C1 | PWA básica (registro, QR, historial) | 1-2 semanas |
| C2 | Cupones y puntos | 1 semana |
| C3 | Email transaccional | 2-3 días |
| C4 | Panel admin/encargado de clientes | 3-5 días |
| C5 | React Native + Expo (app nativa) | 2-4 semanas |

**Total estimado hasta PWA funcional (C0–C3):** ~4-6 semanas
**Total hasta app nativa publicada (C0–C5):** ~8-12 semanas

---

## 11. Dependencias y Costos

### Backend (Python)
```
qrcode[pil]     # generar QR en el backend
Pillow          # requerido por qrcode
resend          # email transaccional (plan gratuito: 3,000/mes)
```

### Frontend PWA
```
react-qr-code        # generar QR en el cliente (SVG)
vite-plugin-pwa      # convertir a PWA
workbox-*            # service worker
```

### Frontend React Native
```
expo                    # plataforma base
expo-router             # navegación
expo-notifications      # push notifications
expo-image-picker       # cámara / galería
expo-local-authentication  # biometría
expo-camera             # escaneo QR
react-native-qrcode-svg # mostrar QR
```

### Servicios externos (costos mensuales)
| Servicio | Uso | Costo |
|----------|-----|-------|
| **Resend** | Email transaccional | Gratis hasta 3,000/mes |
| **Expo EAS Build** | Compilar apps nativas | Gratis (1 build/mes) o $29/mes ilimitado |
| **Apple Developer** | Publicar en App Store | $99/año |
| **Google Play** | Publicar en Play Store | $25 único |
| **Hosting PWA** | Vercel / Netlify | Gratis en tier gratuito |

**Costo mínimo para lanzar la app nativa:** ~$124 USD el primer año (Apple + Google).
**La PWA no tiene costo adicional si se sirve desde el mismo servidor Django.**

---

## 12. Consideraciones de Seguridad

- El `qr_token` es un UUID v4 — prácticamente imposible de adivinar (2¹²² combinaciones)
- Los endpoints de cliente usan el mismo JWT que el sistema actual
- El registro público incluye rate limiting para evitar spam (`django-ratelimit`)
- Los datos de clientes (email, teléfono, fecha de nacimiento) se tratan como PII:
  - No se exponen en listados generales sin permiso de ENCARGADO o ADMINISTRATOR
  - Los logs de auditoría registran quién accedió a qué perfil
- Los cupones tienen validación de doble uso: `canjeado=True` + `usos_actuales >= usos_maximos`

---

## 13. Orden de Implementación Recomendado

```
1. FASE C0 → backend base + POS integration
   └── makemigrations customers → migrate
   └── Agregar ClienteSelector al POS

2. FASE C1 → PWA básica
   └── npm create vite@latest frontend-cliente
   └── Registro + Login + Mi QR + Mis Compras

3. FASE C2 → cupones y puntos
   └── makemigrations coupons → migrate
   └── Lógica automática de cupones
   └── Pantalla Mis Cupones en PWA

4. FASE C3 → emails
   └── Configurar Resend en .env
   └── Templates de email

5. FASE C4 → panel admin/encargado
   └── Sección Clientes en DashboardPage
   └── ClientesCard en EncargadoPanel

6. FASE C5 → React Native (cuando la PWA tenga usuarios reales)
   └── npx create-expo-app
   └── Migrar lógica de PWA
   └── Push notifications
   └── Publicación en tiendas
```

---

---

## 14. Diseño UI/UX — Identidad Visual y Experiencia de Usuario

---

### 14.1 Filosofía de Diseño

La app debe sentirse **premium pero accesible**. Los clientes de una tienda de motos y refacciones van desde mecánicos acostumbrados a la tecnología hasta personas mayores que vienen por primera vez. El diseño debe:

- **Ser rápido de entender:** el cliente debe poder mostrar su QR en menos de 3 toques desde que abre la app
- **Transmitir confianza:** colores sólidos, tipografía legible, sin elementos confusos
- **Sentirse moderno:** sin parecer una app bancaria anticuada ni una tienda genérica
- **Funcionar en celulares de gama baja:** sin animaciones pesadas, sin dependencias de 3D o WebGL

---

### 14.2 Identidad Visual

#### Paleta de colores

```
Primario:     #E53E00   (naranja-rojo intenso — acción, energía, motos)
Primario dark:#C93500   (hover / pressed)
Acento:       #FFB800   (amarillo dorado — puntos, premios, destacados)
Fondo base:   #0F0F0F   (negro profundo — modo oscuro por defecto)
Fondo card:   #1A1A1A   (gris oscuro — superficies elevadas)
Fondo input:  #242424   (gris para campos)
Borde:        #2E2E2E   (separadores sutiles)
Texto primary:#FFFFFF
Texto secondary: #A0A0A0
Texto disabled:  #555555
Éxito:        #22C55E
Error:        #EF4444
```

**¿Por qué modo oscuro por defecto?**
Los talleres mecánicos y tiendas de refacciones suelen tener luz intensa o sol directo. El modo oscuro con alto contraste es más legible en exteriores y da una identidad visual más fuerte.

> Se puede incluir modo claro opcional en el perfil del usuario.

#### Tipografía

```
Títulos:     Inter — Bold / ExtraBold (700-800)
Cuerpo:      Inter — Regular / Medium (400-500)
Números/QR:  JetBrains Mono o Space Mono (para folios, códigos)
```

Inter es gratuita, carga rápido, excelente legibilidad en pantallas pequeñas.

#### Iconografía

- Librería: **Lucide Icons** (ya usada en el sistema actual — consistencia)
- Tamaño mínimo de ícono tocable: 44×44px (guía Apple HIG)
- Íconos de navegación inferior: outline cuando inactivo, filled cuando activo

#### Radio y sombras

```
Radius pequeño:  8px   (inputs, badges)
Radius medio:    16px  (cards, modales)
Radius grande:   24px  (bottom sheets, QR container)
Radius full:     9999px (pills, botones primarios)

Sombra card:     0 4px 24px rgba(0,0,0,0.4)
Sombra elevado:  0 8px 40px rgba(0,0,0,0.6)
```

---

### 14.3 Componentes Base

#### Botón primario
```
Fondo: #E53E00 → gradiente sutil a #FF5722
Texto: blanco, 15px, semibold
Padding: 16px horizontal, 14px vertical
Radius: 9999px (pill)
Estado pressed: scale(0.97) + brillo reducido
Estado disabled: opacity 0.4
```

#### Botón secundario
```
Fondo: transparente
Borde: 1.5px solid #2E2E2E
Texto: #A0A0A0
Mismo tamaño que primario
```

#### Cards
```
Fondo: #1A1A1A
Borde: 1px solid #2E2E2E
Radius: 16px
Padding: 18px
Sombra: 0 4px 24px rgba(0,0,0,0.4)
```

#### Inputs
```
Fondo: #242424
Borde: 1.5px solid #2E2E2E → #E53E00 cuando focused
Label: encima del input, 12px, #A0A0A0
Placeholder: #555555
Texto: #FFFFFF, 15px
Radius: 12px
Padding: 14px 16px
```

#### Badge de puntos (acento dorado)
```
Fondo: rgba(255, 184, 0, 0.15)
Borde: 1px solid rgba(255, 184, 0, 0.3)
Texto: #FFB800, bold
Radius: 9999px
Padding: 4px 10px
```

---

### 14.4 Navegación

#### Estructura de navegación

```
App
├── Auth Stack (sin tab bar)
│   ├── SplashScreen
│   ├── BienvenidaScreen
│   ├── LoginScreen
│   └── RegistroScreen
│
└── Main Stack (con tab bar inferior)
    ├── Tab: Inicio       (ícono: Home)
    ├── Tab: Mi QR        (ícono: QrCode — centro, destacado)
    ├── Tab: Compras      (ícono: Receipt)
    ├── Tab: Cupones      (ícono: Tag)
    └── Tab: Perfil       (ícono: User)
```

#### Tab bar inferior
```
Fondo:         #0F0F0F con blur backdrop
Borde top:     1px solid #1F1F1F
Altura:        68px + safe area bottom
Tab activa:    ícono filled + label #E53E00
Tab inactiva:  ícono outline + label #555555

Tab central "Mi QR":
  - Botón elevado (floating), circular
  - Fondo: gradiente #E53E00 → #FF7A00
  - Sombra: 0 0 20px rgba(229,62,0,0.5)
  - 10px más alto que los demás tabs
  - Efecto glow para que el ojo lo encuentre de inmediato
```

---

### 14.5 Diseño de Pantallas — Detalle

---

#### SPLASH SCREEN (0.5–1 seg)
```
Fondo: #0F0F0F
Centro: logo MotoQFox animado (fade-in + scale de 0.8 → 1.0)
Duración: 800ms → navega automáticamente
Sin texto adicional
```

---

#### PANTALLA DE BIENVENIDA
```
Layout: pantalla completa, fondo oscuro

[Imagen/ilustración superior — 55% de la pantalla]
  Ilustración de moto estilizada o foto del local
  Con gradiente negro en la parte inferior para transición suave

[Contenido inferior]
  Logo pequeño + "MotoQFox"
  Título: "Tu taller, en tu bolsillo"  (32px, ExtraBold)
  Subtítulo: "Guarda tus compras, acumula puntos y recibe ofertas exclusivas."
             (16px, Regular, color secundario, max 2 líneas)

[Botones]
  [  Crear cuenta  ]   ← botón primario pill, ancho completo
  [  Iniciar sesión ]  ← botón secundario, ancho completo

  Separador "o"

  [  Continuar sin cuenta  ]  ← texto link, 14px, color secundario
```

---

#### REGISTRO
```
Header: flecha atrás + "Crear cuenta"

Indicador de pasos: ●●○ (3 pasos)

PASO 1 — Datos personales
  - Nombre completo
  - Email
  - Contraseña (con toggle ojo)

PASO 2 — Contacto
  - Teléfono (con prefijo +52 fijo)
  - Fecha de nacimiento (date picker nativo)
  - Opcional: "Saltar por ahora" en texto pequeño

PASO 3 — Confirmación / Bienvenida
  Animación confetti / checkmark animado
  "¡Bienvenido, [Nombre]!"
  "Ya tienes tu cupón de bienvenida esperándote"
  Botón: "Ver mi cupón →"

Cada paso tiene validación inline (no esperar al submit):
  - Email: validar formato al salir del campo
  - Contraseña: barra de fortaleza (débil/media/fuerte)
  - Teléfono: solo números, max 10 dígitos
```

---

#### HOME / DASHBOARD
```
[Header]
  "Hola, [Nombre] 👋"  (20px, ExtraBold)
  Notificación bell con badge si hay novedades

[Hero card — puntos]
  Card grande con gradiente naranja (#E53E00 → #FF7A00)
  Ícono de estrella dorada
  "Tus puntos"
  Número grande: "1,250 pts"  (48px, ExtraBold)
  Subtítulo: "Equivalen a $125.00 en descuentos"
  Barra de progreso hacia siguiente nivel

[Acceso rápido al QR]
  Card horizontal oscura
  QR en miniatura (48x48)
  "Mostrar mi QR en caja"  (texto + flecha →)
  Toque → navega a pantalla Mi QR con transición

[Mis cupones activos]
  Título: "Cupones disponibles  [Ver todos →]"
  Scroll horizontal de CuponCards
  Si no hay: card vacía con "Próximamente tendrás descuentos"

[Última compra]
  Título: "Última compra"
  Card con: fecha, sede, total, N productos
  Botón "Ver ticket" alineado a la derecha

[Banner promocional] (si hay promo activa)
  Card con imagen + texto + countdown si aplica
```

---

#### MI QR (tab central — pantalla más importante)
```
[Header]
  "Mi código QR"
  Botón ícono brillo (aumenta brightness del sistema al 100%)

[Instrucción]
  "Muéstraselo a la cajera al momento de pagar"
  (13px, color secundario, centrado)

[QR Container]
  Card blanca, radius 24px, padding 24px
  Fondo BLANCO para máximo contraste del QR (aunque la app sea oscura)
  QR centrado, tamaño: min(80vw, 300px)
  Debajo del QR:
    Foto circular del cliente (40px) + Nombre completo
    ID corto: "#MQF-00042" (monospace, gris)

[Estado de la sesión]
  Badge verde: "● Activo"  cuando el token es válido
  Al tocar: información sobre qué es el QR

[Acciones]
  [  Compartir QR  ]   ← compartir imagen del QR
  Texto: "El QR no expira. Solo tú puedes verlo."

Animación de entrada:
  QR hace scale 0 → 1 con spring animation (se "abre" al entrar)
```

---

#### MIS COMPRAS
```
[Header]
  "Mis compras"
  Filtro (ícono) → modal con opciones: Todas / Este mes / Por sede

[Resumen rápido — fila de pills]
  Total compras: 12   |   Total gastado: $4,200   |   Puntos ganados: 420

[Lista de compras]
  Cada item es una card:

  ┌─────────────────────────────────────┐
  │  [Ícono sede]  Sede Norte           │  ← nombre sede, pequeño
  │  Filtro de aceite + 2 más…          │  ← productos (truncado)
  │                           $350.00 → │  ← total, flecha
  │  15 Feb 2026 · #MQF-000098          │  ← fecha + folio, gris
  └─────────────────────────────────────┘

  Badge de estado:
    COMPLETADA → verde sutil
    CANCELADA  → rojo tachado

  Scroll infinito (paginación transparente)
  Estado vacío: ilustración + "Aún no tienes compras registradas"
```

---

#### DETALLE DE COMPRA
```
[Header] ← back + "Compra #000098"

[Info superior]
  Fecha y hora  ·  Sede  ·  Cajero
  Método de pago (ícono + texto)

[Productos]
  Lista con: nombre, cantidad, precio unitario, subtotal
  Línea separadora
  Descuento aplicado (si hay)
  TOTAL en grande

[Cupón aplicado]
  Badge especial si se usó un cupón: "Cupón BIENVENIDA-XX aplicado: -$50"

[Puntos ganados]
  Badge dorado: "+35 puntos ganados en esta compra"

[Botones de acción]
  [  Ver ticket completo  ]  ← abre TicketView
  [  Compartir ticket     ]  ← share nativo del SO
```

---

#### MIS CUPONES
```
[Header]
  "Mis cupones"
  Badge con cantidad: "3 disponibles"

[Tabs]
  Disponibles  |  Usados  |  Expirados

[Cada CuponCard]
  ┌─────────────────────────────────────┐
  │  🏷️  10% de descuento              │
  │       En tu próxima compra          │
  │                                     │
  │  Código: BIENVENIDA-A3F9            │  ← monospace
  │  Válido hasta: 30 Abr 2026          │
  │                                     │
  │  [  Mostrar en caja  ]              │
  └─────────────────────────────────────┘

  Borde izquierdo de 4px en color naranja (disponible) / gris (expirado)

  "Mostrar en caja" → pantalla full con el código en grande + QR del cupón
  (mismo concepto que Mi QR, para que la cajera lo aplique)

[Estado vacío]
  Ilustración + "Completa una compra para ganar tu primer cupón"
```

---

#### MI PERFIL
```
[Header foto]
  Foto circular grande (80px) + cámara/editar encima
  Nombre completo (20px, bold)
  Email (14px, gris)
  Badge nivel: "Cliente Plata ⭐"

[Resumen de actividad]
  Fila de 3 métricas:
  Compras: 12  |  Puntos: 1,250  |  Ahorrado: $180

[Secciones]
  Editar perfil →
  Cambiar contraseña →
  Notificaciones →
  Tema de la app (oscuro/claro) →
  ─────────────────────
  Cerrar sesión  (texto rojo)
```

---

### 14.6 Microinteracciones y Animaciones

Todas deben ser **rápidas (150–300ms)** y **con propósito**. No animar por animar.

| Elemento | Animación | Duración |
|----------|-----------|----------|
| Botón al tocar | scale(0.96) + ligero darken | 100ms |
| Navegación entre tabs | fade + translateY sutil | 200ms |
| Card de puntos | número hace count-up al entrar | 600ms |
| QR al abrir Mi QR | scale 0.5→1 con spring | 300ms |
| Cupón al marcar como usado | slide-out + verde flash | 250ms |
| Pull to refresh | spinner naranja personalizado | — |
| Toast de error/éxito | slide desde abajo + autocierre 3s | 300ms |
| Skeleton loading | shimmer de izquierda a derecha | loop |
| Bottom sheet / modal | slide desde abajo | 300ms ease-out |
| Confetti al registrarse | burst de partículas naranjas/doradas | 1.5s |

**Regla:** Si el usuario no nota la animación conscientemente pero se siente fluido → está bien.

---

### 14.7 Estados y Feedback

Cada acción debe tener respuesta visual inmediata:

```
LOADING:
  Botones → spinner inline reemplaza texto, botón se deshabilita
  Listas  → skeleton cards (3 placeholders grises con shimmer)
  Pantallas completas → skeleton de la estructura completa (no spinner centrado)

ERROR:
  Inline en inputs → texto rojo debajo del campo, ícono ⚠️
  Error de red → toast rojo desde abajo: "Sin conexión. Verifica tu internet."
  Error de servidor → toast con mensaje específico

ÉXITO:
  Toast verde desde abajo: "✓ Perfil actualizado"
  Checkout → pantalla de confirmación completa (no toast)

VACÍO:
  Cada pantalla tiene su propio estado vacío con:
    - Ilustración (SVG simple, no fotos)
    - Título descriptivo
    - Subtítulo explicativo
    - Botón de acción si aplica (ej. "Ver productos" en compras vacías)
```

---

### 14.8 Accesibilidad

- **Contraste mínimo WCAG AA:** ratio 4.5:1 para texto normal, 3:1 para texto grande
- **Tamaño mínimo de toque:** 44×44px en todos los elementos interactivos
- **No depender solo del color:** los estados (error, éxito, deshabilitado) siempre tienen texto o ícono además del color
- **Fuente base:** mínimo 14px en móvil, 15px recomendado para cuerpo
- **Respeta la escala de fuente del SO:** usar unidades relativas (rem/sp), no px fijos
- **Soporte de lectores de pantalla:** `aria-label` en íconos sin texto, roles semánticos correctos

---

### 14.9 Diseño Responsive y Soporte de Dispositivos

#### Breakpoints (PWA)
```
Mobile pequeño:  320px – 375px   (iPhone SE, Moto G)
Mobile estándar: 376px – 430px   (iPhone 15, Galaxy S)
Mobile grande:   431px – 480px   (iPhone Plus, Galaxy Ultra)
Tablet:          768px+          (layout de 2 columnas en home)
```

#### Zonas seguras
- `padding-bottom: env(safe-area-inset-bottom)` en tab bar (iPhone con notch/Dynamic Island)
- `padding-top: env(safe-area-inset-top)` en headers (Android con cámara perforada)

#### Gestos
- **Swipe hacia abajo** en modales/bottom sheets → cerrar
- **Pull to refresh** en listas de compras y cupones
- **Long press** en cupón → copiar código al portapapeles
- **Pinch to zoom** deshabilitado (interfiere con la interfaz)

---

### 14.10 Pantallas de Onboarding (primera vez)

Después del registro exitoso, 3 slides de introducción (se puede saltar):

```
Slide 1 — QR
  Ilustración: mano sosteniendo teléfono con QR frente a caja
  Título: "Tu identificación digital"
  Texto: "Muestra tu QR en caja y acumula puntos en cada compra."

Slide 2 — Cupones
  Ilustración: ticket con porcentaje dorado
  Título: "Descuentos que se ganan"
  Texto: "Recibe cupones por registrarte, en tu cumpleaños y después de cada compra."

Slide 3 — Historial
  Ilustración: lista de compras en teléfono
  Título: "Tus compras, siempre disponibles"
  Texto: "Consulta tus tickets en cualquier momento desde aquí."

[Indicadores de slide: ●●● / botón "Siguiente" / "Saltar" en esquina]
Último slide: botón "¡Empezar!" → Home
```

---

### 14.11 Modo Claro (opcional, configurable desde perfil)

```
Fondo base:   #F5F5F5
Fondo card:   #FFFFFF
Borde:        #E5E5E5
Texto:        #111111
Texto sec:    #666666
Primario:     #E53E00  (igual)
Acento:       #D4A000  (dorado más oscuro para contraste en fondo claro)
```

El modo claro se guarda en `localStorage` / `AsyncStorage` y persiste entre sesiones.

---

### 14.12 Flujo de Usuario — Mapa Completo

```
PRIMERA VEZ:
Splash → Bienvenida → Registro (3 pasos) → Confetti → Onboarding (3 slides) → Home

USUARIO RECURRENTE:
Splash → Login → Home

DESDE HOME — acciones más frecuentes:
Home ──────────────────────────────────────────────────────┐
  │                                                        │
  ├─[tap QR card]──────────→ Mi QR (full screen)          │
  │                                                        │
  ├─[tap cupón]────────────→ Detalle cupón → Mostrar      │
  │                          en caja (full screen)        │
  │                                                        │
  ├─[tap última compra]────→ Detalle compra → Ticket      │
  │                                                        │
  └─[tap puntos card]──────→ Mi Perfil → Mis Puntos       │
                                                           │
TAB BAR:                                                   │
  🏠 Inicio ────────────────────────────────────────── Home│
  🧾 Compras ──────────────→ Lista → Detalle → Ticket    │
  [ QR ] ─────────────────→ Mi QR (directo)              │
  🏷️ Cupones ──────────────→ Lista → Detalle → En caja  │
  👤 Perfil ───────────────→ Perfil → Editar / Config    │
```

---

*Este documento es un plan vivo. Actualizar al completar cada fase.*
