# Arquitectura del Proyecto

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Backend | Django + Django REST Framework | 5.0.1 / 3.14.0 |
| Autenticación | djangorestframework-simplejwt | 5.3.1 |
| Base de datos | PostgreSQL | — |
| Driver BD | psycopg2-binary | 2.9.9 |
| CORS | django-cors-headers | 4.3.1 |
| Env vars | django-environ | 0.11.2 |
| Frontend | React + TypeScript | 19.2.0 / ~5.9.3 |
| Enrutamiento | React Router DOM | 7.11.0 |
| HTTP Client | Axios | 1.13.2 |
| Build tool | Vite | 7.2.4 |
| Gráficas | Recharts | — |
| Linter | ESLint | 9.39.1 |

---

## Estructura de Carpetas

```
c:/sistemaMotoQFox/
│
├── DOCUMENTACION/          ← Este directorio
│   ├── README.md
│   ├── arquitectura.md
│   ├── base-de-datos.md
│   ├── api-endpoints.md
│   ├── frontend.md
│   ├── flujos.md
│   └── catalogo-refacciones.md
│
├── backend/
│   ├── config/             ← Configuración Django
│   │   ├── settings.py
│   │   ├── urls.py         ← Rutas principales (api/auth/, api/branches/, api/inventory/, api/sales/, etc.)
│   │   ├── wsgi.py
│   │   └── asgi.py
│   │
│   ├── users/              ← App: Usuarios, auth, seguridad
│   │   ├── models.py       ← CustomUser, Turno, LoginAuditLog, PasswordResetToken
│   │   ├── views.py        ← Login, Profile, Dashboard, Unlock, AuditLog, PasswordReset
│   │   ├── serializers.py
│   │   ├── permissions.py  ← IsAdministrator, IsEncargadoOrAbove, etc.
│   │   ├── urls.py
│   │   ├── admin.py
│   │   └── migrations/
│   │
│   ├── branches/           ← App: Sedes (multi-sede)
│   │   ├── models.py       ← Sede
│   │   ├── views.py        ← CRUD de sedes
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── migrations/
│   │
│   ├── inventory/          ← App: Catálogo YMM + Stock
│   │   ├── models.py       ← Categoria, Subcategoria, MarcaFabricante, MarcaMoto,
│   │   │                     ModeloMoto, Producto, CompatibilidadPieza,
│   │   │                     Stock, EntradaInventario, AuditoriaInventario, AuditoriaItem
│   │   ├── views.py        ← CRUD completo + fitment search + auditorías
│   │   ├── serializers.py
│   │   ├── permissions.py  ← IsAdministratorOrWorker
│   │   ├── urls.py
│   │   ├── management/
│   │   │   └── commands/
│   │   │       └── populate_catalog.py  ← --reset flag
│   │   └── migrations/
│   │
│   ├── sales/              ← App: POS, Ventas, Caja
│   │   ├── models.py       ← Venta, VentaItem, CodigoApertura, AperturaCaja, ReporteCaja
│   │   ├── views.py        ← Ventas CRUD, Caja (abrir/cerrar), Reportes
│   │   ├── serializers.py
│   │   ├── permissions.py  ← IsCajeroOrAbove, IsEncargadoOrAbove
│   │   ├── urls.py
│   │   └── migrations/
│   │
│   ├── billing/            ← App: Configuración fiscal (en desarrollo)
│   ├── customers/          ← App: Perfiles de clientes (en desarrollo)
│   ├── pedidos/            ← App: Pedidos a bodega (WorkerPanel)
│   │
│   ├── manage.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   └── src/
│       ├── api/
│       │   ├── axios.config.ts         ← Base URL + interceptores JWT
│       │   ├── auth.service.ts         ← Login, perfil, unlock, audit log, password reset
│       │   ├── inventory.service.ts    ← CRUD productos, categorías, stock, auditorías
│       │   ├── sales.service.ts        ← Ventas, caja, reportes
│       │   └── branches.service.ts     ← CRUD sedes
│       │
│       ├── components/
│       │   ├── ProtectedRoute.tsx      ← Guard por auth + rol
│       │   ├── admin/
│       │   │   ├── UsersList.tsx
│       │   │   ├── UserFormModal.tsx
│       │   │   ├── SedesList.tsx
│       │   │   ├── SedeFormModal.tsx
│       │   │   ├── SedeCard.tsx
│       │   │   ├── SedeDetailPanel.tsx
│       │   │   ├── LockedAccountsBanner.tsx
│       │   │   ├── SecurityView.tsx
│       │   │   └── inventory/
│       │   │       ├── ProductsList.tsx
│       │   │       ├── ProductDetailModal.tsx
│       │   │       ├── ProductFormModal.tsx
│       │   │       ├── CategoriesList.tsx
│       │   │       ├── SubcategoriesList.tsx
│       │   │       ├── FabricantesList.tsx
│       │   │       ├── MotoCatalogView.tsx
│       │   │       ├── InventoryEntryForm.tsx
│       │   │       └── AuditView.tsx
│       │   ├── cashier/
│       │   │   ├── POSView.tsx         ← Búsqueda texto + YMM, carrito, pago
│       │   │   ├── PaymentModal.tsx
│       │   │   ├── SalesHistoryView.tsx
│       │   │   └── CajaClosedScreen.tsx
│       │   └── encargado/
│       │       ├── ControlCajasCard.tsx
│       │       ├── ReportesCajaView.tsx
│       │       ├── EncargadoSalesView.tsx
│       │       └── EncargadoEntradasView.tsx
│       │
│       ├── contexts/
│       │   └── AuthContext.tsx          ← Estado global de auth + restore F5
│       │
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── ForgotPasswordPage.tsx
│       │   ├── ResetPasswordPage.tsx
│       │   ├── DashboardPage.tsx        ← Panel ADMINISTRATOR (sidebar completo)
│       │   ├── EncargadoPanel.tsx       ← Panel ENCARGADO
│       │   ├── WorkerPanel.tsx          ← Panel WORKER (pedidos bodega + polling)
│       │   └── CashierPanel.tsx         ← Panel CASHIER (caja + POS)
│       │
│       ├── styles/
│       │   ├── LoginPage.css
│       │   ├── DashboardPage.css       ← Reutilizado por Worker y Cashier
│       │   ├── App.css
│       │   └── index.css
│       │
│       ├── types/
│       │   ├── auth.types.ts
│       │   ├── inventory.types.ts
│       │   └── sales.types.ts
│       │
│       ├── utils/
│       │   ├── roleUtils.ts            ← getRoleHome()
│       │   └── tokenStore.ts           ← acceso a tokens en memoria/sessionStorage
│       │
│       ├── App.tsx
│       └── main.tsx
│
└── venv/                   ← Entorno virtual Python
```

---

## Configuración de Entorno

### Backend `.env`
```
SECRET_KEY=django-insecure-...
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DB_NAME=motoqfox_db
DB_USER=postgres
DB_PASSWORD=emanuel
DB_HOST=localhost
DB_PORT=5432
JWT_ACCESS_TOKEN_LIFETIME=60       # minutos
JWT_REFRESH_TOKEN_LIFETIME=1440    # minutos (24h)
```

### CORS permitidos
- `http://localhost:5173` (Vite)
- `http://localhost:3000`
- `http://127.0.0.1:5173`
- `http://127.0.0.1:3000`

### Media files
- `MEDIA_URL = '/media/'`
- Imágenes de productos: `products/`
- Servidos en modo DEBUG vía `config/urls.py`

---

## URLs Backend — `config/urls.py`

```python
path('api/auth/',       include('users.urls'))
path('api/branches/',   include('branches.urls'))
path('api/inventory/',  include('inventory.urls'))
path('api/sales/',      include('sales.urls'))
path('api/billing/',    include('billing.urls'))
path('api/customers/',  include('customers.urls'))
path('api/pedidos/',    include('pedidos.urls'))
# + MEDIA_URL static serving en DEBUG
```

---

## Decisiones de Diseño

### Autenticación por email
`USERNAME_FIELD = 'email'` en `CustomUser`. No se usa username.

### JWT multi-tab
- `access_token`: en memoria (módulo `tokenStore`) — nunca persiste en localStorage
- `refresh_token`: `sessionStorage` — por pestaña, se borra al cerrar
- `user`: `sessionStorage` — permite restore en F5 sin re-login
- `ROTATE_REFRESH_TOKENS = True` — cada refresh genera un nuevo par

### Seguridad de cuenta
- 5 intentos fallidos → cuenta bloqueada 30 min (`locked_until`)
- `LoginAuditLog` registra todos los eventos de auth
- `PasswordResetToken`: tokens UUID válidos 1 hora, flujo por email

### Multi-sede
- `Sede` entidad independiente en app `branches`
- `CustomUser` tiene FK nullable a `Sede`
- ADMINISTRATOR y CUSTOMER: `sede = null`
- WORKER, CASHIER, ENCARGADO: `sede` requerida

### Soft delete
Sedes, Productos, Categorias y Subcategorias usan `is_active = False`. Preserva integridad referencial.

### Permisos personalizados

| Clase | Roles permitidos |
|-------|-----------------|
| `IsAdministrator` | ADMINISTRATOR |
| `IsEncargadoOrAbove` | ENCARGADO, ADMINISTRATOR |
| `IsAdministratorOrWorker` | ADMINISTRATOR, WORKER |
| `IsCajeroOrAbove` | CASHIER, ENCARGADO, ADMINISTRATOR |

### Stock management
- **Decremento** (venta): `select_for_update()` + `F('quantity') - qty` dentro de `@transaction.atomic`
- **Incremento** (entrada): automático en `EntradaInventario.save()` + `@transaction.atomic`
- **Ajuste** (auditoría): al finalizar, `Stock.quantity = AuditoriaItem.stock_fisico`

### Locale
- `LANGUAGE_CODE = 'es-mx'`
- `TIME_ZONE = 'America/Mexico_City'`
