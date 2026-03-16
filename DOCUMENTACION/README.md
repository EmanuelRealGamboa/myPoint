# MotoQFox — Documentación del Proyecto

Sistema de Inventario y Punto de Venta (POS) para tienda de motos y repuestos.
Multi-sede, offline-first y con seguridad OWASP aplicada.

---

## Índice de Documentación

### Estado actual del sistema
| Archivo | Contenido |
|---------|-----------|
| [arquitectura.md](./arquitectura.md) | Stack, estructura de carpetas, decisiones de diseño |
| [base-de-datos.md](./base-de-datos.md) | Modelos, campos, relaciones, migraciones |
| [api-endpoints.md](./api-endpoints.md) | Todos los endpoints con ejemplos de request/response |
| [frontend.md](./frontend.md) | Páginas, componentes, contextos, rutas, tipos |
| [flujos.md](./flujos.md) | Flujos de login, protección, multi-sede, POS, inventario |
| [catalogo-refacciones.md](./catalogo-refacciones.md) | Catálogo YMM: categorías, campos de producto, códigos de barras, fitment |

### Plan y metodología
| Archivo | Contenido |
|---------|-----------|
| [plan-proyecto.md](./plan-proyecto.md) | **Plan maestro** por fases, de inicio a producción |
| [historias-de-usuario.md](./historias-de-usuario.md) | Historias de usuario con criterios de aceptación |
| [casos-de-uso.md](./casos-de-uso.md) | Casos de uso principales con flujos y actores |
| [metodologia-xp.md](./metodologia-xp.md) | XP: prácticas, iteraciones, TDD, DoD, tablero Kanban |
| [seguridad-owasp.md](./seguridad-owasp.md) | OWASP Top 10:2025 aplicado a Django + React |
| [offline-pwa.md](./offline-pwa.md) | Estrategia offline-first: PWA, IndexedDB, sync |

---

## Estado del Proyecto por Fase

| Fase | Descripción | Estado |
|------|-------------|--------|
| **0** | Fundamentos y configuración | ✅ Completada |
| **1** | Auth, roles, multi-sede | ✅ Completada |
| **2** | Gestión de usuarios y sedes (UI admin) | ✅ Completada |
| **3** | Inventario, catálogo, auditoría | ✅ Completada |
| **4** | POS completo (ventas, clientes, cancelaciones) | ✅ Completada (core) |
| **5** | Offline-first y PWA | 🔲 Pendiente |
| **6** | Cierres de caja, reportes, audit log | 🔄 Parcial (reportes básicos implementados) |
| **7** | Seguridad OWASP completa | 🔄 Parcial (account lock, audit log) |
| **8** | Despliegue a producción (Railway + CI/CD) | 🔲 Pendiente |

### Detalle Fase 3 — Inventario ✅
- Modelos: `Categoria`, `Subcategoria`, `MarcaFabricante`, `MarcaMoto`, `ModeloMoto`, `Producto` (extendido con imagen), `CompatibilidadPieza`, `Stock`, `EntradaInventario`, `AuditoriaInventario`, `AuditoriaItem`
- API REST completa con fitment search (YMM)
- Frontend admin: `ProductsList`, `ProductDetailModal`, `CategoriesList`, `SubcategoriesList`, `FabricantesList`, `MotoCatalogView`, `InventoryEntryForm`, `AuditView`
- Script `populate_catalog` con 12 categorías + ~60 subcategorías + 25 modelos de moto + 20 productos de prueba

### Detalle Fase 4 — POS ✅ (core)
- **Backend**: app `sales` con modelos `Venta`, `VentaItem`, `CodigoApertura`, `AperturaCaja`, `ReporteCaja`
- **Flujo de caja**: código 6-digit generado por ENCARGADO (30 min vigencia), cajero abre con código, cierre genera PDF
- **Frontend cashier**: `POSView` (búsqueda texto + filtro YMM), `PaymentModal`, `SalesHistoryView`, `CajaClosedScreen`
- **Cancelaciones**: `PATCH /api/sales/ventas/<id>/cancelar/` restaura stock atómicamente
- **Reportes**: admin resumen por sede, reportes de caja PDF

### Detalle Fase 6 — Parcial
- `SecurityView` con audit log (`LoginAuditLog`)
- `LockedAccountsBanner` (lock por 5 intentos fallidos, 30 min)
- Reportes de ventas básicos (`/api/sales/reportes/`, `/api/sales/admin/resumen/`)
- Reportes de caja PDF auto-generados al cerrar caja

---

## Entorno de Desarrollo

```bash
# 1. Activar entorno virtual Python
source /c/sistemaMotoQFox/venv/Scripts/activate

# 2. Backend (Django) — puerto 8000
cd /c/sistemaMotoQFox/backend
python manage.py migrate        # Aplicar migraciones
python manage.py runserver

# 3. Frontend (React + Vite) — puerto 5173
cd /c/sistemaMotoQFox/frontend
nvm use 22                      # Node.js 22+ requerido
npm run dev
```

> **Requisitos**: Node.js 22+ (nvm use 22) · Python 3.11+ · PostgreSQL corriendo

---

## Apps Django registradas

| App | Descripción |
|-----|-------------|
| `users` | CustomUser (5 roles), Turno, LoginAuditLog, PasswordResetToken |
| `branches` | Sede (multi-sede) |
| `inventory` | Catálogo YMM + Stock + Auditorías |
| `sales` | Venta, VentaItem, AperturaCaja, CodigoApertura, ReporteCaja |
| `billing` | Configuración fiscal (pendiente de desarrollo) |
| `customers` | Perfiles de clientes (pendiente de desarrollo) |
| `pedidos` | Pedidos a bodega — WorkerPanel los visualiza en polling |

---

## Próximos pasos

### Pendiente (desarrollo)
- Panel Encargado completo con todas sus secciones
- App `customers` — perfiles y puntos de fidelidad
- App `billing` — configuración de tickets/facturas
- App `pedidos` — flujo completo de pedidos a bodega
- Offline-first / PWA (Fase 5)
- Reportes analíticos avanzados (gráficas, exportar CSV)
- Despliegue Railway + CI/CD (Fase 8)

Ver [plan-proyecto.md](./plan-proyecto.md) para el detalle completo.
