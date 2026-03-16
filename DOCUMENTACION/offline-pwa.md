# Estrategia Offline-First y PWA — MotoQFox

**Fase de implementación**: Fase 5
**Objetivo**: El POS funciona sin internet hasta 8 horas; sincroniza automáticamente al reconectar

---

## Por qué Offline-First para un POS

Un sistema POS que se detiene cuando hay problemas de internet es inaceptable
para un negocio. Internet puede fallar por:
- Corte del proveedor de internet
- Falla del router de la tienda
- Zona con señal móvil débil
- Trabajos de mantenimiento

Con la estrategia offline-first, **el negocio no se detiene**.

---

## Arquitectura General

```
ONLINE:
  Cajero → POS React → Axios → Django API → PostgreSQL
                  ↓ (también)
              IndexedDB (caché local)

OFFLINE:
  Cajero → POS React → IndexedDB (local)
                  ↓ (cuando regresa internet)
              Background Sync → Django API → PostgreSQL
```

---

## Stack Técnico

| Tecnología | Rol | Por qué |
|-----------|-----|---------|
| `vite-plugin-pwa` + Workbox | Service Worker + cache de assets | Integración nativa con Vite, configuración declarativa |
| `Dexie.js` | IndexedDB (base de datos local) | API moderna y tipada sobre IndexedDB nativo |
| Background Sync API | Sincronización automática al reconectar | El navegador maneja la cola incluso si la app está cerrada |
| `navigator.onLine` + eventos | Detectar estado de red | Nativo del navegador |

---

## Instalación (Fase 5)

```bash
# Frontend
npm install dexie
npm install vite-plugin-pwa workbox-window
npm install -D @types/serviceworker
```

---

## Configuración de Vite PWA

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'MotoQFox POS',
        short_name: 'MotoQFox',
        description: 'Sistema de Punto de Venta MotoQFox',
        theme_color: '#667eea',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // Catálogo de productos: Network First con caché de 1 hora
          {
            urlPattern: /\/api\/productos\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-productos',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60, // 1 hora
              },
              networkTimeoutSeconds: 5,
            },
          },
          // Sedes y configuración: Network First con caché de 24 horas
          {
            urlPattern: /\/api\/branches\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-config',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60,
              },
            },
          },
          // Assets estáticos: Cache First (tienen hash en el nombre)
          {
            urlPattern: /\.(?:js|css|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 días
              },
            },
          },
        ],
      },
    }),
  ],
});
```

---

## Schema de Base de Datos Local (Dexie.js)

```typescript
// src/db/localDB.ts
import Dexie, { type Table } from 'dexie';

// Interfaces
export interface LocalVenta {
  localId: string;          // UUID generado en el cliente
  serverId?: number;        // ID del servidor (después de sincronizar)
  sedeId: number;
  cashierEmail: string;
  items: LocalVentaItem[];
  metodoPago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
  subtotal: number;
  descuento: number;
  total: number;
  montoRecibido?: number;
  cambio?: number;
  timestamp: string;        // ISO 8601
  status: 'pending' | 'synced' | 'error';
  syncError?: string;
}

export interface LocalVentaItem {
  productoId: number;
  productoNombre: string;
  productoSku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface LocalProducto {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  categoriaId: number;
  categoriaNombre: string;
  stock: number;            // Stock local aproximado
  isActive: boolean;
  cachedAt: string;         // Cuándo se guardó en caché
}

export interface SyncQueueItem {
  id?: number;              // Auto-increment
  entidad: 'venta' | 'inventario';
  operacion: 'CREATE' | 'UPDATE';
  localId: string;
  datos: unknown;
  timestamp: number;
  intentos: number;
  status: 'pending' | 'processing' | 'error';
}

// Definición de la base de datos
export class MotoQFoxDB extends Dexie {
  ventas!: Table<LocalVenta, string>;       // PK: localId
  productos!: Table<LocalProducto, number>; // PK: id
  syncQueue!: Table<SyncQueueItem, number>; // PK: id (autoincrement)

  constructor() {
    super('MotoQFoxDB');

    this.version(1).stores({
      ventas: 'localId, status, sedeId, timestamp',
      productos: 'id, sku, name, categoriaId, isActive',
      syncQueue: '++id, entidad, status, timestamp',
    });
  }
}

export const db = new MotoQFoxDB();
```

---

## Hook: Estado de Red

```typescript
// src/hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';

export type NetworkStatus = 'online' | 'offline' | 'syncing';

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(
    navigator.onLine ? 'online' : 'offline'
  );

  useEffect(() => {
    const handleOnline = () => setStatus('online');
    const handleOffline = () => setStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}
```

---

## Hook: Registrar Venta (Online o Offline)

```typescript
// src/hooks/useRegistrarVenta.ts
import { useCallback } from 'react';
import { db } from '../db/localDB';
import { ventasApi } from '../api/ventas.service';
import { useNetworkStatus } from './useNetworkStatus';
import type { VentaInput, LocalVenta } from '../types/pos.types';

export function useRegistrarVenta() {
  const networkStatus = useNetworkStatus();

  const registrarVenta = useCallback(async (input: VentaInput): Promise<LocalVenta> => {
    const localId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const ventaLocal: LocalVenta = {
      localId,
      sedeId: input.sedeId,
      cashierEmail: input.cashierEmail,
      items: input.items,
      metodoPago: input.metodoPago,
      subtotal: input.subtotal,
      descuento: input.descuento || 0,
      total: input.total,
      montoRecibido: input.montoRecibido,
      cambio: input.cambio,
      timestamp,
      status: 'pending',
    };

    // 1. Siempre guardar localmente primero
    await db.ventas.put(ventaLocal);

    // 2. Descontar stock localmente (optimistic update)
    for (const item of input.items) {
      await db.productos
        .where('id').equals(item.productoId)
        .modify(p => { p.stock = Math.max(0, p.stock - item.quantity); });
    }

    // 3. Agregar a la cola de sincronización
    await db.syncQueue.add({
      entidad: 'venta',
      operacion: 'CREATE',
      localId,
      datos: ventaLocal,
      timestamp: Date.now(),
      intentos: 0,
      status: 'pending',
    });

    // 4. Si hay internet, intentar sincronizar de inmediato
    if (networkStatus === 'online') {
      try {
        const response = await ventasApi.crear(ventaLocal);
        await db.ventas.update(localId, {
          status: 'synced',
          serverId: response.id,
        });
        await db.syncQueue
          .where('localId').equals(localId)
          .delete();
      } catch {
        // Fallo silencioso: Background Sync se encargará
        // La venta ya está guardada localmente con status 'pending'
      }
    } else {
      // 5. Registrar Background Sync para cuando regrese el internet
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register('sync-ventas');
        }
      }
    }

    return ventaLocal;
  }, [networkStatus]);

  return { registrarVenta };
}
```

---

## Endpoint de Sincronización (Django Backend)

```python
# ventas/views.py
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

class VentaSyncView(APIView):
    """
    POST /api/ventas/sync/
    Recibe ventas registradas offline y las procesa.
    Usa Last-Write-Wins para conflictos, delta para stock.
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        ventas_data = request.data.get('ventas', [])
        resultados = []

        for venta_data in ventas_data:
            local_id = venta_data.get('localId')

            # Verificar si ya fue sincronizada antes (idempotente)
            if Venta.objects.filter(local_id=local_id).exists():
                resultados.append({
                    'localId': local_id,
                    'status': 'already_synced'
                })
                continue

            # Validar stock y descontarlo
            conflictos = []
            for item in venta_data.get('items', []):
                producto_id = item['productoId']
                quantity = item['quantity']

                try:
                    stock = Stock.objects.select_for_update().get(
                        producto_id=producto_id,
                        sede=request.user.sede
                    )
                    if stock.quantity < quantity:
                        conflictos.append({
                            'productoId': producto_id,
                            'nombre': stock.producto.name,
                            'stockDisponible': stock.quantity,
                            'cantidadVendida': quantity,
                        })
                    else:
                        stock.quantity -= quantity
                        stock.save()
                except Stock.DoesNotExist:
                    conflictos.append({
                        'productoId': producto_id,
                        'error': 'Producto no encontrado en esta sede'
                    })

            if conflictos:
                resultados.append({
                    'localId': local_id,
                    'status': 'conflict',
                    'conflictos': conflictos,
                })
                continue

            # Crear la venta en el servidor
            venta = Venta.objects.create(
                local_id=local_id,
                sede=request.user.sede,
                cashier=request.user,
                total=venta_data['total'],
                subtotal=venta_data['subtotal'],
                descuento=venta_data.get('descuento', 0),
                metodo_pago=venta_data['metodoPago'],
                created_at=venta_data['timestamp'],  # Respetar timestamp offline
            )

            for item in venta_data['items']:
                VentaItem.objects.create(
                    venta=venta,
                    producto_id=item['productoId'],
                    quantity=item['quantity'],
                    unit_price=item['unitPrice'],
                    subtotal=item['subtotal'],
                )

            resultados.append({
                'localId': local_id,
                'status': 'created',
                'serverId': venta.id,
            })

        return Response({'resultados': resultados}, status=status.HTTP_200_OK)
```

---

## Indicador de Estado en la UI

```tsx
// src/components/NetworkStatusBadge.tsx
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { usePendingSync } from '../hooks/usePendingSync';

export const NetworkStatusBadge: React.FC = () => {
  const networkStatus = useNetworkStatus();
  const { pendingCount } = usePendingSync();

  const config = {
    online: {
      color: '#c6f6d5',
      textColor: '#22543d',
      label: 'EN LÍNEA',
      dot: '#48bb78',
    },
    offline: {
      color: '#fed7d7',
      textColor: '#c53030',
      label: `SIN CONEXIÓN${pendingCount > 0 ? ` · ${pendingCount} pendientes` : ''}`,
      dot: '#fc8181',
    },
    syncing: {
      color: '#feebc8',
      textColor: '#7c2d12',
      label: 'SINCRONIZANDO...',
      dot: '#ed8936',
    },
  }[networkStatus];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '4px 12px',
      background: config.color, color: config.textColor,
      borderRadius: '12px', fontSize: '12px', fontWeight: 700,
    }}>
      <span style={{
        width: '8px', height: '8px', borderRadius: '50%',
        background: config.dot,
      }} />
      {config.label}
    </div>
  );
};
```

---

## Estrategia de Caché por Tipo de Dato

| Dato | Estrategia | TTL | Actualización |
|------|-----------|-----|---------------|
| Assets JS/CSS/HTML | Cache First | 7 días | Al actualizar la app |
| Catálogo de productos | Network First | 1 hora | Automática cada hora |
| Stock actual | Network First | 5 min | Siempre que hay red |
| Sedes y config | Network First | 24 horas | Raramente cambia |
| Ventas pendientes | Local siempre | Hasta sync | Background Sync |
| Reportes | Network Only | — | Sin caché offline |
| Imágenes de productos | Cache First | 7 días | Manual |

---

## Datos que NUNCA van offline

- Reportes y gráficas (muy pesados, requieren análisis en servidor)
- Historial completo de ventas (solo las del turno actual en caché)
- Auditorías de inventario (requieren datos precisos del servidor)
- Gestión de usuarios y sedes (administración solo online)

---

## Flujo Completo de Sincronización

```
[Internet regresa]
        │
        ▼
Service Worker detecta: evento 'online'
        │
        ▼
Background Sync: tag 'sync-ventas'
        │
        ▼
Leer syncQueue de IndexedDB (status='pending')
        │
        ▼
Por cada item de la cola:
  POST /api/ventas/sync/ con la venta
        │
    ¿Resultado?
   /    |    \
  OK  Conflict  Error red
  │      │         │
  ▼      ▼         ▼
Marcar  Notificar  Incrementar
synced  al cajero  intentos (retry)
Borrar  manualmente (max 5 intentos,
de     resolver    luego marcar 'error')
queue
```

---

## Resolución de Conflictos de Stock

```
Escenario: Cajero A vende 3 unidades offline.
           Cajero B vende 2 unidades online (en el servidor).
           Stock real antes de las ventas: 4 unidades.

Al sincronizar la venta de Cajero A:
  Stock en servidor: 4 - 2 = 2 (por Cajero B)
  Cajero A quiere restar 3 más: 2 - 3 = -1 ❌ CONFLICTO

Resolución aplicada:
  1. El servidor detecta que el stock sería negativo
  2. Retorna status='conflict' con stockDisponible=2
  3. El frontend muestra notificación al cajero:
     "La venta de 3 x Aceite Motor no pudo sincronizarse.
      Solo quedan 2 unidades disponibles.
      ¿Deseas ajustar la venta a 2 unidades o cancelarla?"
  4. El cajero decide y se envía la venta corregida

Resolución para casos simples (stock suficiente):
  Siempre Last-Write-Wins: la venta offline se aplica como si fuera nueva.
```

---

## Testing del Modo Offline

```bash
# En Chrome DevTools:
# F12 → Network → Throttling → "Offline"

# Casos de prueba:
1. Registrar venta sin internet → debe guardarse localmente
2. Ver indicador "SIN CONEXIÓN · 1 pendiente"
3. Reconectar → la venta se sincroniza automáticamente
4. Indicador vuelve a "EN LÍNEA"
5. Verificar que la venta aparece en el servidor
6. Verificar que el stock se actualizó correctamente
```
