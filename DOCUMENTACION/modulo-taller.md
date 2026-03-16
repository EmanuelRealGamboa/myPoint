# Módulo de Taller — Plan de Implementación

## Objetivo

Agregar al sistema MotoQFox un módulo de **servicios de taller** (reparación de motos) que permita:
- Recibir motos, crear órdenes de servicio con cotización y asignarlas a mecánicos
- Que el cliente siga el estado de su moto desde la app móvil
- Que el mecánico solicite refacciones extra y el cliente las autorice desde el móvil
- Cobrar el servicio en caja al momento de entrega

## Roles nuevos

| Rol | Panel | sede requerida |
|-----|-------|----------------|
| `JEFE_MECANICO` | `/jefe-mecanico` | Sí |
| `MECANICO` | `/mecanico` | Sí |

Se agregan a `CustomUser.Role` en `users/models.py`. Son aditivos — no rompen nada existente.

## Flujo general

```
[Cliente llega] → Cajero busca cliente por QR/nombre → crea OrdenServicio + cotización
      ↓
Jefe de Mecánicos ve la orden en Kanban → asigna a un mecánico
      ↓
Mecánico trabaja → si necesita pieza extra → solicita → Cliente aprueba en app
      ↓
Mecánico marca LISTO → sistema envía email al cliente
      ↓
Cliente llega → muestra QR → Cajero cobra → ENTREGADO
```

## Estados del servicio

| Status | Quién lo cambia | Descripción |
|--------|----------------|-------------|
| `RECIBIDO` | Cajero (al crear) | Moto recibida, cotización entregada |
| `EN_PROCESO` | Jefe (al asignar) | Mecánico trabajando |
| `COTIZACION_EXTRA` | Mecánico (solicita pieza) | Esperando autorización del cliente |
| `LISTO` | Mecánico | Trabajo terminado, cliente notificado |
| `ENTREGADO` | Cajero | Moto entregada y cobrada |

Campo separado `pago_status`: `PENDIENTE_PAGO` | `PAGADO`

---

## FASE 1 — Backend: App `taller`

### Integración con sistema actual
- Usa `CustomUser` de `users` para cajero, jefe, mecánico
- Usa `ClienteProfile` de `customers` (ya tiene `qr_token`) para vincular al cliente
- Usa `Producto` de `inventory` para refacciones cotizadas y extra
- Usa `Stock` de `inventory` (decremento atómico al aprobar refacción extra)
- Usa Gmail SMTP configurado en `settings.py` para notificación LISTO
- Se agrega a `config/urls.py` como `path('api/taller/', include('taller.urls'))`

### Archivos nuevos — `backend/taller/`

```
taller/
├── __init__.py
├── models.py
├── serializers.py
├── views.py
├── urls.py
├── permissions.py
└── migrations/
    └── 0001_initial.py  ← generada por el usuario con makemigrations
```

### Archivos modificados (backend)

| Archivo | Cambio |
|---------|--------|
| `users/models.py` | Agregar `JEFE_MECANICO` y `MECANICO` a `Role` |
| `users/permissions.py` | Nuevas clases `IsJefeMecanicoOrAbove`, `IsMecanicoOrAbove` |
| `config/settings.py` | Agregar `'taller'` a `INSTALLED_APPS` |
| `config/urls.py` | Agregar `path('api/taller/', include('taller.urls'))` |

### Modelos `taller/models.py`

**`MotoCliente`** — moto registrada del cliente
```
cliente         → FK(ClienteProfile, null=True)   # null = walk-in sin cuenta
marca, modelo   CharField
año             SmallIntegerField
placa           CharField(20) blank
color           CharField(50) blank
notas           TextField blank
created_at      auto_now_add
```

**`ServicioMoto`** — orden de servicio
```
folio           CharField(20) UNIQUE  # "SVC-20260316-0001" auto-generado
sede            → FK(Sede)
cliente         → FK(ClienteProfile, null=True)
moto            → FK(MotoCliente, null=True)
descripcion     TextField

cajero          → FK(CustomUser)  # quien recibe
mecanico        → FK(CustomUser, null=True)  # asignado por jefe
asignado_por    → FK(CustomUser, null=True)

status          RECIBIDO | EN_PROCESO | COTIZACION_EXTRA | LISTO | ENTREGADO
pago_status     PENDIENTE_PAGO | PAGADO

mano_de_obra    DecimalField(10,2)  # cotización inicial mano de obra
total_refacciones DecimalField(10,2)  # suma de ServicioItems tipo REFACCION/EXTRA
total           DecimalField(10,2)  # mano_de_obra + total_refacciones

metodo_pago     null=True  # se llena al entregar
monto_pagado    DecimalField null=True
cambio          DecimalField null=True

cliente_notificado  BooleanField default=False

fecha_recepcion auto_now_add
fecha_inicio    null=True   # cuando mecánico empieza
fecha_listo     null=True   # cuando mecánico termina
fecha_entrega   null=True   # cuando cajero entrega
```

**`ServicioItem`** — líneas del ticket
```
servicio        → FK(ServicioMoto)
tipo            REFACCION | MANO_OBRA | EXTRA
descripcion     CharField(200)
producto        → FK(Producto, null=True)  # para REFACCION y EXTRA
cantidad        IntegerField default=1
precio_unitario DecimalField(10,2)
subtotal        DecimalField(10,2)
aprobado        BooleanField default=True  # False para EXTRA hasta cliente aprueba
created_by      → FK(CustomUser)
```

**`SolicitudRefaccionExtra`** — pieza extra pedida por mecánico
```
servicio        → FK(ServicioMoto)
mecanico        → FK(CustomUser)
producto        → FK(Producto)
cantidad        IntegerField
motivo          TextField
status          PENDIENTE | APROBADA | RECHAZADA
respondido_por  → FK(CustomUser, null=True)
created_at      auto_now_add
respondido_at   null=True
```

### Endpoints `taller/urls.py`

```
# Órdenes de servicio
POST   /api/taller/servicios/                     Cajero crea orden + cotización
GET    /api/taller/servicios/                     Lista (filtros: status, fecha, sede_id)
GET    /api/taller/servicios/<id>/                Detalle completo
PUT    /api/taller/servicios/<id>/                Cajero edita (solo si status=RECIBIDO)
PATCH  /api/taller/servicios/<id>/asignar/        Jefe asigna mecánico → EN_PROCESO
PATCH  /api/taller/servicios/<id>/listo/          Mecánico termina → LISTO + email al cliente
PATCH  /api/taller/servicios/<id>/entregar/       Cajero cobra → ENTREGADO
GET    /api/taller/servicios/por-qr/<uuid:token>/ Cajero busca servicio LISTO por QR del cliente

# Solicitudes de refacción extra
POST   /api/taller/solicitudes-extra/             Mecánico solicita pieza → status = COTIZACION_EXTRA
GET    /api/taller/solicitudes-extra/             Mecánico ve las suyas; Jefe/Cajero ven de la sede
PATCH  /api/taller/solicitudes-extra/<id>/aprobar/  Cajero aprueba → agrega a ticket + decrementa stock + status = EN_PROCESO
PATCH  /api/taller/solicitudes-extra/<id>/rechazar/ Cajero rechaza → status = EN_PROCESO

# Motos del cliente
GET    /api/taller/motos-cliente/                 Lista motos del cliente (o por cliente_id para cajero)
POST   /api/taller/motos-cliente/                 Crear moto
GET/PUT /api/taller/motos-cliente/<id>/           Detalle / editar

# App cliente (autenticado como CUSTOMER)
GET    /api/taller/mis-servicios/                 Servicios del cliente autenticado
GET    /api/taller/mis-servicios/<id>/            Detalle con solicitudes extra pendientes
```

### Lógica clave (backend)

**Crear servicio** (`POST /servicios/`):
- Genera folio automático: `f"SVC-{date.today():%Y%m%d}-{count+1:04d}"`
- Crea `ServicioItem` por cada refacción cotizada (tipo=REFACCION)
- Crea `ServicioItem` para mano de obra (tipo=MANO_OBRA)
- Si `pago_status=PAGADO` → decrementa stock de refacciones `@transaction.atomic`
- Calcula `total_refacciones` y `total` automáticamente

**Aprobar refacción extra** (`PATCH /solicitudes-extra/<id>/aprobar/`):
```python
@transaction.atomic
solicitud.status = 'APROBADA'
ServicioItem.objects.create(tipo='EXTRA', aprobado=True, ...)
Stock.select_for_update().filter(producto, sede).update(quantity=F('quantity') - cantidad)
# recalcular totales del servicio
servicio.total_refacciones = sum(items REFACCION+EXTRA aprobados)
servicio.total = servicio.mano_de_obra + servicio.total_refacciones
servicio.status = 'EN_PROCESO'
```

**Marcar listo** (`PATCH /listo/`):
- Cambia status a `LISTO`, guarda `fecha_listo`
- Si cliente tiene email → envía email usando `send_mail()` de Django (Gmail SMTP ya configurado)
- `cliente_notificado = True`

---

## FASE 2 — Frontend Admin: Integración en paneles existentes

### Integración con sistema actual
- Reutiliza `DashboardPage.css` para el layout (sidebar + área principal) de los paneles nuevos
- Reutiliza `ProtectedRoute.tsx` con `allowedRoles`
- Reutiliza `axios.config.ts` con interceptores JWT
- El `CashierPanel.tsx` existente se divide en dos tabs sin reescribirlo completamente

### Archivos modificados (frontend admin)

| Archivo | Cambio |
|---------|--------|
| `src/types/auth.types.ts` | Agregar `'JEFE_MECANICO' \| 'MECANICO'` a `UserRole` |
| `src/utils/roleUtils.ts` | Agregar rutas: `JEFE_MECANICO → '/jefe-mecanico'`, `MECANICO → '/mecanico'` |
| `src/App.tsx` | Agregar 2 rutas protegidas nuevas |
| `src/pages/CashierPanel.tsx` | Agregar tab "Servicios" junto al POS existente |

### Archivos nuevos (frontend admin)

```
src/types/taller.types.ts
src/api/taller.service.ts
src/pages/JefeMecanicoPanel.tsx
src/pages/MecanicoPanel.tsx
src/components/cashier/
  ├── ServiciosView.tsx        ← tab de servicios en el panel caja
  ├── NuevoServicioModal.tsx   ← crear orden: buscar cliente, moto, cotizar
  └── ServicioDetalleModal.tsx ← ver detalle, aprobar extra, cobrar
src/components/taller/
  ├── KanbanServiciosBoard.tsx ← para JefeMecanicoPanel
  └── MecanicoServicioCard.tsx ← para MecanicoPanel
```

### Detalle de componentes nuevos

**`CashierPanel.tsx`** — cambio mínimo
- Agregar state `activeTab: 'refacciones' | 'servicios'`
- Dos tabs en el sidebar: "Refacciones" (POS actual) | "Servicios" (nuevo)
- Badge contador en tab Servicios si hay servicios activos

**`ServiciosView.tsx`**
- Lista de servicios de la sede (status ≠ ENTREGADO)
- Filtro por status
- Botón "Nuevo Servicio" → `NuevoServicioModal`
- Badge naranja en cards con `COTIZACION_EXTRA`

**`NuevoServicioModal.tsx`** (3 pasos)
1. Buscar/crear cliente + seleccionar/crear moto
2. Descripción del servicio + agregar items de cotización
3. Resumen + seleccionar si paga ahora o al recoger

**`ServicioDetalleModal.tsx`**
- Timeline de estados
- Lista de items del ticket
- Si `COTIZACION_EXTRA`: botón Aprobar / Rechazar
- Si `LISTO`: formulario de cobro (método pago + monto)

**`JefeMecanicoPanel.tsx`**
- Sidebar: nombre sede, botón logout
- Área principal: Kanban 4 columnas (RECIBIDO | EN_PROCESO | COTIZACION_EXTRA | LISTO)
- Click en card → drawer detalle + botón "Asignar mecánico" (dropdown de mecánicos de la sede)

**`MecanicoPanel.tsx`**
- Layout simple (diseñado para tablet/TV — cards grandes)
- Lista de servicios asignados a él
- Click en servicio → detalle + botón "Pedir refacción extra" + botón "Marcar como LISTO"

---

## FASE 3 — Frontend Cliente (PWA): Seguimiento de servicios

### Integración con sistema actual
- Reutiliza `AuthContext.tsx`, `axios.config.ts`, design tokens de `variables.css`
- Reutiliza componentes `Toast`, `BottomNav`
- El tab "Cupones" (placeholder) se reemplaza por "Servicios"

### Archivos modificados (frontend-cliente)

| Archivo | Cambio |
|---------|--------|
| `src/types/customer.types.ts` | Agregar tipos `ServicioMoto`, `ServicioItem`, `SolicitudExtra` |
| `src/api/customers.service.ts` | Agregar endpoints de taller |
| `src/components/BottomNav.tsx` | Tab "Cupones" → "Servicios" (icono Wrench) con badge si hay activos |
| `src/App.tsx` | Agregar rutas `/servicios` y `/servicios/:id` |

### Archivos nuevos (frontend-cliente)

```
src/pages/
  ├── MisServiciosPage.tsx    ← lista de servicios del cliente
  └── DetalleServicioPage.tsx ← detalle + aprobar/rechazar refacción extra
```

### Detalle páginas nuevas

**`MisServiciosPage.tsx`**
- Lista: folio, descripción, moto (marca+modelo), status badge, total
- Excluye ENTREGADO por default (toggle para verlos)
- Badge naranja parpadeante en cards con `COTIZACION_EXTRA`

**`DetalleServicioPage.tsx`**
- Barra de progreso de estados (RECIBIDO → EN_PROCESO → LISTO → ENTREGADO)
- Info de la moto + descripción del servicio
- Items del ticket (refacciones + mano de obra)
- Totales
- Si `COTIZACION_EXTRA`: card destacada con la solicitud
  - Nombre producto, cantidad, motivo del mecánico
  - Botones: ✓ **Autorizar** | ✗ **Rechazar** → llaman al endpoint del backend
- Si `LISTO`: banner verde "¡Tu moto está lista! Pasa a recogerla"
- Badge pago: Pagado ✓ / Pendiente de pago

---

## Orden de implementación

```
FASE 1 (Backend)
  └─ A1. Roles nuevos en users/models.py
  └─ A2. Permisos nuevos en users/permissions.py
  └─ A3. App taller: models.py
  └─ A4. App taller: serializers.py + views.py + urls.py
  └─ A5. Registrar en settings + urls
  └─ A6. (Usuario) makemigrations taller + migrate

FASE 2 (Frontend Admin)
  └─ B1. types/auth.types.ts + roleUtils.ts + App.tsx
  └─ B2. types/taller.types.ts + api/taller.service.ts
  └─ B3. CashierPanel.tsx (agregar tab)
  └─ B4. ServiciosView + NuevoServicioModal + ServicioDetalleModal
  └─ B5. JefeMecanicoPanel + KanbanServiciosBoard
  └─ B6. MecanicoPanel + MecanicoServicioCard

FASE 3 (Frontend Cliente PWA)
  └─ C1. customer.types.ts + customers.service.ts
  └─ C2. App.tsx (rutas) + BottomNav.tsx (tab)
  └─ C3. MisServiciosPage.tsx
  └─ C4. DetalleServicioPage.tsx
```

---

## Puntos de fusión con el sistema actual

| Módulo nuevo | Se conecta con | Cómo |
|-------------|----------------|------|
| `ServicioMoto` | `ClienteProfile` (customers) | FK cliente + búsqueda por qr_token |
| `ServicioItem` | `Producto` (inventory) | FK producto para refacciones |
| Aprobar refacción | `Stock` (inventory) | decremento atómico igual que en ventas |
| Notificación LISTO | Gmail SMTP (settings) | `send_mail()` ya configurado |
| Cobro en caja | `CashierPanel` (frontend) | nuevo tab en panel existente |
| Seguimiento | `frontend-cliente` PWA | nuevas páginas en app existente |
| Roles nuevos | `users/models.py` | 2 valores nuevos en `Role.TextChoices` |

---

## Notas de implementación

- **Migraciones**: El usuario las ejecuta manualmente (`makemigrations taller`, `migrate`)
- **IVA incluido**: Los precios del servicio, igual que en ventas, incluyen IVA (no se agrega extra)
- **Stock**: Solo se decrementa refacciones cotizadas cuando `pago_status=PAGADO` al crear, o al aprobar una refacción extra (ambos usan `select_for_update + F()`)
- **Folio único**: Calculado por sede+fecha (`SVC-YYYYMMDD-NNNN`), no global
- **Walk-in**: Se puede crear un servicio sin cliente registrado (cliente=null) — se captura solo la moto
