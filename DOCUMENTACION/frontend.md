# Frontend — React + TypeScript

## Rutas de la aplicación

| Ruta | Componente | Protección |
|------|-----------|------------|
| `/login` | `LoginPage` | Pública |
| `/forgot-password` | `ForgotPasswordPage` | Pública |
| `/reset-password` | `ResetPasswordPage` | Pública |
| `/admin` | `DashboardPage` | JWT + rol `ADMINISTRATOR` |
| `/encargado` | `EncargadoPanel` | JWT + rol `ENCARGADO` |
| `/worker` | `WorkerPanel` | JWT + rol `WORKER` |
| `/cashier` | `CashierPanel` | JWT + rol `CASHIER` |
| `/` | `RootRedirect` | Redirige según rol |
| `*` | `RootRedirect` | Redirige según rol |

---

## Páginas

### `LoginPage.tsx`
- Formulario email + contraseña con eye toggle para ver/ocultar contraseña
- Al hacer login exitoso, navega automáticamente al panel del rol
- Muestra mensaje de cuenta bloqueada si corresponde
- Links a "¿Olvidaste tu contraseña?"

### `ForgotPasswordPage.tsx`
- Formulario de email para solicitar reset
- Llama `POST /api/auth/password-reset/`
- Muestra confirmación de envío

### `ResetPasswordPage.tsx`
- Lee token desde query param `?token=`
- Formulario nueva contraseña + confirmación
- Llama `POST /api/auth/password-reset/confirm/`

### `DashboardPage.tsx` — Panel ADMINISTRATOR
- Layout de shell con **sidebar lateral** (240 px) + área principal
- Sidebar colapsable en móvil (overlay)
- Topbar con título de sección y botón Salir

**Secciones del sidebar:**

| Sección | Subsección | Componente |
|---------|-----------|------------|
| Dashboard | — | `DashboardOverview` |
| Admin | Usuarios | `<UsersList />` |
| Admin | Sedes | `<SedesList />` |
| Admin | Seguridad | `<SecurityView />` |
| Inventario | Productos | `<ProductsList />` |
| Inventario | Categorías | `<CategoriesList />` |
| Inventario | Subcategorías | `<SubcategoriesList />` |
| Inventario | Fabricantes | `<FabricantesList />` |
| Inventario | Catálogo Motos | `<MotoCatalogView />` |
| Inventario | Auditorías | `<AuditView />` |
| Reportes | Reportes ventas | Charts de ventas |
| Reportes | Reportes Caja | Listado reportes PDF |
| Reportes | Config. Tickets | (billing, en desarrollo) |

**DashboardOverview:**
- KPIs: Total usuarios, Sedes activas, En turno ahora, Alertas de stock
- `SedeCards` grid — click en una sede abre `SedeDetailPanel`
- `DashboardCharts` (Recharts) — ventas y estadísticas

### `EncargadoPanel.tsx` — Panel ENCARGADO
- Sidebar con secciones propias de la sede
- `ControlCajasCard` — cajas abiertas actualmente en su sede
- `EncargadoSalesView` — ventas de la sede con filtros
- `EncargadoEntradasView` — entradas de inventario de la sede
- `ReportesCajaView` — listado de reportes PDF de cierre de caja

### `WorkerPanel.tsx` — Panel WORKER
- Muestra nombre de la sede asignada (badge)
- **Polling cada 6 segundos** → `inventoryService` pedidos bodega (app `pedidos`)
- Grid de `PedidoBodega` pendientes:
  - Cada card: `#id`, hora, cajero que pidió, notas
  - Items del pedido con `ubicacion_almacen` resaltada
- Badge online/offline status

### `CashierPanel.tsx` — Panel CASHIER
- Al montar: verifica estado de caja → `GET /api/sales/cajas/mi-estado/`
- **Si caja cerrada** → `<CajaClosedScreen />`
- **Si caja abierta** → sidebar + área principal

**Sidebar (caja abierta):**
- Punto de Venta → `<POSView />`
- Ventas del día → `<SalesHistoryView />`
- Info del usuario + sede (badge naranja)
- Cerrar caja (botón naranja, llama `POST /cajas/<id>/cerrar/`)
- Cerrar sesión (botón rojo)

---

## Componentes

### `ProtectedRoute.tsx`
```tsx
<ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
  <DashboardPage />
</ProtectedRoute>
```
- Si no autenticado → `/login`
- Si rol incorrecto → `getRoleHome(user.role)`
- `allowedRoles` opcional; sin él solo verifica autenticación

---

### `admin/UsersList.tsx`
- Tabla paginada server-side
- Filtros: búsqueda (email/nombre), rol, sede, estado activo/inactivo
- Botones por fila: editar (abre `UserFormModal`), toggle is_active
- Muestra `LockedAccountsBanner` si hay cuentas bloqueadas

### `admin/UserFormModal.tsx`
- Modo **crear**: muestra email + contraseñas + sede (si WORKER/CASHIER/ENCARGADO)
- Modo **editar**: oculta email/contraseñas, muestra checkbox `is_active`
- Validación: campos requeridos, contraseñas coinciden, sede obligatoria por rol
- Mapea errores backend por campo

### `admin/SedesList.tsx`
- Vista en cards (grid)
- Nombre, dirección, teléfono, conteo usuarios, estado
- Botones: editar (`SedeFormModal`), toggle is_active

### `admin/SedeFormModal.tsx`
- Crear o editar sede
- Campos: nombre, dirección, teléfono; `is_active` solo en edición

### `admin/SedeCard.tsx`
- Card resumida por sede: empleados activos, alertas de stock bajo/sin stock

### `admin/SedeDetailPanel.tsx`
- Modal/panel con detalle de una sede
- Usuarios de la sede, niveles de stock

### `admin/LockedAccountsBanner.tsx`
- Banner en la parte superior de UsersList
- Se muestra si hay usuarios con `locked_until > now`
- Botón de desbloqueo individual

### `admin/SecurityView.tsx`
- Tabla del audit log (`LoginAuditLog`)
- Filtros: usuario, tipo de evento, rango de fechas
- Paginación server-side

---

### `admin/inventory/ProductsList.tsx`
- Vista en **cards grid** con filtros:
  - Búsqueda texto (nombre, SKU, código barras, n° parte)
  - Categoría, Subcategoría, Marca Fabricante
  - Tipo de parte, Stock bajo, Activo/inactivo
  - Sede (para ver stock por sede)
- Click en card → `ProductDetailModal`
- Botón upload imagen integrado (PNG/JPG, max 5MB)

### `admin/inventory/ProductDetailModal.tsx`
- Detalle completo del producto
- Tabs: Info General, Compatibilidades, Stock
- Compatibilidades: lista de modelos compatibles + botón agregar/quitar
- Stock: por sede con badge de stock bajo/normal
- Acciones: Editar (abre `ProductFormModal`), Toggle is_active

### `admin/inventory/ProductFormModal.tsx`
- Crear o editar producto
- Tabs: Información, Precios, Compatibilidades
- Campos completos según modelo `Producto`
- Upload de imagen integrado

### `admin/inventory/CategoriesList.tsx`
- Tabla CRUD de categorías
- Subcategorías anidadas por categoría
- Toggle soft delete

### `admin/inventory/SubcategoriesList.tsx`
- Tabla CRUD de subcategorías
- Filtro por categoría padre

### `admin/inventory/FabricantesList.tsx`
- Tabla CRUD de marcas fabricante
- Filtro por tipo (OEM / AFTERMARKET / GENERICO)

### `admin/inventory/MotoCatalogView.tsx`
- Gestión de `MarcaMoto` + `ModeloMoto`
- Vista árbol: Marca → lista de modelos
- Formularios inline para crear/editar

### `admin/inventory/InventoryEntryForm.tsx`
- Formulario para registrar entrada de inventario
- Selección de producto (con búsqueda), sede, cantidad, costo unitario, notas
- Al enviar: incrementa Stock atomically

### `admin/inventory/AuditView.tsx`
- Lista auditorías por sede y fecha
- Crear nueva auditoría → genera items por todos los productos con stock
- Vista de auditoría: tabla producto / sistema / físico / diferencia
- Ingresar stock físico por item (PATCH)
- Botón finalizar (POST /finalize/)

---

### `cashier/POSView.tsx`
- Dos modos de búsqueda:
  - **TextSearchMode**: búsqueda por nombre/SKU/código de barras
  - **MotoSearchMode**: cascada Marca → Modelo → Año → Categoria → productos filtrados
- `ProductGrid`: muestra productos disponibles con stock de la sede
- Carrito local (`CartItem[]`): agregar/quitar/modificar cantidad
- Total con descuento
- Botón **Pagar** → abre `PaymentModal`

### `cashier/PaymentModal.tsx`
- Selección de método de pago: EFECTIVO / TARJETA / TRANSFERENCIA
- Campo monto pagado (para efectivo → calcula cambio)
- Descuento opcional
- Botón confirmar → `POST /api/sales/ventas/`
- Al éxito: imprime ticket (PDF) y limpia carrito

### `cashier/SalesHistoryView.tsx`
- Tabla de ventas del día de la sede
- Filtros: rango de fechas, método de pago, cajero, status
- Click en venta → detalle con items
- Botón cancelar venta (PATCH /cancelar/) — restaura stock

### `cashier/CajaClosedScreen.tsx`
- Pantalla cuando la caja está cerrada
- Campo para ingresar código de 6 dígitos
- El encargado genera el código (en su panel o aquí mismo)
- `POST /api/sales/cajas/abrir/` con el código

---

### `encargado/ControlCajasCard.tsx`
- Card con las cajas abiertas actualmente en la sede
- Muestra cajero, hora de apertura, # ventas en el turno

### `encargado/ReportesCajaView.tsx`
- Lista de reportes de cierre de caja de la sede
- Botón descargar PDF por cada reporte

### `encargado/EncargadoSalesView.tsx`
- Tabla de ventas de la sede con filtros
- Similar a `SalesHistoryView` pero con permisos de encargado

### `encargado/EncargadoEntradasView.tsx`
- Lista entradas de inventario de la sede
- Filtros por producto, fecha, usuario

---

## Contextos

### `AuthContext.tsx`
```typescript
const { user, isAuthenticated, isLoading, login, logout } = useAuth();
```

| Propiedad/Método | Tipo | Descripción |
|-----------------|------|-------------|
| `user` | `User \| null` | Usuario autenticado |
| `isAuthenticated` | `boolean` | Si hay sesión activa |
| `isLoading` | `boolean` | Mientras restaura sesión en mount |
| `login(credentials)` | `Promise<User>` | Autentica y retorna el User |
| `logout()` | `void` | Limpia tokenStore y estado |

**Restauración de sesión en F5:**
1. Lee `refresh_token` de `sessionStorage`
2. `POST /api/auth/refresh/` con refresh token
3. Almacena nuevo access token en memoria
4. Restaura el snapshot de `user` de `sessionStorage`

**Persistencia multi-tab:**

| Dato | Dónde | Por qué |
|------|-------|---------|
| `access_token` | Memoria (módulo `tokenStore`) | Nunca toca el DOM; cada pestaña tiene el suyo |
| `refresh_token` | `sessionStorage` | Por pestaña, se borra al cerrar la pestaña |
| `user` | `sessionStorage` | Permite recuperar sesión en F5 sin re-login |

---

## Tipos TypeScript

### `types/auth.types.ts`

```typescript
interface Sede { id, name, address, phone }
interface SedeDetail extends Sede { is_active, created_at, updated_at, user_count }
interface SedeSnapshot extends SedeDetail { total_employees, ... }

interface User {
  id, email, first_name, last_name, full_name, phone
  role: UserRole
  sede: Sede | null
  is_active: boolean
  login_attempts: number
  locked_until: string | null
  unlock_requested: boolean
  created_at: string
}
type UserRole = 'ADMINISTRATOR' | 'ENCARGADO' | 'WORKER' | 'CASHIER' | 'CUSTOMER'

interface Pagination { total, page, page_size, total_pages }

interface UserCreatePayload { email, first_name, last_name, role, sede?, password, password_confirm }
interface UserUpdatePayload { first_name?, last_name?, role?, sede?, is_active? }
interface UserListParams { search?, role?, sede_id?, is_active?, page?, page_size? }

interface SedeCreatePayload { name, address, phone? }
interface SedeUpdatePayload { name?, address?, phone?, is_active? }

interface DashboardStats { total_users, total_administrators, total_encargados, total_workers, total_cashiers, total_customers }
interface DashboardResponse { success, data: { statistics, recent_users, sedes_summary, active_sede_filter, user_info } }

interface LoginAuditEntry { id, user, email_used, event_type, ip_address, timestamp }
```

### `types/inventory.types.ts`

```typescript
interface Categoria { id, name, description, is_active, subcategorias, product_count, created_at }
interface Subcategoria { id, categoria, categoria_name, name, description, is_active, product_count }
interface MarcaFabricante { id, name, tipo, pais, is_active }
interface MarcaMoto { id, name, is_active, modelos_count }
interface ModeloMoto { id, marca, marca_name, modelo, año_desde, año_hasta, cilindraje, tipo_motor, tipo_moto, is_active }

interface CompatibilidadItem { id, modelo_moto, modelo_moto_str, marca_name, año_desde, año_hasta, nota }

interface StockItem { id, sede_id, sede_name, quantity, min_quantity, is_low_stock, updated_at }

interface Producto {
  id, sku, name, description
  imagen: string | null              // URL de la imagen
  codigo_barras
  numero_parte_oem, numero_parte_aftermarket
  categoria, categoria_name
  subcategoria, subcategoria_name
  marca_fabricante, marca_fabricante_name
  tipo_parte, unidad_medida
  price, cost, precio_mayoreo        // strings (DRF decimals)
  ubicacion_almacen, peso_kg
  es_universal
  compatibilidades: CompatibilidadItem[]
  stock_items: StockItem[]
  total_stock: number
  is_active, es_descontinuado
  created_at, updated_at
}
```

### `types/sales.types.ts`

```typescript
interface CartItem {
  producto_id, producto_sku, producto_name
  unit_price: number
  quantity: number
  subtotal: number
  stock_disponible: number
}

interface VentaItemPayload { producto: number, quantity: number, unit_price: number }
interface VentaPayload {
  sede: number
  items: VentaItemPayload[]
  descuento: number
  metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'
  monto_pagado: number
  notas?: string
}

interface VentaItem { id, producto, producto_name, producto_sku, quantity, unit_price, subtotal }
interface Venta {
  id, sede, cajero, cajero_name
  items: VentaItem[]
  subtotal, descuento, total
  metodo_pago, monto_pagado, cambio
  status: 'COMPLETADA' | 'CANCELADA'
  notas, created_at
}

interface AperturaCaja {
  id, sede, cajero, cajero_name
  fecha_apertura, fecha_cierre
  status: 'ABIERTA' | 'CERRADA'
}

interface EstadoCajaResponse { tiene_caja_abierta: boolean, apertura?: AperturaCaja }
interface CodigoAperturaResponse { codigo: string, expires_at: string }
```

---

## Servicios API

### `api/auth.service.ts`
```typescript
login(credentials)                    // POST /auth/login/
getProfile()                          // GET  /auth/profile/
getDashboardSummary(params?)          // GET  /auth/admin/dashboard/summary/
getLockedAccounts()                   // GET  /auth/locked-accounts/
getAuditLog(params)                   // GET  /auth/audit-log/
adminUnlock(userId)                   // POST /auth/admin/unlock/<id>/
requestPasswordReset(email)           // POST /auth/password-reset/
confirmPasswordReset(token, password, password_confirm)  // POST /auth/password-reset/confirm/
logout()
```

### `api/users.service.ts`
```typescript
list(params?)             // GET    /auth/users/
get(id)                   // GET    /auth/users/<id>/
create(payload)           // POST   /auth/users/
update(id, payload)       // PUT    /auth/users/<id>/
toggleActive(id)          // DELETE /auth/users/<id>/
```

### `api/branches.service.ts`
```typescript
list()                    // GET    /branches/
get(id)                   // GET    /branches/<id>/
create(payload)           // POST   /branches/
update(id, payload)       // PUT    /branches/<id>/
toggleActive(id)          // DELETE /branches/<id>/
```

### `api/inventory.service.ts`
```typescript
// Categorías
listCategories(params)
createCategory(payload)
updateCategory(id, payload)
toggleCategory(id)

// Subcategorías
listSubcategories(params)
createSubcategory(payload)
updateSubcategory(id, payload)

// Marcas fabricante
listFabricantes(params)
createFabricante(payload)
updateFabricante(id, payload)

// Marcas/Modelos de moto
listMotoBrands()
listMotoModels(params)           // params: marca, tipo_moto, search
createMotoModel(payload)
updateMotoModel(id, payload)

// Productos
listProducts(params)             // params: search, categoria, subcategoria,
                                 //         marca_fabricante, moto_modelo_id,
                                 //         barcode, is_active, sede_id, low_stock
getProduct(id)
createProduct(payload)
updateProduct(id, payload)
toggleProduct(id)
uploadProductImage(id, file)     // PATCH /products/<id>/image/ (multipart)

// Compatibilidad
addCompatibility(productId, payload)
removeCompatibility(productId, compatId)

// Stock
getStockBySede(sedeId)
updateStock(stockId, payload)

// Entradas
createEntry(payload)
listEntries(params)

// Auditorías
listAudits(params)
createAudit(payload)
getAudit(id)
updateAuditItem(auditId, itemId, payload)   // PATCH stock_fisico
finalizeAudit(id)
```

### `api/sales.service.ts`
```typescript
// Ventas
createVenta(payload)              // POST  /ventas/
listVentas(params)                // GET   /ventas/  (filtros: sede_id, fechas, cajero, status)
getVenta(id)                      // GET   /ventas/<id>/
cancelarVenta(id)                 // PATCH /ventas/<id>/cancelar/

// Caja
generarCodigoApertura()           // POST  /cajas/generar-codigo/
abrirCaja(codigo)                 // POST  /cajas/abrir/
miEstadoCaja()                    // GET   /cajas/mi-estado/
cerrarCaja(aperturaId)            // POST  /cajas/<id>/cerrar/
cajasActivas()                    // GET   /cajas/activas/

// Reportes
adminResumen()                    // GET   /admin/resumen/
reportes(params)                  // GET   /reportes/
reportesCaja(params)              // GET   /reportes-caja/
descargarReporteCaja(id)          // GET   /reportes-caja/<id>/descargar/
```

### `api/axios.config.ts`
- `baseURL = import.meta.env.VITE_API_URL` (default: `http://localhost:8000/api`)
- Interceptor request: inyecta `Authorization: Bearer <access_token>` desde `tokenStore`
- Interceptor response 401: intenta refresh automático, si falla → redirige a `/login`

---

## Utilidades

### `utils/tokenStore.ts`
```typescript
setAccess(token: string): void      // solo memoria (variable de módulo)
getAccess(): string | null
setRefresh(token: string): void     // sessionStorage
getRefresh(): string | null
setUser(user: User): void           // sessionStorage (JSON)
getUser(): User | null
clearAll(): void
```

### `utils/roleUtils.ts`
```typescript
getRoleHome(role: UserRole): string
// 'ADMINISTRATOR' → '/admin'
// 'ENCARGADO'     → '/encargado'
// 'WORKER'        → '/worker'
// 'CASHIER'       → '/cashier'
// default         → '/login'
```

---

## Estilos

| Archivo | Usado en |
|---------|---------|
| `styles/LoginPage.css` | LoginPage |
| `styles/DashboardPage.css` | DashboardPage, EncargadoPanel, WorkerPanel, CashierPanel |
| `styles/App.css` | App global |
| `styles/index.css` | Reset / base |

Los paneles de Worker, Cashier y Encargado reutilizan `DashboardPage.css` para consistencia visual.
