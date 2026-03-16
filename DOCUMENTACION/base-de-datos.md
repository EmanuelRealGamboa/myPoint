# Base de Datos

**Motor**: PostgreSQL
**Base de datos**: `motoqfox_db`
**Usuario**: `postgres`
**Host**: `localhost:5432`

---

## Diagrama de Relaciones (estado actual)

```
branches_sedes
    │
    │  FK (nullable)
    ▼
  users ──── LoginAuditLog
  users ──── Turno
  users ──── PasswordResetToken
    │
    │  FK (ENCARGADO, WORKER, CASHIER, CASHIER)
    ▼
inventory_stock ──── inventory_productos ──── inventory_categorias
                                         ──── inventory_subcategorias
                                         ──── inventory_marcas_fabricante
                                         ──── inventory_modelos_moto (M2M)
    │
    ▼
sales_ventas ──── sales_venta_items ──── inventory_productos
sales_apertura_caja ──── sales_reporte_caja
sales_codigo_apertura ──── branches_sedes
```

---

## App `users`

### `CustomUser` — tabla `users`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | AutoField | PK | Clave primaria |
| email | EmailField(255) | UNIQUE, db_index | Identificador de login |
| first_name | CharField(150) | NOT NULL | Nombre(s) |
| last_name | CharField(150) | NOT NULL | Apellidos |
| phone | CharField(20) | blank=True | Teléfono |
| role | CharField(20) | choices | Rol del usuario |
| sede | FK(Sede) | null=True, SET_NULL | Sede asignada |
| is_active | BooleanField | default=True | Usuario activo |
| is_staff | BooleanField | default=False | Acceso admin Django |
| is_superuser | BooleanField | default=False | Superusuario |
| login_attempts | IntegerField | default=0 | Intentos fallidos consecutivos |
| locked_until | DateTimeField | null=True | Bloqueado hasta esta fecha |
| unlock_requested | BooleanField | default=False | Solicitud de desbloqueo manual |
| created_at | DateTimeField | default=now | Fecha de creación |
| updated_at | DateTimeField | auto_now | Última actualización |

**Roles disponibles:**

| Valor DB | Display | sede requerida |
|----------|---------|----------------|
| `ADMINISTRATOR` | Administrador | No (null) |
| `ENCARGADO` | Encargado | Sí |
| `WORKER` | Trabajador | Sí |
| `CASHIER` | Cajero | Sí |
| `CUSTOMER` | Cliente | No (null) |

**Properties:**
```python
user.is_administrator
user.is_encargado
user.is_worker
user.is_cashier
user.is_customer
user.get_full_name()
user.get_short_name()
```

**Lógica de bloqueo:**
- Tras 5 intentos fallidos: `locked_until = now + 30min`
- Se registra evento `ACCOUNT_LOCKED` en `LoginAuditLog`
- Admin puede desbloquear manualmente vía `POST /api/auth/admin/unlock/<id>/`

---

### `Turno` — tabla `users_turnos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| user | FK(CustomUser) | CASCADE |
| dia_semana | IntegerField | 0=Lunes … 6=Domingo |
| hora_inicio | TimeField | Hora de entrada |
| hora_fin | TimeField | Hora de salida |

---

### `LoginAuditLog` — tabla `users_login_audit_log`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| user | FK(CustomUser) | null=True (para intentos con email inexistente) |
| email_used | CharField | Email ingresado en el intento |
| event_type | CharField | `LOGIN_SUCCESS` / `LOGIN_FAILED` / `ACCOUNT_LOCKED` / `LOGOUT` / `TOKEN_REFRESH` |
| ip_address | GenericIPAddressField | null=True |
| user_agent | TextField | blank=True |
| timestamp | DateTimeField | auto_now_add |

---

### `PasswordResetToken` — tabla `users_password_reset_tokens`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| user | FK(CustomUser) | CASCADE |
| token | UUIDField | default=uuid4, UNIQUE |
| created_at | DateTimeField | auto_now_add |
| expires_at | DateTimeField | created_at + 1 hora |
| used | BooleanField | default=False |

---

## App `branches`

### `Sede` — tabla `branches_sedes`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | BigAutoField | PK | Clave primaria |
| name | CharField(100) | NOT NULL | Nombre de la sede |
| address | CharField(255) | NOT NULL | Dirección física |
| phone | CharField(20) | blank=True | Teléfono de contacto |
| is_active | BooleanField | default=True | Soft delete |
| created_at | DateTimeField | auto_now_add | Fecha de creación |
| updated_at | DateTimeField | auto_now | Última actualización |

---

## App `inventory`

### `Categoria` — tabla `inventory_categorias`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| name | CharField(100) | UNIQUE, nombre de la categoría |
| description | TextField | Descripción |
| is_active | BooleanField | default=True, soft delete |
| created_at | DateTimeField | auto_now_add |

---

### `Subcategoria` — tabla `inventory_subcategorias`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| categoria | FK(Categoria) | CASCADE, related='subcategorias' |
| name | CharField(100) | Nombre dentro de la categoría |
| description | TextField | Descripción |
| is_active | BooleanField | default=True |
| created_at | DateTimeField | auto_now_add |

**Restricción**: `unique_together = ('categoria', 'name')`

---

### `MarcaFabricante` — tabla `inventory_marcas_fabricante`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| name | CharField(100) | UNIQUE |
| tipo | CharField | `OEM` / `AFTERMARKET` / `GENERICO` |
| pais | CharField(50) | País de origen (opcional) |
| is_active | BooleanField | default=True |

---

### `MarcaMoto` — tabla `inventory_marcas_moto`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| name | CharField(80) | UNIQUE (Italika, Honda, Yamaha…) |
| is_active | BooleanField | default=True |

---

### `ModeloMoto` — tabla `inventory_modelos_moto`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| marca | FK(MarcaMoto) | CASCADE |
| modelo | CharField(100) | Ej: `FT125`, `CB190R` |
| año_desde | SmallIntegerField | default=2018 |
| año_hasta | SmallIntegerField | null=True (null = se sigue fabricando) |
| cilindraje | SmallIntegerField | null=True, en cc |
| tipo_motor | CharField | `2T` / `4T` / `ELECTRICO` |
| tipo_moto | CharField | `CARGO` / `NAKED` / `DEPORTIVA` / `SCOOTER` / `OFF_ROAD` / `CRUCERO` |
| is_active | BooleanField | default=True |

**Restricción**: `unique_together = ('marca', 'modelo', 'año_desde')`

---

### `Producto` — tabla `inventory_productos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| sku | CharField(50) | UNIQUE, auto-mayúsculas |
| name | CharField(200) | Nombre del producto |
| description | TextField | Descripción |
| imagen | ImageField | null=True, upload_to='products/' |
| codigo_barras | CharField(50) | db_index, auto-generado desde SKU si vacío |
| numero_parte_oem | CharField(80) | N° de parte del OEM |
| numero_parte_aftermarket | CharField(80) | N° de parte aftermarket |
| categoria | FK(Categoria) | null=True, SET_NULL |
| subcategoria | FK(Subcategoria) | null=True, SET_NULL |
| marca_fabricante | FK(MarcaFabricante) | null=True, SET_NULL |
| tipo_parte | CharField | `OEM` / `AFTERMARKET` / `REMANUFACTURADO` |
| unidad_medida | CharField | `PIEZA` / `PAR` / `KIT` / `LITRO` / `METRO` / `ROLLO` |
| price | DecimalField(10,2) | Precio de venta (IVA incluido) |
| cost | DecimalField(10,2) | Costo de compra |
| precio_mayoreo | DecimalField(10,2) | null=True, precio mayoreo |
| ubicacion_almacen | CharField(30) | Formato: `A-03-2-B` |
| peso_kg | DecimalField(6,3) | null=True |
| es_universal | BooleanField | default=False |
| aplicaciones | M2M(ModeloMoto) | through=CompatibilidadPieza |
| is_active | BooleanField | default=True |
| es_descontinuado | BooleanField | default=False |
| created_at | DateTimeField | auto_now_add |
| updated_at | DateTimeField | auto_now |

**`save()` override**: si `codigo_barras` está vacío, se copia desde `sku`.

---

### `CompatibilidadPieza` — tabla `inventory_compatibilidad_pieza`

Tabla intermedia (through model) para la relación M2M `Producto ↔ ModeloMoto`.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| producto | FK(Producto) | CASCADE |
| modelo_moto | FK(ModeloMoto) | CASCADE |
| año_desde | SmallIntegerField | null=True, override del rango |
| año_hasta | SmallIntegerField | null=True, override del rango |
| nota | CharField(200) | Ej: "Solo versión carburada" |

**Restricción**: `unique_together = ('producto', 'modelo_moto')`

---

### `Stock` — tabla `inventory_stock`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| producto | FK(Producto) | CASCADE |
| sede | FK(Sede) | CASCADE |
| quantity | IntegerField | default=0 |
| min_quantity | IntegerField | default=5, umbral de alerta |
| updated_at | DateTimeField | auto_now |

**Property**: `is_low_stock` — True si `quantity <= min_quantity`

---

### `EntradaInventario` — tabla `inventory_entradas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| producto | FK(Producto) | PROTECT |
| sede | FK(Sede) | PROTECT |
| quantity | IntegerField | Unidades recibidas |
| cost_unit | DecimalField(10,2) | Costo unitario de esta entrada |
| notes | TextField | Notas opcionales |
| created_by | FK(CustomUser) | null=True, SET_NULL |
| created_at | DateTimeField | auto_now_add |

**`create()` override**: incrementa `Stock.quantity` automáticamente (en `transaction.atomic`).

---

### `AuditoriaInventario` — tabla `inventory_auditorias`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| sede | FK(Sede) | CASCADE |
| fecha | DateField | Fecha del conteo físico |
| status | CharField | `DRAFT` / `FINALIZADA` |
| created_by | FK(CustomUser) | null=True, SET_NULL |
| created_at | DateTimeField | auto_now_add |

---

### `AuditoriaItem` — tabla `inventory_auditoria_items`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| auditoria | FK(AuditoriaInventario) | CASCADE |
| producto | FK(Producto) | CASCADE |
| stock_sistema | IntegerField | Cantidad según sistema al crear auditoría |
| stock_fisico | IntegerField | null=True, conteo físico |

**Property**: `diferencia = stock_fisico - stock_sistema`

Al finalizar auditoría: `@transaction.atomic` recorre items y ajusta `Stock.quantity = stock_fisico`.

---

## App `sales`

### `Venta` — tabla `sales_ventas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| sede | FK(Sede) | CASCADE |
| cajero | FK(CustomUser) | SET_NULL, null=True |
| cliente | FK(ClienteProfile) | null=True, SET_NULL |
| subtotal | DecimalField(10,2) | Suma de items antes de descuento |
| descuento | DecimalField(10,2) | default=0 |
| total | DecimalField(10,2) | subtotal - descuento (IVA incluido en price) |
| metodo_pago | CharField | `EFECTIVO` / `TARJETA` / `TRANSFERENCIA` |
| monto_pagado | DecimalField(10,2) | Lo que entregó el cliente |
| cambio | DecimalField(10,2) | monto_pagado - total |
| status | CharField | `COMPLETADA` / `CANCELADA` |
| puntos_ganados | IntegerField | default=0 |
| notas | TextField | blank=True |
| created_at | DateTimeField | auto_now_add |

---

### `VentaItem` — tabla `sales_venta_items`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| venta | FK(Venta) | CASCADE |
| producto | FK(Producto) | PROTECT |
| quantity | IntegerField | Unidades vendidas |
| unit_price | DecimalField(10,2) | Precio al momento de la venta |
| subtotal | DecimalField(10,2) | unit_price × quantity |

---

### `CodigoApertura` — tabla `sales_codigos_apertura`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| sede | FK(Sede) | CASCADE |
| generado_por | FK(CustomUser) | ENCARGADO que lo generó |
| codigo | CharField(6) | 6 dígitos numéricos |
| expires_at | DateTimeField | `created_at + 30 min` |
| usado | BooleanField | default=False |
| created_at | DateTimeField | auto_now_add |

---

### `AperturaCaja` — tabla `sales_apertura_caja`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| sede | FK(Sede) | CASCADE |
| cajero | FK(CustomUser) | CASCADE |
| codigo_apertura | FK(CodigoApertura) | SET_NULL, null=True |
| fecha_apertura | DateTimeField | auto_now_add |
| fecha_cierre | DateTimeField | null=True |
| status | CharField | `ABIERTA` / `CERRADA` |

**Restricción**: `unique_together = ('cajero', 'status')` donde `status='ABIERTA'` — un cajero solo puede tener 1 caja abierta.

---

### `ReporteCaja` — tabla `sales_reporte_caja`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BigAutoField | PK |
| apertura | OneToOneField(AperturaCaja) | CASCADE |
| total_efectivo | DecimalField(10,2) | |
| total_tarjeta | DecimalField(10,2) | |
| total_transferencia | DecimalField(10,2) | |
| total_ventas | DecimalField(10,2) | Suma total |
| num_ventas | IntegerField | Cantidad de ventas |
| archivo_pdf | FileField | null=True, auto-generado al cerrar caja |
| created_at | DateTimeField | auto_now_add |

---

## Diagrama ER completo

```
CustomUser
  ├── Turno (1:N)
  ├── LoginAuditLog (1:N)
  ├── PasswordResetToken (1:N)
  └── sede → Sede

Sede
  ├── Stock (1:N por sede)
  ├── EntradaInventario (1:N)
  ├── AuditoriaInventario (1:N)
  ├── CodigoApertura (1:N)
  ├── AperturaCaja (1:N)
  └── Venta (1:N)

Categoria ──1:N── Subcategoria

MarcaMoto ──1:N── ModeloMoto

Producto
  ├── Categoria (FK)
  ├── Subcategoria (FK)
  ├── MarcaFabricante (FK)
  ├── aplicaciones ──M:M── ModeloMoto (through CompatibilidadPieza)
  ├── Stock (1:N por sede)
  ├── EntradaInventario (1:N)
  └── VentaItem (1:N)

Venta
  ├── VentaItem (1:N)
  ├── cajero → CustomUser
  └── sede → Sede

AperturaCaja
  ├── ReporteCaja (1:1)
  ├── cajero → CustomUser
  └── codigo_apertura → CodigoApertura
```

---

## Migraciones

| App | Descripción |
|-----|-------------|
| `branches` | 0001_initial — crea tabla `branches_sedes` |
| `users` | 0001_initial — tabla `users` con todos los campos |
| `users` | 0002_customuser_sede — agrega FK `sede` |
| `users` | 0003... — agrega `login_attempts`, `locked_until`, `unlock_requested` |
| `users` | 0004... — agrega `Turno`, `LoginAuditLog`, `PasswordResetToken` |
| `inventory` | 0001_initial — todos los modelos de inventario |
| `inventory` | 0002... — agrega campo `imagen` a Producto |
| `sales` | 0001_initial — Venta, VentaItem, AperturaCaja, CodigoApertura, ReporteCaja |

> **Nota**: El usuario ejecuta `makemigrations` y `migrate` manualmente. Claude Code nunca lo hace.
