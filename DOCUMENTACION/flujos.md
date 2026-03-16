# Flujos Clave del Sistema

## Flujo de Login con enrutamiento por rol

```
Usuario ingresa email + password
        │
        ▼
POST /api/auth/login/
        │
   ¿Credenciales OK?
   /              \
  No              Sí
  │               │
  ▼               ▼
¿5 intentos?  tokenStore.setAccess(token.access)
  Sí → lock    tokenStore.setRefresh(token.refresh)   [sessionStorage]
  No → error   tokenStore.setUser(user)               [sessionStorage]
                    │
                    ▼
             Lee user.role
                    │
        ┌─────────┬─────────┬──────────┐
        │         │         │          │
  ADMINISTRATOR ENCARGADO WORKER    CASHIER
    /admin    /encargado  /worker  /cashier
```

---

## Flujo de Protección de Rutas

```
Usuario navega a /admin
        │
        ▼
  ProtectedRoute (allowedRoles=['ADMINISTRATOR'])
        │
  ¿isLoading?
  /          \
 Sí          No
 │            │
Spinner   ¿isAuthenticated?
           /            \
          No             Sí
           │              │
      → /login     ¿Tiene el rol correcto?
                    /              \
                   No               Sí
                    │                │
             → getRoleHome()    Renderiza
               (su panel)       la página
```

---

## Flujo de Refresh Token

```
Cualquier petición a la API
        │
Interceptor Axios agrega:
Authorization: Bearer <access_token>
        │
        ▼
  ¿Respuesta 401?
  /              \
 No              Sí
 │               │
OK         Intenta POST /api/auth/refresh/
           con el refresh_token (sessionStorage)
                │
        ¿Refresh OK?
        /           \
       Sí            No
        │              │
   tokenStore       clearAll()
   .setAccess(      → redirige a /login
   new_token)
   Reintenta
   petición original
```

---

## Flujo de Restauración de Sesión (F5)

```
App monta → AuthContext useEffect
        │
Lee refresh_token de sessionStorage
        │
  ¿Existe?
  /       \
 No        Sí
 │          │
logout   POST /api/auth/refresh/
state        │
         ¿OK?
         /    \
        Sí     No
         │       │
    setAccess  setIsAuthenticated(false)
    setUser    (ir a /login)
    (snapshot
    sessionStorage)
        │
   isLoading = false
```

---

## Flujo Multi-Sede

```
ADMINISTRATOR
    ├── sede = null (acceso global)
    ├── Ve estadísticas de TODAS las sedes
    ├── Puede filtrar dashboard con ?sede_id=X
    └── Puede crear / editar / desactivar sedes

ENCARGADO
    ├── sede = FK a su sede
    ├── Genera código de apertura de caja (30 min)
    ├── Ve cajas abiertas de su sede
    ├── Ve ventas y entradas de su sede
    └── Descarga reportes PDF de caja

WORKER / CASHIER
    ├── sede = FK a una sede específica
    ├── Su panel muestra nombre de la sede
    └── Solo ve inventario/ventas de su sede

CUSTOMER
    └── sede = null (sin sede asignada)
```

---

## Flujo POS — Apertura y Cierre de Caja

```
CashierPanel monta
        │
GET /api/sales/cajas/mi-estado/
        │
¿tiene_caja_abierta?
   /               \
  No                Sí
  │                  │
CajaClosedScreen   Sidebar + área principal
  │                  (POSView / SalesHistoryView)
  │
  │  [ENCARGADO genera código]
  │  POST /api/sales/cajas/generar-codigo/
  │  → retorna { codigo: "123456", expires_at }
  │
  │  Cajero ingresa código en CajaClosedScreen
  │  POST /api/sales/cajas/abrir/ { codigo }
  │         │
  │   Backend:
  │   1. Busca CodigoApertura activo (expires_at > now, !usado)
  │   2. Verifica que sea de la misma sede
  │   3. Crea AperturaCaja (status='ABIERTA')
  │   4. Marca codigo.usado = True
  │         │
  │  → CashierPanel recarga estado
  │  → muestra sidebar + POSView
  │
  │  [Cajero cierra sesión del día]
  │  POST /api/sales/cajas/<id>/cerrar/
  │         │
  │   Backend:
  │   1. AperturaCaja.status = 'CERRADA'
  │   2. Calcula totales por método de pago
  │   3. Genera PDF y crea ReporteCaja
  │   4. Retorna resumen
```

---

## Flujo POS — Realizar una Venta

```
POSView
        │
Usuario busca producto:
  ┌─── TextSearch: nombre/SKU/código barras
  └─── MotoSearch: Marca → Modelo → Año → Categoria → productos

ProductGrid muestra resultados
(con stock disponible de la sede)
        │
Click en producto → agrega a carrito (CartItem local)
Ajusta cantidad si es necesario
        │
Click "Pagar" → PaymentModal
        │
Selecciona método: EFECTIVO / TARJETA / TRANSFERENCIA
Ingresa monto pagado (efectivo → cambio automático)
Descuento opcional
        │
Click "Confirmar" → POST /api/sales/ventas/
{
  sede, items: [{producto, quantity, unit_price}],
  descuento, metodo_pago, monto_pagado
}
        │
  Backend (@transaction.atomic):
  1. Crea Venta
  2. Crea VentaItems
  3. Para cada item:
     Stock.select_for_update().filter(producto, sede)
     .update(quantity = F('quantity') - item.quantity)
  4. Retorna Venta completa
        │
Frontend:
  - Limpia carrito
  - Genera/imprime ticket PDF
  - Actualiza SalesHistoryView
```

---

## Flujo POS — Cancelar Venta

```
SalesHistoryView → Click "Cancelar" en una venta
        │
PATCH /api/sales/ventas/<id>/cancelar/
        │
  Backend (@transaction.atomic):
  1. Venta.status = 'CANCELADA'
  2. Para cada VentaItem:
     Stock.select_for_update().filter(producto, sede)
     .update(quantity = F('quantity') + item.quantity)
        │
Frontend actualiza la tabla
```

---

## Flujo Inventario — Gestión de Productos (ADMIN/WORKER)

```
DashboardPage → Inventario → Productos
        │
GET /api/inventory/products/ con filtros
        │
ProductsList (grid de cards)
        │
Click en card → ProductDetailModal
        │
Tabs:
  ├── Info General: todos los campos del producto
  ├── Compatibilidades:
  │     Lista de ModeloMoto compatibles
  │     Botón "Agregar" → POST /products/<id>/compatibility/
  │     Botón "Quitar" → DELETE /products/<id>/compatibility/<compat_id>/
  └── Stock:
        StockItem por sede (quantity / min_quantity / is_low_stock)

Editar producto → ProductFormModal → PUT /products/<id>/
Upload imagen → PATCH /products/<id>/image/ (multipart/form-data)
```

---

## Flujo Inventario — Búsqueda por Fitment (YMM)

```
POSView (MotoSearchMode) o ProductsList
        │
Usuario selecciona: Marca → Modelo → (Año)
        │
GET /api/inventory/products/?moto_modelo_id=<id>&sede_id=<id>
        │
Backend filtra:
  Q(es_universal=True) | Q(aplicaciones__id=moto_modelo_id)
        │
Retorna lista de productos compatibles + universales
con stock de la sede
```

---

## Flujo Inventario — Auditoría

```
AuditView → "Nueva auditoría"
        │
POST /api/inventory/audits/
{ sede: <id>, fecha: "2026-03-16" }
        │
Backend:
  1. Crea AuditoriaInventario (status='DRAFT')
  2. Para cada Stock activo de la sede:
     Crea AuditoriaItem(stock_sistema = Stock.quantity)
        │
Frontend muestra tabla con todos los items
        │
Usuario ingresa stock físico por item:
PATCH /api/inventory/audits/<id>/items/<item_id>/
{ stock_fisico: 23 }
        │
Al terminar → "Finalizar auditoría"
POST /api/inventory/audits/<id>/finalize/
        │
Backend (@transaction.atomic):
  Para cada AuditoriaItem con stock_fisico != null:
    Stock.select_for_update().filter(producto, sede)
    .update(quantity = item.stock_fisico)
  AuditoriaInventario.status = 'FINALIZADA'
```

---

## Flujo Seguridad — Bloqueo de Cuenta

```
Usuario intenta login con credenciales incorrectas
        │
Backend: login_attempts += 1
LoginAuditLog.create(event_type='LOGIN_FAILED')
        │
¿login_attempts >= 5?
        │
       Sí
        │
locked_until = now + 30min
LoginAuditLog.create(event_type='ACCOUNT_LOCKED')
        │
Respuesta 403: "Cuenta bloqueada hasta HH:MM"
        │
  ┌──────────────────────────────────────┐
  │ Admin ve LockedAccountsBanner         │
  │ Click "Desbloquear"                   │
  │ POST /api/auth/admin/unlock/<id>/     │
  │ → login_attempts = 0                  │
  │ → locked_until = null                 │
  └──────────────────────────────────────┘
```

---

## Flujo Reset de Contraseña

```
Usuario → "¿Olvidaste tu contraseña?"
        │
ForgotPasswordPage → POST /api/auth/password-reset/
{ email: "usuario@motoqfox.com" }
        │
Backend:
  1. Busca usuario por email
  2. Crea PasswordResetToken (UUID, expires_at = now + 1h)
  3. Envía email con link /reset-password?token=<UUID>
        │
Usuario abre link → ResetPasswordPage
        │
POST /api/auth/password-reset/confirm/
{ token, password, password_confirm }
        │
Backend:
  1. Valida token (existe, !usado, !expirado)
  2. user.set_password(password)
  3. token.usado = True
```

---

## Flujo Worker — Pedidos a Bodega

```
WorkerPanel monta
        │
Polling cada 6 segundos:
GET /api/pedidos/ (pedidos pendientes de la sede)
        │
Grid de PedidoBodega cards:
  - # pedido, hora, cajero solicitante
  - Items: producto + ubicacion_almacen
        │
Worker va al almacén, toma los productos
Click "Completar pedido" → PUT /api/pedidos/<id>/completar/
        │
Card desaparece del grid
```
