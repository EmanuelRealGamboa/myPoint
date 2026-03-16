# Casos de Uso — MotoQFox POS

---

## CU-01 — Iniciar Sesión

**Actor principal**: Cualquier empleado (Admin, Trabajador, Cajero)
**Precondición**: El usuario tiene una cuenta activa en el sistema
**Postcondición**: El usuario accede a su panel correspondiente con sesión activa

### Flujo Principal
1. El usuario abre la aplicación y ve la pantalla de login
2. Ingresa su email y contraseña
3. El sistema valida las credenciales contra la base de datos
4. El sistema genera tokens JWT (access + refresh)
5. El sistema guarda los tokens en el navegador
6. El sistema redirige al usuario a su panel según su rol:
   - ADMINISTRATOR → `/admin`
   - WORKER → `/worker`
   - CASHIER → `/cashier`

### Flujos Alternativos
- **3a. Credenciales incorrectas**: El sistema muestra "Error al iniciar sesión. Verifica tus credenciales" sin revelar si el email o la contraseña son incorrectos
- **3b. Cuenta desactivada**: El sistema muestra "Esta cuenta está desactivada"
- **3c. IP bloqueada (5 intentos fallidos)**: El sistema muestra mensaje de bloqueo temporal con tiempo restante

### Reglas de Negocio
- El access token expira en 15 minutos (producción) o 60 minutos (desarrollo)
- El refresh token rota en cada uso
- Máximo 5 intentos fallidos por IP antes del bloqueo de 1 hora

---

## CU-02 — Registrar una Venta (POS Online)

**Actor principal**: Cajero
**Precondición**: Cajero autenticado, caja abierta, hay productos con stock en su sede
**Postcondición**: Venta registrada, stock actualizado, cierre de caja actualizado

### Flujo Principal
1. El cajero accede al POS en su panel
2. Busca un producto por nombre o SKU
3. Selecciona el producto; se agrega al carrito con cantidad 1
4. Repite pasos 2-3 para cada producto de la venta
5. Ajusta cantidades si es necesario
6. (Opcional) Aplica descuentos
7. Selecciona el método de pago: Efectivo / Tarjeta / Transferencia
8. Si es efectivo, ingresa el monto recibido; el sistema calcula el cambio
9. Confirma la venta
10. El sistema:
    - Crea el registro de Venta con todos los ítems
    - Descuenta el stock de cada producto en la sede del cajero
    - Registra el método y monto de pago
    - Asocia la venta al cierre de caja abierto
11. Se muestra pantalla de resumen / recibo en pantalla
12. El carrito se limpia automáticamente

### Flujos Alternativos
- **9a. Stock insuficiente**: Al confirmar, el sistema detecta que el stock bajó (otra venta concurrente); muestra qué producto no tiene stock suficiente; el cajero ajusta la cantidad o elimina el ítem
- **9b. Sin método de pago seleccionado**: El botón "Confirmar" está deshabilitado hasta seleccionar método
- **5a. Eliminar ítem del carrito**: El cajero puede quitar un producto; el carrito se actualiza
- **7a. Pago mixto**: Futuro — seleccionar dos métodos de pago para la misma venta

### Reglas de Negocio
- Solo se muestran productos activos con `stock > 0` en la sede del cajero
- El cajero solo puede vender desde la sede que tiene asignada
- Debe haber un cierre de caja abierto para poder vender
- Un descuento no puede hacer que el precio sea negativo

---

## CU-03 — Registrar una Venta Offline

**Actor principal**: Cajero
**Precondición**: Cajero autenticado en el dispositivo, sin conexión a internet, datos en caché local
**Postcondición**: Venta guardada localmente, pendiente de sincronización

### Flujo Principal
1. El sistema detecta ausencia de internet y muestra indicador "OFFLINE"
2. El cajero accede al POS normalmente
3. Busca productos del catálogo en caché local (IndexedDB)
4. Agrega productos al carrito y ajusta cantidades
5. Confirma la venta
6. El sistema (sin conexión):
   - Genera un UUID único para la venta
   - Guarda la venta en IndexedDB con status `pending`
   - Descuenta el stock del caché local (optimistic update)
   - Agrega la venta a la syncQueue
7. Se muestra confirmación y resumen de la venta
8. El contador de "ventas pendientes" incrementa en 1

### Flujo de Sincronización (cuando regresa internet)
1. El sistema detecta reconexión a internet
2. El indicador cambia a "SINCRONIZANDO"
3. El Service Worker ejecuta Background Sync
4. Por cada venta en la syncQueue:
   a. Envía `POST /api/ventas/sync/` al servidor
   b. El servidor valida stock real y aplica la venta
   c. Si el stock es insuficiente en el servidor: notifica al cajero para revisión
   d. Si todo está bien: marca la venta como `synced` en IndexedDB
5. El indicador cambia a "ONLINE"
6. El contador de "ventas pendientes" baja a 0

### Flujos Alternativos
- **6a. Producto sin caché local**: Si el producto no está en caché, no aparece en la búsqueda; el caché se actualiza cuando hay internet
- **4a. Conflicto de stock en sync**: Si el stock real en servidor es menor al que se vendió offline, el sistema notifica al cajero y crea un registro de diferencia para resolución manual

---

## CU-04 — Realizar Cierre de Caja

**Actor principal**: Cajero
**Actor secundario**: Administrador (puede ver y auditar)
**Precondición**: Cajero autenticado, hay una caja abierta para su sede
**Postcondición**: Cierre registrado, turno cerrado, resumen disponible para el admin

### Flujo Principal
1. El cajero selecciona "Cerrar caja" en su panel
2. El sistema calcula automáticamente:
   - Total en efectivo (suma de ventas en efectivo del turno)
   - Total en tarjeta
   - Total en transferencia
   - Total general del turno
3. El sistema muestra la pantalla de cierre con todos los totales
4. El cajero cuenta físicamente el dinero en caja
5. El cajero ingresa el "monto contado" en efectivo
6. El sistema calcula la diferencia: `monto_contado - total_efectivo_esperado`
7. El cajero agrega notas opcionales
8. El cajero confirma el cierre
9. El sistema:
   - Cierra el registro de CierreCaja con todos los datos
   - Registra timestamp de cierre y cajero
   - El cajero ya no puede registrar nuevas ventas para este turno

### Flujos Alternativos
- **8a. Hay ventas offline pendientes**: El sistema advierte que hay ventas sin sincronizar; el cajero puede decidir esperar a que se sincronicen o cerrar de todos modos (con nota automática)
- **6a. Diferencia significativa**: Si la diferencia supera un umbral configurado (ej. $500), se resalta en rojo y se requiere una nota obligatoria
- **1a. No hay caja abierta**: Si el cajero no abrió caja al inicio del turno, se le solicita que abra primero con el fondo inicial

---

## CU-05 — Gestionar Inventario (Alta de Mercancía)

**Actor principal**: Trabajador o Administrador
**Precondición**: Usuario autenticado con rol WORKER o ADMINISTRATOR, el producto existe en el sistema
**Postcondición**: Stock actualizado, movimiento registrado en el historial

### Flujo Principal
1. El trabajador accede a la sección "Entradas de inventario"
2. Selecciona la sede receptora
3. Busca el producto por nombre o SKU
4. Ingresa la cantidad recibida
5. Ingresa el costo unitario de compra
6. Agrega notas opcionales (número de factura, proveedor, etc.)
7. Confirma la entrada
8. El sistema:
   - Crea un registro de EntradaInventario
   - Suma la cantidad al stock actual del producto en esa sede
   - Registra quién hizo el movimiento y cuándo
9. Se muestra confirmación con el nuevo stock

### Flujos Alternativos
- **3a. Producto no existe**: El trabajador puede crear el producto primero o notificar al administrador
- **4a. Cantidad cero o negativa**: El sistema no permite confirmar

---

## CU-06 — Realizar Auditoría de Inventario

**Actor principal**: Administrador o Trabajador
**Precondición**: Usuario autenticado, no hay otra auditoría activa para esa sede
**Postcondición**: Inventario ajustado al conteo físico, auditoría registrada

### Flujo Principal
1. El actor crea una nueva auditoría para su sede
2. El sistema genera una lista de todos los productos activos con su stock actual del sistema
3. El actor, producto por producto, ingresa el conteo físico real
4. El sistema calcula la diferencia para cada producto:
   - Diferencia positiva: hay más de lo esperado (sobrante)
   - Diferencia negativa: hay menos de lo esperado (faltante)
5. El actor revisa el resumen de diferencias
6. Cuando termina el conteo, finaliza la auditoría
7. El sistema:
   - Ajusta el stock de cada producto al conteo físico ingresado
   - Crea registros de movimiento para cada ajuste
   - Cierra la auditoría con status FINALIZADA, timestamp y responsable

### Flujos Alternativos
- **2a. Lista muy larga**: El actor puede filtrar por categoría y hacer la auditoría por secciones
- **6a. Hay productos sin contar**: El sistema advierte que hay productos sin conteo; el actor puede continuar o volver a contarlos
- **1a. Ya hay auditoría activa**: El sistema muestra la auditoría activa y no permite crear otra

---

## CU-07 — Consultar Reportes (Administrador)

**Actor principal**: Administrador
**Precondición**: Usuario autenticado con rol ADMINISTRATOR
**Postcondición**: El administrador ve la información solicitada

### Flujo Principal — Reporte de Ventas
1. El administrador accede a la sección de Reportes
2. Selecciona el tipo de reporte: Ventas / Inventario / Cierres de caja
3. Aplica filtros: rango de fechas, sede (opcional), cajero (opcional)
4. El sistema consulta y muestra:
   - Gráfica de ventas por día
   - Tabla con totales por método de pago
   - Top 10 productos más vendidos
5. El administrador puede exportar a CSV

### Flujo Principal — Reporte de Inventario
1. Selecciona "Inventario" como tipo de reporte
2. Selecciona sede (o "Todas")
3. El sistema muestra:
   - Stock actual por producto y sede
   - Productos con stock bajo resaltados
   - Movimientos del período seleccionado
4. El administrador puede exportar a Excel

---

## CU-08 — Crear Usuario (Administrador)

**Actor principal**: Administrador
**Precondición**: Usuario autenticado con rol ADMINISTRATOR
**Postcondición**: Nuevo usuario creado y listo para hacer login

### Flujo Principal
1. El administrador accede a "Usuarios" en su panel
2. Selecciona "Crear usuario"
3. Completa el formulario:
   - Email (obligatorio, único)
   - Nombre y apellido (obligatorios)
   - Rol (obligatorio)
   - Sede (obligatorio si el rol es WORKER o CASHIER)
   - Contraseña (mínimo 8 caracteres)
   - Confirmar contraseña
4. Confirma la creación
5. El sistema valida todos los campos
6. El sistema crea el usuario con contraseña hasheada (Argon2)
7. El usuario aparece en la lista y puede hacer login inmediatamente

### Flujos Alternativos
- **5a. Email duplicado**: El sistema muestra "Ya existe un usuario con este email"
- **5b. Contraseñas no coinciden**: El sistema muestra el error de validación
- **5c. Sede no seleccionada para WORKER/CASHIER**: El sistema bloquea el envío y resalta el campo sede
- **5d. Contraseña muy corta**: El sistema muestra los requisitos mínimos

---

## Matriz de Casos de Uso por Rol

| Caso de Uso | ADMINISTRATOR | WORKER | CASHIER | CUSTOMER |
|-------------|:---:|:---:|:---:|:---:|
| CU-01 Login | ✅ | ✅ | ✅ | ✅ |
| CU-02 Venta online | ❌ | ❌ | ✅ | ❌ |
| CU-03 Venta offline | ❌ | ❌ | ✅ | ❌ |
| CU-04 Cierre de caja | ✅ | ❌ | ✅ | ❌ |
| CU-05 Alta inventario | ✅ | ✅ | ❌ | ❌ |
| CU-06 Auditoría | ✅ | ✅ | ❌ | ❌ |
| CU-07 Reportes | ✅ | ❌ | ❌ | ❌ |
| CU-08 Crear usuario | ✅ | ❌ | ❌ | ❌ |
| Gestionar sedes | ✅ | ❌ | ❌ | ❌ |
| Ver historial cierres | ✅ | ❌ | Propio | ❌ |
| Log de auditoría | ✅ | ❌ | ❌ | ❌ |
