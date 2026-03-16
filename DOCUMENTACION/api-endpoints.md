# API Endpoints

**Base URL**: `http://localhost:8000/api`
**Autenticación**: Bearer Token (JWT) en header `Authorization`
**Formato**: JSON

**Response format estándar:**
```json
{ "success": true, "message": "...", "data": {...}, "errors": {...} }
```

---

## Autenticación — `/api/auth/`

### POST `/api/auth/login/`
**Permisos**: Público

**Request:**
```json
{ "email": "admin@motoqfox.com", "password": "tu_password" }
```

**Response 200:**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "user": {
      "id": 1, "email": "admin@motoqfox.com",
      "first_name": "Admin", "last_name": "User", "full_name": "Admin User",
      "role": "ADMINISTRATOR", "sede": null,
      "is_active": true, "login_attempts": 0, "locked_until": null,
      "created_at": "2026-01-05T23:12:00Z"
    },
    "tokens": { "access": "eyJ...", "refresh": "eyJ..." }
  }
}
```

**Response 403 (cuenta bloqueada):**
```json
{ "success": false, "message": "Cuenta bloqueada hasta las 14:30", "errors": {} }
```

---

### POST `/api/auth/refresh/`
**Permisos**: Público

**Request:** `{ "refresh": "eyJ..." }`
**Response 200:** `{ "access": "eyJ...", "refresh": "eyJ..." }`

---

### GET `/api/auth/profile/`
**Permisos**: JWT requerido — Retorna el usuario autenticado completo.

---

### POST `/api/auth/password-reset/`
**Permisos**: Público

**Request:** `{ "email": "usuario@motoqfox.com" }`
**Response 200:** `{ "success": true, "message": "Email enviado" }`

---

### POST `/api/auth/password-reset/confirm/`
**Permisos**: Público

**Request:**
```json
{ "token": "uuid-aqui", "password": "NuevaPass1!", "password_confirm": "NuevaPass1!" }
```

---

### GET `/api/auth/admin/dashboard/summary/`
**Permisos**: JWT + `ADMINISTRATOR`

**Query params**: `?sede_id=1` (opcional)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total_users": 15, "total_administrators": 2,
      "total_encargados": 1, "total_workers": 5,
      "total_cashiers": 3, "total_customers": 4
    },
    "recent_users": [/* User[] */],
    "sedes_summary": [{ "id": 1, "name": "Sucursal Norte", "total_users": 8, ... }],
    "active_sede_filter": null,
    "user_info": { "name": "Admin", "email": "admin@motoqfox.com", "role": "ADMINISTRATOR" }
  }
}
```

---

### GET `/api/auth/locked-accounts/`
**Permisos**: JWT + `ADMINISTRATOR`

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "id": 5, "email": "worker@motoqfox.com", "full_name": "Juan Pérez",
      "locked_until": "2026-03-16T15:30:00Z", "login_attempts": 5 }
  ]
}
```

---

### POST `/api/auth/admin/unlock/<id>/`
**Permisos**: JWT + `ADMINISTRATOR`

Desbloquea manualmente una cuenta: `login_attempts = 0`, `locked_until = null`.

**Response 200:** `{ "success": true, "message": "Cuenta desbloqueada" }`

---

### GET `/api/auth/audit-log/`
**Permisos**: JWT + `ADMINISTRATOR`

**Query params**: `user_id`, `event_type`, `fecha_desde`, `fecha_hasta`, `page`, `page_size`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "logs": [
      { "id": 1, "email_used": "admin@...", "event_type": "LOGIN_SUCCESS",
        "ip_address": "127.0.0.1", "timestamp": "2026-03-16T10:00:00Z" }
    ],
    "pagination": { "total": 200, "page": 1, "page_size": 50, "total_pages": 4 }
  }
}
```

---

## Gestión de Usuarios — `/api/auth/users/`

> Todos requieren JWT + `ADMINISTRATOR`.

### GET `/api/auth/users/`
**Query params**: `search`, `role`, `sede_id`, `is_active`, `page`, `page_size`

### POST `/api/auth/users/`
```json
{
  "email": "nuevo@motoqfox.com", "first_name": "Carlos", "last_name": "Ramírez",
  "role": "WORKER", "sede": 1,
  "password": "MiPass123!", "password_confirm": "MiPass123!"
}
```
> `sede` requerida para `WORKER`, `CASHIER`, `ENCARGADO`.

### GET `/api/auth/users/<id>/`
### PUT `/api/auth/users/<id>/`
Campos actualizables: `first_name`, `last_name`, `role`, `sede`, `is_active`

### DELETE `/api/auth/users/<id>/`
Toggle `is_active` (soft). No elimina físicamente. No puede desactivarse a sí mismo.

---

## Sedes — `/api/branches/`

### GET `/api/branches/`
**Permisos**: JWT (cualquier rol)

### POST `/api/branches/`
**Permisos**: JWT + `ADMINISTRATOR`
```json
{ "name": "Sucursal Sur", "address": "Calle Secundaria 456", "phone": "555-0002" }
```

### GET/PUT/DELETE `/api/branches/<id>/`
DELETE hace toggle `is_active`.

---

## Inventario — `/api/inventory/`

> GET: `IsAuthenticated`. Escritura (POST/PUT): `IsAdministratorOrWorker`. DELETE: `IsAdministrator`.

### Categorías — `/api/inventory/categories/`

#### GET `/api/inventory/categories/`
**Query params**: `is_active`, `page`, `page_size`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "categories": [
      { "id": 1, "name": "Motor", "description": "...", "is_active": true,
        "product_count": 12,
        "subcategorias": [{ "id": 1, "name": "Pistón y Cilindro", "is_active": true }],
        "created_at": "..." }
    ],
    "pagination": { "total": 12, "page": 1, "page_size": 20, "total_pages": 1 }
  }
}
```

#### POST `/api/inventory/categories/`
```json
{ "name": "Motor", "description": "Partes del motor" }
```

#### GET/PUT/DELETE `/api/inventory/categories/<id>/`
DELETE hace toggle `is_active`. Rechaza con 400 si tiene productos activos.

---

### Subcategorías — `/api/inventory/subcategories/`

**Query params GET**: `categoria=<id>`, `is_active`, `page`, `page_size`

#### POST `/api/inventory/subcategories/`
```json
{ "categoria": 1, "name": "Válvulas", "description": "" }
```

---

### Marcas Fabricante — `/api/inventory/fabricante-brands/`

**Query params GET**: `is_active`, `tipo=OEM|AFTERMARKET|GENERICO`

**Response 200** (array sin paginación):
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "NGK", "tipo": "AFTERMARKET", "pais": "Japón", "is_active": true }
  ]
}
```

---

### Marcas de Moto — `/api/inventory/moto-brands/`

**Response 200** (array sin paginación):
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Italika", "is_active": true, "modelos_count": 7 }
  ]
}
```

---

### Modelos de Moto — `/api/inventory/moto-models/`

**Query params GET**: `marca=<id>`, `tipo_moto`, `search`, `page`, `page_size`

#### POST `/api/inventory/moto-models/`
```json
{
  "marca": 1, "modelo": "FT150", "año_desde": 2020,
  "cilindraje": 150, "tipo_motor": "4T", "tipo_moto": "CARGO"
}
```

---

### Productos — `/api/inventory/products/`

#### GET `/api/inventory/products/`
**Query params:**
| Param | Descripción |
|-------|-------------|
| `search` | Nombre, SKU, código barras, n° parte OEM/aftermarket |
| `categoria` | ID categoría |
| `subcategoria` | ID subcategoría |
| `marca_fabricante` | ID marca fabricante |
| `tipo_parte` | `OEM` / `AFTERMARKET` / `REMANUFACTURADO` |
| `moto_modelo_id` | Productos compatibles con ese modelo (incluye universales) |
| `barcode` | Coincidencia exacta de código de barras |
| `is_active` | `true` / `false` |
| `sede_id` | Para incluir stock de esa sede |
| `low_stock` | `true` = solo stock bajo |
| `page`, `page_size` | Paginación |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1, "sku": "NGK-CR7E", "name": "Bujía NGK CR7E",
        "imagen": "http://localhost:8000/media/products/bujia.jpg",
        "codigo_barras": "NGK-CR7E",
        "numero_parte_oem": "", "numero_parte_aftermarket": "CR7E",
        "categoria": 4, "categoria_name": "Eléctrico e Ignición",
        "subcategoria": 14, "subcategoria_name": "Bujía",
        "marca_fabricante": 1, "marca_fabricante_name": "NGK",
        "tipo_parte": "AFTERMARKET", "unidad_medida": "PIEZA",
        "price": "45.00", "cost": "28.00", "precio_mayoreo": "38.00",
        "ubicacion_almacen": "C-01-1-A", "peso_kg": null,
        "es_universal": false,
        "compatibilidades": [
          { "id": 1, "modelo_moto": 1, "modelo_moto_str": "Italika FT125 (2018+)",
            "marca_name": "Italika", "año_desde": null, "año_hasta": null, "nota": "" }
        ],
        "is_active": true, "es_descontinuado": false,
        "stock_items": [
          { "id": 1, "sede_id": 1, "sede_name": "Sucursal Norte",
            "quantity": 24, "min_quantity": 5, "is_low_stock": false }
        ],
        "total_stock": 24
      }
    ],
    "pagination": { "total": 85, "page": 1, "page_size": 20, "total_pages": 5 }
  }
}
```

#### POST `/api/inventory/products/`
```json
{
  "sku": "NGK-CR7E", "name": "Bujía NGK CR7E",
  "categoria": 4, "subcategoria": 14, "marca_fabricante": 1,
  "tipo_parte": "AFTERMARKET", "unidad_medida": "PIEZA",
  "price": 45.00, "cost": 28.00, "precio_mayoreo": 38.00,
  "ubicacion_almacen": "C-01-1-A", "es_universal": false
}
```

#### PATCH `/api/inventory/products/<id>/image/`
`Content-Type: multipart/form-data` — campo `imagen` (PNG/JPG, max 5 MB).
Elimina imagen anterior automáticamente.

---

### Compatibilidad — `/api/inventory/products/<id>/compatibility/`

#### POST
```json
{ "modelo_moto": 1, "nota": "Solo versión carburada" }
```

#### DELETE `/api/inventory/products/<id>/compatibility/<compat_id>/`

---

### Stock — `/api/inventory/stock/`

#### GET — `?sede_id=<int>` requerido, `?producto_id=<int>` opcional
#### PUT `/api/inventory/stock/<id>/` — actualizar `min_quantity`

---

### Entradas de Inventario — `/api/inventory/entries/`

#### POST
```json
{ "producto": 1, "sede": 1, "quantity": 50, "cost_unit": 28.00, "notes": "Factura F-001" }
```
Incrementa `Stock.quantity` automáticamente (`@transaction.atomic`).

---

### Auditorías — `/api/inventory/audits/`

#### POST — Crear auditoría
```json
{ "sede": 1, "fecha": "2026-03-16" }
```
Crea un `AuditoriaItem` por cada producto activo con stock en la sede.

#### GET `/api/inventory/audits/` — Lista auditorías
#### GET `/api/inventory/audits/<id>/` — Detalle con items

#### PATCH `/api/inventory/audits/<id>/items/<item_id>/`
```json
{ "stock_fisico": 23 }
```

#### POST `/api/inventory/audits/<id>/finalize/`
Cierra la auditoría (`status = FINALIZADA`) y ajusta stock. `@transaction.atomic`.

---

## Ventas — `/api/sales/`

### POST `/api/sales/ventas/`
**Permisos**: `IsCajeroOrAbove` (CASHIER, ENCARGADO, ADMINISTRATOR)

**Request:**
```json
{
  "sede": 1,
  "items": [
    { "producto": 3, "quantity": 2, "unit_price": 45.00 },
    { "producto": 7, "quantity": 1, "unit_price": 120.00 }
  ],
  "descuento": 0,
  "metodo_pago": "EFECTIVO",
  "monto_pagado": 250.00,
  "notas": ""
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Venta registrada",
  "data": {
    "id": 42, "sede": 1, "cajero": 3, "cajero_name": "Ana López",
    "items": [
      { "id": 1, "producto": 3, "producto_name": "Bujía NGK CR7E",
        "quantity": 2, "unit_price": "45.00", "subtotal": "90.00" }
    ],
    "subtotal": "210.00", "descuento": "0.00", "total": "210.00",
    "metodo_pago": "EFECTIVO", "monto_pagado": "250.00", "cambio": "40.00",
    "status": "COMPLETADA", "created_at": "2026-03-16T14:05:00Z"
  }
}
```

---

### GET `/api/sales/ventas/`
**Permisos**: `IsCajeroOrAbove`

**Query params**: `sede_id`, `fecha_desde`, `fecha_hasta`, `cajero_id`, `status`, `page`, `page_size`

---

### GET `/api/sales/ventas/<id>/`
**Permisos**: `IsCajeroOrAbove`

---

### PATCH `/api/sales/ventas/<id>/cancelar/`
**Permisos**: `IsEncargadoOrAbove`

Cambia `status = 'CANCELADA'` y restaura el stock de cada item (`@transaction.atomic`).

**Response 200:**
```json
{ "success": true, "message": "Venta cancelada y stock restaurado" }
```

---

## Caja — `/api/sales/cajas/`

### POST `/api/sales/cajas/generar-codigo/`
**Permisos**: `IsEncargadoOrAbove`

Genera un `CodigoApertura` de 6 dígitos válido 30 minutos para la sede del encargado.

**Response 200:**
```json
{ "success": true, "data": { "codigo": "482951", "expires_at": "2026-03-16T14:35:00Z" } }
```

---

### POST `/api/sales/cajas/abrir/`
**Permisos**: `IsCajeroOrAbove`

**Request:** `{ "codigo": "482951" }`

Backend valida: código activo, no usado, no expirado, misma sede que el cajero.

**Response 200:**
```json
{
  "success": true,
  "message": "Caja abierta",
  "data": { "id": 12, "sede": 1, "cajero": 3, "status": "ABIERTA", "fecha_apertura": "..." }
}
```

---

### GET `/api/sales/cajas/mi-estado/`
**Permisos**: `IsCajeroOrAbove`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "tiene_caja_abierta": true,
    "apertura": { "id": 12, "sede": 1, "cajero": 3, "status": "ABIERTA", "fecha_apertura": "..." }
  }
}
```

---

### POST `/api/sales/cajas/<id>/cerrar/`
**Permisos**: `IsCajeroOrAbove` (solo el cajero dueño de la caja)

Cierra la caja, calcula totales por método de pago, genera PDF de reporte.

**Response 200:**
```json
{
  "success": true,
  "message": "Caja cerrada",
  "data": {
    "total_efectivo": "1500.00", "total_tarjeta": "800.00",
    "total_transferencia": "0.00", "total_ventas": "2300.00", "num_ventas": 18
  }
}
```

---

### GET `/api/sales/cajas/activas/`
**Permisos**: `IsEncargadoOrAbove`

Retorna las cajas abiertas actualmente en la sede del encargado (o todas las sedes si ADMINISTRATOR).

---

## Reportes — `/api/sales/`

### GET `/api/sales/admin/resumen/`
**Permisos**: `ADMINISTRATOR`

Resumen por sede: ingresos (hoy / semana / mes / año), devoluciones, cajas abiertas, top productos.

---

### GET `/api/sales/reportes/`
**Permisos**: `IsEncargadoOrAbove`

**Query params**: `sede_id`, `fecha_desde`, `fecha_hasta`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "ventas_por_dia": [{ "fecha": "2026-03-16", "total": "2300.00", "num_ventas": 18 }],
    "top_productos": [{ "producto_name": "Bujía NGK CR7E", "total_vendido": 42 }],
    "resumen": { "total_periodo": "12500.00", "num_ventas": 95 }
  }
}
```

---

### GET `/api/sales/reportes-caja/`
**Permisos**: `IsEncargadoOrAbove` (filtra por sede si no es ADMINISTRATOR)

Lista reportes de cierre de caja con enlace de descarga PDF.

---

### GET `/api/sales/reportes-caja/<id>/descargar/`
**Permisos**: `IsEncargadoOrAbove`

Descarga el PDF del reporte de caja.

---

## Códigos de respuesta

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Creado |
| 400 | Bad Request (datos inválidos) |
| 401 | No autenticado |
| 403 | Sin permisos (rol incorrecto o cuenta bloqueada) |
| 404 | No encontrado |
