# Plan Maestro del Proyecto — MotoQFox POS

**Metodología**: Extreme Programming (XP)
**Duración estimada**: 8 fases / ~20 iteraciones de 1-2 semanas
**Equipo**: 1-2 desarrolladores + cliente (dueño del negocio)

---

## Visión del Producto

Sistema de punto de venta e inventario multi-sede para tienda de motos y repuestos,
que funcione completamente **en la nube y offline**, con seguridad OWASP aplicada
desde la base, y con una experiencia de usuario fluida para administradores,
trabajadores y cajeros.

---

## Principios de Desarrollo

- **Offline-first**: cualquier función crítica (ventas, inventario) debe funcionar sin internet
- **Seguridad por defecto**: OWASP Top 10 aplicado en cada módulo
- **Releases frecuentes**: el cliente usa el sistema real desde la iteración 1
- **Simple primero**: solo lo necesario para hoy, refactorizar cuando sea necesario
- **Tests antes que código**: TDD en toda la lógica de negocio

---

## Resumen de Fases

| Fase | Nombre | Iteraciones | Estado |
|------|--------|-------------|--------|
| 0 | Fundamentos y configuración | 1 | ✅ Completada |
| 1 | Autenticación, roles y multi-sede | 1 | ✅ Completada |
| 2 | Gestión de usuarios y sedes (admin) | 2 | ✅ Completada |
| 3 | Inventario y catálogo de productos | 3 | ✅ Completada |
| 4 | Punto de Venta (POS) completo | 4 | 🔲 Pendiente |
| 5 | Offline-first y PWA | 2 | 🔲 Pendiente |
| 6 | Cierres de caja, auditoría y reportes | 3 | 🔲 Pendiente |
| 7 | Seguridad OWASP completa | 2 | 🔲 Pendiente |
| 8 | Despliegue a producción (nube) | 2 | 🔲 Pendiente |

---

## FASE 0 — Fundamentos y Configuración ✅

**Estado**: Completada
**Objetivo**: Proyecto configurado, estructura base, entorno funcionando

### Completado
- [x] Django 5.0 + DRF + SimpleJWT + PostgreSQL configurado
- [x] React 19 + TypeScript + Vite + React Router 7 configurado
- [x] Custom User Model con autenticación por email
- [x] CORS configurado para desarrollo
- [x] Estructura de carpetas definida
- [x] Variables de entorno con django-environ

---

## FASE 1 — Autenticación, Roles y Multi-Sede ✅

**Estado**: Completada
**Objetivo**: Login funcional con enrutamiento por rol y soporte multi-sede

### Completado
- [x] Login JWT con email/password
- [x] Refresh token con rotación automática
- [x] 4 roles: ADMINISTRATOR, WORKER, CASHIER, CUSTOMER
- [x] Enrutamiento por rol: /admin, /worker, /cashier
- [x] ProtectedRoute con validación de rol
- [x] Modelo Sede (app branches) con soft delete
- [x] FK sede en CustomUser
- [x] API CRUD de sedes (solo ADMINISTRATOR)
- [x] Dashboard admin con estadísticas globales y por sede
- [x] Paneles placeholder para Worker y Cashier
- [x] Documentación base del proyecto

---

## FASE 2 — Gestión de Usuarios y Sedes (Panel Admin) ✅

**Estado**: Completada
**Objetivo**: El administrador puede gestionar usuarios y sedes desde la UI

### Iteración 2.1 — CRUD de Usuarios ✅

**Backend:**
- [x] `GET /api/auth/users/` — Listar usuarios con filtros y paginación
- [x] `POST /api/auth/users/` — Crear usuario (solo ADMINISTRATOR)
- [x] `GET /api/auth/users/<id>/` — Detalle de usuario
- [x] `PUT /api/auth/users/<id>/` — Editar usuario (partial)
- [x] `DELETE /api/auth/users/<id>/` — Toggle activo/inactivo (soft)
- [x] Validación: WORKER y CASHIER deben tener sede asignada
- [x] Tests unitarios para todos los endpoints (users/tests.py)

**Frontend:**
- [x] Tabla de usuarios con paginación y filtros (búsqueda, rol, sede, estado)
- [x] Modal crear/editar usuario con validación por campo
- [x] Toggle activo/inactivo desde tabla
- [x] Manejo de errores del backend por campo

### Iteración 2.2 — Gestión de Sedes ✅

**Backend (ya completado en Fase 1):**
- [x] CRUD completo de sedes en `/api/branches/`

**Frontend:**
- [x] Sección "Sedes" en sidebar del panel admin
- [x] Vista en cards con conteo de usuarios, dirección y teléfono
- [x] Modal crear/editar sede con validación
- [x] Toggle activo/inactivo desde card

**Estructura nueva:**
- [x] `DashboardPage` reestructurado con sidebar lateral (Dashboard · Usuarios · Sedes)
- [x] `components/admin/UsersList.tsx`
- [x] `components/admin/UserFormModal.tsx`
- [x] `components/admin/SedesList.tsx`
- [x] `components/admin/SedeFormModal.tsx`
- [x] `api/users.service.ts`
- [x] `api/branches.service.ts`
- [x] Tipos extendidos: `UserListParams`, `Pagination`, `UserCreatePayload`, `UserUpdatePayload`, `SedeDetail`, etc.

---

## FASE 3 — Inventario y Catálogo de Productos ✅

**Estado**: Completada
**Objetivo**: Sistema completo de inventario multi-sede con auditoría

### Iteración 3.1 — Modelos y API de Productos ✅

**Backend:**
- [x] App `inventory`: Categoria, Producto, Stock, EntradaInventario, AuditoriaInventario, AuditoriaItem
- [x] `inventory/permissions.py`: `IsAdministrator`, `IsAdministratorOrWorker`
- [x] CRUD categorías con validación de nombre único y bloqueo al desactivar con productos activos
- [x] CRUD productos con SKU único, filtros (search, categoria, is_active, sede_id, low_stock)
- [x] Stock por sede — tabla independiente `(producto, sede)` unique_together
- [x] Indicador `is_low_stock` (quantity <= min_quantity)
- [x] Registro en `settings.py` e `inventory.urls` en config

**Frontend:**
- [x] `inventory.types.ts` — tipos completos (Categoria, Producto, StockItem, EntradaInventario, Auditoria*)
- [x] `api/inventory.service.ts` — todos los métodos
- [x] `CategoriesList.tsx` + `CategoryFormModal.tsx`
- [x] `ProductsList.tsx` con filtros, paginación, indicador stock bajo ⚠️
- [x] `ProductFormModal.tsx` (crear/editar)
- [x] Sidebar actualizado con grupo "Inventario": Productos · Categorías · Auditorías

### Iteración 3.2 — Alta de Inventario ✅

**Backend:**
- [x] `POST /api/inventory/entries/` — registra entrada y actualiza Stock atómicamente (`select_for_update`)
- [x] `GET /api/inventory/entries/` — historial filtrable por producto/sede

**Frontend:**
- [x] `InventoryEntryForm.tsx` — modal selección producto + sede + cantidad + costo + notas
- [x] Botón "Alta de inventario" en la vista de Productos

### Iteración 3.3 — Auditoría de Inventario ✅

**Backend:**
- [x] `POST /api/inventory/audits/` — crea auditoría + snapshot automático de stock actual (`bulk_create`)
- [x] `PATCH /api/inventory/audits/<id>/items/<item>/` — registra conteo físico
- [x] `POST /api/inventory/audits/<id>/finalize/` — valida completes, ajusta Stock, cambia status
- [x] Bloqueo: no se puede modificar una auditoría FINALIZADA

**Frontend:**
- [x] `AuditView.tsx` — lista auditorías + detalle inline con inputs por producto
- [x] Semáforo diferencias: verde=0, azul=sobrante, rojo=faltante
- [x] Botón finalizar deshabilitado si hay productos sin conteo

**Nuevos modelos creados:**
```
Categoria       · Producto       · Stock
EntradaInventario
AuditoriaInventario · AuditoriaItem
```

---

## FASE 4 — Punto de Venta (POS) Completo

**Estado**: 🔲 Pendiente
**Objetivo**: Cajero puede registrar ventas completas con todas las funcionalidades

### Iteración 4.1 — POS Básico
**Duración**: 2 semanas

**Nuevos modelos:**
```
Venta:       id, sede FK, cashier FK, total, subtotal, discount, tax, status, fecha, local_id (UUID)
VentaItem:   id, venta FK, producto FK, quantity, unit_price, subtotal
```

**Backend:**
- [ ] Endpoint crear venta con items
- [ ] Validación de stock al vender
- [ ] Descuento de stock automático
- [ ] Endpoint listar ventas por sede/fecha

**Frontend (CashierPanel):**
- [ ] Interfaz POS: buscador de productos + carrito
- [ ] Agregar/quitar productos del carrito
- [ ] Aplicar descuentos
- [ ] Calcular total + impuestos
- [ ] Confirmar venta

### Iteración 4.2 — POS Avanzado
**Duración**: 2 semanas

**Backend:**
- [ ] Métodos de pago múltiples (efectivo, tarjeta, transferencia)
- [ ] Cancelación de venta con devolución de stock
- [ ] Búsqueda de cliente para asociar a venta

**Frontend:**
- [ ] Selección de método de pago
- [ ] Cálculo de cambio (efectivo)
- [ ] Pantalla de resumen / recibo en pantalla
- [ ] Botón cancelar venta con confirmación
- [ ] Historial de ventas del cajero en su turno

### Iteración 4.3 — Gestión de Clientes
**Duración**: 1 semana

**Nuevo modelo:**
```
Cliente: id, name, phone, email, rfc, address, created_at
```

**Backend/Frontend:**
- [ ] CRUD de clientes
- [ ] Búsqueda de cliente al registrar venta
- [ ] Historial de compras por cliente

---

## FASE 5 — Offline-First y PWA

**Estado**: 🔲 Pendiente
**Objetivo**: El sistema funciona sin internet; sincroniza al reconectar

### Iteración 5.1 — PWA y Cache
**Duración**: 1-2 semanas

**Técnico:**
- [ ] Configurar `vite-plugin-pwa` con Workbox
- [ ] Service Worker: cache de assets estáticos
- [ ] Cache de catálogo de productos (Network First, TTL 1h)
- [ ] Manifest.json para instalación como app
- [ ] Indicador de estado: online / offline / sincronizando

### Iteración 5.2 — Ventas y Sync Offline
**Duración**: 2 semanas

**Técnico:**
- [ ] Instalar y configurar `Dexie.js` (IndexedDB)
- [ ] Schema local: ventas, productos cache, syncQueue
- [ ] `useOfflineSync` hook para registrar ventas localmente
- [ ] Background Sync API para sincronización automática
- [ ] Endpoint Django `POST /api/ventas/sync/` con resolución de conflictos LWW
- [ ] Manejo de conflictos de stock (delta de unidades)
- [ ] Indicador de ventas pendientes de sincronización

---

## FASE 6 — Cierres de Caja, Auditoría y Reportes

**Estado**: 🔲 Pendiente
**Objetivo**: Control financiero completo con reportes por sede

### Iteración 6.1 — Cierres de Caja
**Duración**: 2 semanas

**Nuevo modelo:**
```
CierreCaja: id, sede FK, cashier FK, fecha_apertura, fecha_cierre,
            fondo_inicial, total_ventas_efectivo, total_ventas_tarjeta,
            total_ventas_transferencia, total_esperado, total_contado,
            diferencia, status (ABIERTO/CERRADO), notas
```

**Backend:**
- [ ] Apertura de caja (registrar fondo inicial)
- [ ] Cierre de caja (suma todas las ventas del turno)
- [ ] Cuadre: diferencia entre lo esperado y lo contado
- [ ] Historial de cierres por sede/fecha
- [ ] Solo un cierre de caja abierto por sede a la vez

**Frontend:**
- [ ] Botón "Abrir caja" al inicio del turno del cajero
- [ ] Pantalla de cierre: resumen de ventas + campo "dinero contado"
- [ ] Resultado del cuadre (diferencia positiva/negativa)
- [ ] Historial de cierres en panel admin

### Iteración 6.2 — Reportes Básicos
**Duración**: 1-2 semanas

**Backend:**
- [ ] Reporte ventas por día/semana/mes (con filtro por sede)
- [ ] Reporte productos más vendidos
- [ ] Reporte stock actual por sede
- [ ] Reporte de entradas de inventario
- [ ] Export a CSV/Excel

**Frontend (AdminDashboard):**
- [ ] Gráfica de ventas por día (últimos 30 días)
- [ ] Top 10 productos más vendidos
- [ ] Tabla de resumen de cierres de caja
- [ ] Filtros por fecha y sede
- [ ] Botón exportar a CSV

### Iteración 6.3 — Auditoría del Sistema
**Duración**: 1 semana

**Nuevo modelo:**
```
LogActividad: id, user FK, accion, entidad, entidad_id, datos_antes, datos_despues, ip, timestamp
```

**Backend:**
- [ ] Middleware que registra cada acción crítica (venta, edición de precio, cierre de caja, ajuste de inventario)
- [ ] Endpoint para consultar log de actividad (solo ADMINISTRATOR)

**Frontend:**
- [ ] Vista de log de actividad en panel admin con filtros

---

## FASE 7 — Seguridad OWASP Completa

**Estado**: 🔲 Pendiente
**Objetivo**: Sistema protegido contra las 10 vulnerabilidades OWASP más críticas

### Iteración 7.1 — Seguridad Backend
**Duración**: 1-2 semanas

- [ ] `django-axes`: bloqueo por fuerza bruta (5 intentos → 1h bloqueo)
- [ ] Rate limiting en endpoints críticos (login: 5/min, API: 1000/day)
- [ ] Argon2 como algoritmo de hashing de contraseñas
- [ ] JWT: access token 15 min, refresh token httpOnly cookie
- [ ] Headers de seguridad: HSTS, X-Frame-Options, CSP, XSS-Protection
- [ ] `django-csp`: Content Security Policy
- [ ] `pip-audit` en CI/CD
- [ ] `python manage.py check --deploy` como gate en CI/CD
- [ ] Validación de permisos por objeto (nivel sede) en todos los endpoints
- [ ] Audit log para acciones sensibles

### Iteración 7.2 — Seguridad Frontend
**Duración**: 1 semana

- [ ] Mover access token a memoria (Zustand), refresh token a httpOnly cookie
- [ ] `DOMPurify` para todo HTML dinámico
- [ ] Variables de entorno: nunca secrets en el cliente
- [ ] `npm audit` en CI/CD
- [ ] Manejo seguro de errores (no exponer stack traces al usuario)
- [ ] Timeout de sesión + confirmación al reactivar

---

## FASE 8 — Despliegue a Producción

**Estado**: 🔲 Pendiente
**Objetivo**: Sistema corriendo en Railway con CI/CD y dominio propio

### Iteración 8.1 — Infraestructura en Railway
**Duración**: 1 semana

**Backend:**
- [ ] `settings/production.py` con configuración segura
- [ ] `Procfile`: gunicorn + collectstatic + migrate
- [ ] `WhiteNoise` para archivos estáticos
- [ ] `dj-database-url` para DATABASE_URL de Railway
- [ ] Variables de entorno en Railway dashboard

**Frontend:**
- [ ] Build de producción con Vite
- [ ] `Caddyfile` para servir SPA en Railway
- [ ] Variables de entorno VITE_*

**Infraestructura:**
- [ ] Proyecto Railway con 3 servicios: backend, frontend, PostgreSQL
- [ ] Dominio personalizado (opcional)
- [ ] SSL automático en Railway

### Iteración 8.2 — CI/CD y Monitoreo
**Duración**: 1 semana

- [ ] GitHub Actions: tests en cada PR
- [ ] GitHub Actions: deploy automático a Railway al hacer merge a main
- [ ] Logs de producción monitoreados en Railway dashboard
- [ ] Alertas de errores (Sentry, gratis hasta 5k eventos/mes)
- [ ] Backup automático de PostgreSQL (Railway lo hace diariamente)
- [ ] Runbook: cómo hacer rollback en caso de falla

---

## Criterios de Éxito del Proyecto

### MVP (Fases 0-4)
- [ ] Cajero puede abrir el POS y registrar una venta en menos de 30 segundos
- [ ] Admin puede ver cuánto se vendió hoy en cada sede
- [ ] Inventario se descuenta en tiempo real al vender
- [ ] Solo los usuarios con el rol correcto ven su panel

### Producción completa (Fases 5-8)
- [ ] El POS sigue funcionando sin internet por al menos 8 horas
- [ ] Las ventas offline se sincronizan automáticamente al reconectar
- [ ] El cierre de caja tarda menos de 2 minutos
- [ ] Ninguna vulnerabilidad crítica en el audit de seguridad
- [ ] El sistema es accesible desde cualquier dispositivo con browser

---

## Stack Final de Producción

```
Backend:
  Django 5.x + DRF + SimpleJWT
  django-axes + django-csp + django-guardian
  Argon2 passwords
  Gunicorn + WhiteNoise

Frontend:
  React 19 + TypeScript + Vite
  React Router 7 + Zustand + Axios
  Dexie.js (IndexedDB offline)
  vite-plugin-pwa (Service Worker + Workbox)
  DOMPurify

Base de Datos:
  PostgreSQL (Railway managed)

Infraestructura:
  Railway (backend + frontend + PostgreSQL)
  GitHub Actions (CI/CD)
  Sentry (errores en producción)
```
