# Historias de Usuario — MotoQFox POS

**Formato XP**: Como [rol], quiero [acción], para que [beneficio]
**Estimación**: puntos de historia (1 = ½ día, 2 = 1 día, 3 = 2 días, 5 = 1 semana, 8 = 2 semanas)
**Prioridad**: Alta (MVP) | Media | Baja

---

## FASE 1 — Autenticación, Roles y Multi-Sede ✅ COMPLETADA

### HU-01 — Login con rol
**Estado**: ✅ Completada
```
Como: cualquier empleado (admin, trabajador, cajero)
Quiero: iniciar sesión con mi email y contraseña
Para que: pueda acceder al panel que corresponde a mi rol

Estimación: 2 pts | Prioridad: Alta

Criterios de aceptación:
[x] El formulario tiene campo email y contraseña
[x] Si las credenciales son correctas, redirige al panel correcto según rol
[x] Si las credenciales son incorrectas, muestra mensaje de error claro
[x] La sesión persiste al recargar la página
[x] Al cerrar sesión, se eliminan los tokens del navegador
```

### HU-02 — Protección de rutas por rol
**Estado**: ✅ Completada
```
Como: sistema de seguridad
Quiero: que cada ruta solo sea accesible por el rol correcto
Para que: un cajero no pueda entrar al panel de administrador

Estimación: 1 pt | Prioridad: Alta

Criterios de aceptación:
[x] /admin solo accesible por ADMINISTRATOR
[x] /worker solo accesible por WORKER
[x] /cashier solo accesible por CASHIER
[x] Si un rol intenta acceder a una ruta que no le corresponde, redirige a su propio panel
[x] Si no está autenticado, redirige al login
```

### HU-03 — Multi-sede
**Estado**: ✅ Completada
```
Como: administrador del sistema
Quiero: que el sistema soporte múltiples sucursales
Para que: pueda gestionar todas las sedes desde una sola plataforma

Estimación: 3 pts | Prioridad: Alta

Criterios de aceptación:
[x] Existe el modelo Sede con nombre, dirección y teléfono
[x] Los trabajadores y cajeros tienen una sede asignada
[x] Los administradores tienen acceso global (sin sede fija)
[x] El panel del trabajador y cajero muestra su sede
[x] El dashboard del admin muestra estadísticas por sede
```

---

## FASE 2 — Gestión de Usuarios y Sedes

### HU-04 — Listar y buscar usuarios
**Estado**: 🔲 Pendiente
```
Como: administrador
Quiero: ver todos los usuarios del sistema con filtros
Para que: pueda encontrar rápidamente a cualquier empleado

Estimación: 2 pts | Prioridad: Alta

Criterios de aceptación:
[ ] Se muestra tabla paginada con: nombre, email, rol, sede, estado
[ ] Puedo filtrar por rol (ADMINISTRATOR, WORKER, CASHIER, CUSTOMER)
[ ] Puedo filtrar por sede
[ ] Puedo buscar por nombre o email
[ ] Los usuarios inactivos se muestran con indicador visual diferente
```

### HU-05 — Crear usuario
**Estado**: 🔲 Pendiente
```
Como: administrador
Quiero: crear nuevos usuarios desde el panel
Para que: el personal pueda acceder al sistema sin que yo intervenga técnicamente

Estimación: 2 pts | Prioridad: Alta

Criterios de aceptación:
[ ] Formulario con: email, nombre, apellido, rol, sede, contraseña, confirmar contraseña
[ ] Si el rol es WORKER o CASHIER, la sede es obligatoria
[ ] Si el rol es ADMINISTRATOR o CUSTOMER, la sede es opcional
[ ] El email debe ser único; si ya existe, muestra error claro
[ ] La contraseña debe tener mínimo 8 caracteres
[ ] Al crear exitosamente, el usuario aparece en la lista
```

### HU-06 — Editar usuario
**Estado**: 🔲 Pendiente
```
Como: administrador
Quiero: editar la información de un usuario existente
Para que: pueda actualizar roles, sedes o datos cuando cambien

Estimación: 1 pt | Prioridad: Alta

Criterios de aceptación:
[ ] Puedo editar: nombre, apellido, rol, sede, estado activo/inactivo
[ ] No puedo cambiar el email (es el identificador)
[ ] Al cambiar el rol a WORKER/CASHIER, la sede se vuelve obligatoria
[ ] Los cambios se reflejan en la lista inmediatamente
[ ] El usuario afectado verá los cambios en su próximo login
```

### HU-07 — Desactivar usuario
**Estado**: 🔲 Pendiente
```
Como: administrador
Quiero: desactivar un usuario sin eliminarlo
Para que: el historial de ventas y actividad se conserve

Estimación: 1 pt | Prioridad: Media

Criterios de aceptación:
[ ] Botón "Desactivar" con confirmación antes de ejecutar
[ ] El usuario desactivado no puede iniciar sesión
[ ] Si el usuario tiene sesión activa, se invalida en el próximo refresh
[ ] El usuario aparece en la lista con estado "Inactivo"
[ ] Puedo reactivar un usuario desactivado
```

### HU-08 — Gestionar sedes desde el panel
**Estado**: 🔲 Pendiente
```
Como: administrador
Quiero: crear, editar y desactivar sedes desde la UI
Para que: no necesite acceder a la base de datos directamente

Estimación: 2 pts | Prioridad: Alta

Criterios de aceptación:
[ ] Vista de sedes con: nombre, dirección, teléfono, cantidad de empleados, estado
[ ] Formulario crear sede con nombre (obligatorio), dirección, teléfono
[ ] Puedo editar los datos de una sede existente
[ ] Desactivar sede requiere confirmación
[ ] No puedo desactivar una sede con empleados activos asignados (o muestra advertencia)
```

---

## FASE 3 — Inventario

### HU-09 — Catálogo de categorías
**Estado**: 🔲 Pendiente
```
Como: administrador o trabajador
Quiero: organizar los productos en categorías
Para que: sea más fácil buscar y filtrar el inventario

Estimación: 1 pt | Prioridad: Alta

Criterios de aceptación:
[ ] CRUD de categorías (nombre, descripción)
[ ] Una categoría no se puede eliminar si tiene productos activos
[ ] Las categorías aparecen como filtro en el catálogo de productos
```

### HU-10 — Catálogo de productos
**Estado**: 🔲 Pendiente
```
Como: administrador o trabajador
Quiero: gestionar el catálogo de productos
Para que: el inventario esté actualizado y los cajeros puedan vender

Estimación: 3 pts | Prioridad: Alta

Criterios de aceptación:
[ ] Formulario producto: SKU, nombre, descripción, precio de venta, costo, categoría, imagen (opcional)
[ ] El SKU debe ser único en el sistema
[ ] El precio de venta es obligatorio y mayor a cero
[ ] Puedo editar cualquier campo de un producto existente
[ ] Puedo desactivar un producto (no aparece en el POS)
[ ] Vista de productos con búsqueda por nombre/SKU y filtro por categoría
```

### HU-11 — Stock por sede
**Estado**: 🔲 Pendiente
```
Como: administrador o trabajador
Quiero: ver el stock de cada producto en cada sede
Para que: sepa dónde hay disponibilidad de cada producto

Estimación: 2 pts | Prioridad: Alta

Criterios de aceptación:
[ ] Cada producto muestra su stock en cada sede por separado
[ ] Se puede definir stock mínimo por producto/sede (para alertas)
[ ] Los productos con stock igual o menor al mínimo se destacan visualmente
[ ] Vista de alertas de stock bajo (solo productos con stock crítico)
```

### HU-12 — Alta de inventario (recepción de mercancía)
**Estado**: 🔲 Pendiente
```
Como: trabajador o administrador
Quiero: registrar la entrada de mercancía al inventario
Para que: el stock se actualice cuando llegan nuevos productos

Estimación: 2 pts | Prioridad: Alta

Criterios de aceptación:
[ ] Formulario: producto, sede, cantidad, costo unitario, notas, fecha
[ ] Al registrar, el stock de ese producto en esa sede aumenta automáticamente
[ ] Queda registrado quién hizo la entrada y cuándo
[ ] Historial de entradas visible por producto o por fecha
[ ] Solo ADMINISTRATOR y WORKER pueden registrar entradas
```

### HU-13 — Auditoría de inventario
**Estado**: 🔲 Pendiente
```
Como: administrador o trabajador
Quiero: realizar un conteo físico del inventario y compararlo con el sistema
Para que: pueda detectar mermas, robos o errores de registro

Estimación: 3 pts | Prioridad: Media

Criterios de aceptación:
[ ] Crear una auditoría genera una lista de todos los productos de la sede con su stock actual del sistema
[ ] Puedo ingresar el conteo físico para cada producto
[ ] El sistema calcula automáticamente la diferencia (sobrante o faltante)
[ ] Productos con diferencia se destacan en rojo (faltante) o verde (sobrante)
[ ] Al finalizar la auditoría, el stock del sistema se ajusta al conteo físico
[ ] La auditoría queda registrada con fecha, responsable y resultados
[ ] Solo puede haber una auditoría activa por sede a la vez
```

---

## FASE 4 — Punto de Venta (POS)

### HU-14 — Registrar venta básica
**Estado**: 🔲 Pendiente
```
Como: cajero
Quiero: buscar productos y agregarlos a un carrito para registrar una venta
Para que: pueda cobrar a los clientes de forma rápida y precisa

Estimación: 5 pts | Prioridad: Alta (MVP del POS)

Criterios de aceptación:
[ ] Búsqueda de productos por nombre o SKU en tiempo real
[ ] Al seleccionar un producto, se agrega al carrito
[ ] Puedo cambiar la cantidad de cada ítem en el carrito
[ ] Puedo eliminar un ítem del carrito
[ ] El total se calcula automáticamente (subtotal + impuestos)
[ ] Solo aparecen productos activos con stock > 0 en mi sede
[ ] El botón "Cobrar" está deshabilitado si el carrito está vacío
```

### HU-15 — Cobrar y finalizar venta
**Estado**: 🔲 Pendiente
```
Como: cajero
Quiero: registrar el método de pago y finalizar la venta
Para que: quede registrada en el sistema y el stock se actualice

Estimación: 3 pts | Prioridad: Alta

Criterios de aceptación:
[ ] Selección de método de pago: Efectivo, Tarjeta, Transferencia
[ ] Si es efectivo, campo "Monto recibido" con cálculo de cambio
[ ] Al confirmar, la venta se guarda con todos los ítems
[ ] El stock de cada producto vendido se descuenta de la sede del cajero
[ ] Se muestra pantalla de resumen/recibo con opción de imprimir
[ ] El carrito se limpia automáticamente para la siguiente venta
[ ] Si el stock es insuficiente al confirmar, se muestra error con detalle
```

### HU-16 — Descuentos en venta
**Estado**: 🔲 Pendiente
```
Como: cajero
Quiero: aplicar descuentos a productos o al total de la venta
Para que: pueda hacer promociones o ajustes acordados con el cliente

Estimación: 2 pts | Prioridad: Media

Criterios de aceptación:
[ ] Puedo aplicar descuento en porcentaje (%) o en monto fijo ($) a un ítem
[ ] Puedo aplicar descuento al total de la venta
[ ] El descuento máximo por ítem es configurable (límite para cajeros)
[ ] Los descuentos quedan registrados en la venta
[ ] Si el descuento supera el límite permitido, requiere autorización del admin
```

### HU-17 — Cancelar venta
**Estado**: 🔲 Pendiente
```
Como: cajero o administrador
Quiero: cancelar una venta registrada por error
Para que: el stock se restaure y el registro sea preciso

Estimación: 2 pts | Prioridad: Media

Criterios de aceptación:
[ ] Solo se pueden cancelar ventas del mismo día
[ ] Cancelar requiere ingresar un motivo
[ ] Al cancelar, el stock de todos los productos de la venta se restaura
[ ] La venta queda con status "CANCELADA" (no se elimina)
[ ] El cajero solo puede cancelar sus propias ventas; el admin puede cancelar cualquiera
```

### HU-18 — Historial de ventas del turno
**Estado**: 🔲 Pendiente
```
Como: cajero
Quiero: ver las ventas que he registrado en mi turno actual
Para que: pueda consultar o corregir errores antes del cierre de caja

Estimación: 1 pt | Prioridad: Media

Criterios de aceptación:
[ ] Lista de ventas del turno actual con: hora, total, método de pago, status
[ ] Puedo ver el detalle de cada venta (productos, cantidades, precios)
[ ] Se muestra el total acumulado del turno
```

### HU-19 — Gestión de clientes
**Estado**: 🔲 Pendiente
```
Como: cajero o administrador
Quiero: asociar una venta a un cliente registrado
Para que: pueda llevar un historial de compras por cliente

Estimación: 2 pts | Prioridad: Media

Criterios de aceptación:
[ ] Búsqueda de cliente por nombre o teléfono antes de cobrar
[ ] Si no existe, puedo registrar un cliente nuevo rápidamente (nombre + teléfono mínimo)
[ ] La venta queda asociada al cliente en el historial
[ ] Vista de historial de compras por cliente (en panel admin)
```

---

## FASE 5 — Offline y PWA

### HU-20 — Funcionar sin internet
**Estado**: 🔲 Pendiente
```
Como: cajero
Quiero: seguir usando el POS aunque no haya internet
Para que: el negocio no se detenga cuando falla la conexión

Estimación: 8 pts | Prioridad: Alta

Criterios de aceptación:
[ ] El POS carga correctamente aunque no haya internet
[ ] Puedo buscar productos del catálogo offline (datos en caché)
[ ] Puedo registrar ventas completas sin internet
[ ] La venta se guarda localmente con status "pendiente de sincronización"
[ ] Se muestra claramente el estado: ONLINE / OFFLINE / SINCRONIZANDO
[ ] El stock local se actualiza inmediatamente al vender (optimistic update)
```

### HU-21 — Sincronización automática
**Estado**: 🔲 Pendiente
```
Como: sistema
Quiero: sincronizar automáticamente los datos offline cuando regrese internet
Para que: el servidor siempre tenga la información correcta

Estimación: 5 pts | Prioridad: Alta

Criterios de aceptación:
[ ] Al detectar reconexión, las ventas pendientes se envían automáticamente
[ ] Si una venta tiene conflicto de stock (producto sin stock en servidor), se notifica al cajero
[ ] El cajero ve un contador de "ventas pendientes de sincronizar"
[ ] La sincronización ocurre en segundo plano sin bloquear el POS
[ ] Si la sincronización falla, se reintenta automáticamente
```

### HU-22 — Instalar como aplicación
**Estado**: 🔲 Pendiente
```
Como: cajero o trabajador
Quiero: instalar el sistema como una aplicación en mi dispositivo
Para que: no necesite abrir el navegador cada vez y se vea como una app nativa

Estimación: 1 pt | Prioridad: Baja

Criterios de aceptación:
[ ] El navegador muestra opción de "instalar" o "agregar a pantalla de inicio"
[ ] Una vez instalada, abre directamente en pantalla completa sin barra del navegador
[ ] Tiene ícono de la aplicación en el dispositivo
[ ] Funciona igual instalada que en el navegador
```

---

## FASE 6 — Cierres de Caja y Reportes

### HU-23 — Abrir caja
**Estado**: 🔲 Pendiente
```
Como: cajero
Quiero: registrar el fondo de caja al inicio de mi turno
Para que: el cierre de caja calcule correctamente el total esperado en efectivo

Estimación: 1 pt | Prioridad: Alta

Criterios de aceptación:
[ ] Al iniciar turno, el cajero ingresa el monto del fondo inicial
[ ] Solo puede haber una caja abierta por sede a la vez
[ ] Si ya hay una caja abierta, no puede abrir otra
[ ] La apertura queda registrada con hora y cajero
```

### HU-24 — Cierre de caja
**Estado**: 🔲 Pendiente
```
Como: cajero
Quiero: realizar el cierre de caja al terminar mi turno
Para que: quede registrado el cuadre entre lo vendido y lo que hay físicamente en caja

Estimación: 3 pts | Prioridad: Alta

Criterios de aceptación:
[ ] Pantalla de cierre muestra: ventas en efectivo, tarjeta, transferencia; total general
[ ] Campo para ingresar el dinero contado físicamente en caja
[ ] El sistema calcula la diferencia (sobrante o faltante)
[ ] Puedo agregar notas antes de cerrar
[ ] Al confirmar, la caja queda cerrada y no se pueden agregar más ventas al turno
[ ] Si hay ventas offline pendientes, advierte antes de cerrar
```

### HU-25 — Historial de cierres (admin)
**Estado**: 🔲 Pendiente
```
Como: administrador
Quiero: ver el historial de todos los cierres de caja de todas las sedes
Para que: pueda auditar las operaciones y detectar irregularidades

Estimación: 2 pts | Prioridad: Media

Criterios de aceptación:
[ ] Lista de cierres por fecha, sede y cajero
[ ] Vista de detalle de cada cierre con desglose completo
[ ] Alertas visuales para cierres con diferencia significativa (configurable)
[ ] Exportar historial a Excel/CSV
```

### HU-26 — Reporte de ventas
**Estado**: 🔲 Pendiente
```
Como: administrador
Quiero: ver reportes de ventas con filtros por fecha, sede y cajero
Para que: pueda analizar el desempeño del negocio

Estimación: 3 pts | Prioridad: Media

Criterios de aceptación:
[ ] Gráfica de ventas diarias (últimos 30 días)
[ ] Filtros: rango de fechas, sede, cajero
[ ] Totales: ventas brutas, descuentos, total neto, por método de pago
[ ] Tabla de productos más vendidos (top 10 por cantidad y por monto)
[ ] Exportar a CSV
```

### HU-27 — Reporte de inventario
**Estado**: 🔲 Pendiente
```
Como: administrador o trabajador
Quiero: ver reportes del estado del inventario
Para que: pueda tomar decisiones de reabastecimiento

Estimación: 2 pts | Prioridad: Media

Criterios de aceptación:
[ ] Stock actual de todos los productos por sede
[ ] Productos con stock bajo (por debajo del mínimo)
[ ] Movimientos de inventario (entradas, ventas, ajustes) por período
[ ] Exportar a Excel
```

---

## FASE 7 — Seguridad

### HU-28 — Protección contra fuerza bruta
**Estado**: 🔲 Pendiente
```
Como: sistema de seguridad
Quiero: bloquear temporalmente IPs que intentan hacer login repetidamente
Para que: se prevengan ataques de fuerza bruta contra las cuentas

Estimación: 1 pt | Prioridad: Alta

Criterios de aceptación:
[ ] Después de 5 intentos fallidos de login, la IP se bloquea por 1 hora
[ ] El usuario ve un mensaje claro de que está bloqueado temporalmente
[ ] El administrador puede desbloquear manualmente desde el panel Django admin
[ ] El contador de intentos se reinicia al hacer login exitoso
```

### HU-29 — Sesión segura con timeout
**Estado**: 🔲 Pendiente
```
Como: cajero o trabajador
Quiero: que mi sesión expire automáticamente si no uso el sistema
Para que: nadie más pueda usar mi cuenta si dejo el dispositivo sin vigilancia

Estimación: 2 pts | Prioridad: Alta

Criterios de aceptación:
[ ] Si no hay actividad por 30 minutos, aparece aviso de sesión por expirar
[ ] El usuario puede extender la sesión con un clic
[ ] Si no responde en 2 minutos, la sesión se cierra automáticamente
[ ] Al reactivar, debe ingresar su contraseña
```

### HU-30 — Log de auditoría
**Estado**: 🔲 Pendiente
```
Como: administrador
Quiero: ver un registro de todas las acciones críticas realizadas en el sistema
Para que: pueda auditar quién hizo qué y cuándo en caso de irregularidades

Estimación: 2 pts | Prioridad: Media

Criterios de aceptación:
[ ] Se registran: ventas, cancelaciones, ediciones de precio, ajustes de inventario, cierres de caja, cambios de usuarios
[ ] Cada registro muestra: usuario, acción, entidad afectada, datos antes/después, IP, timestamp
[ ] El log es de solo lectura (nadie puede editarlo ni eliminarlo)
[ ] Filtros por usuario, tipo de acción y rango de fechas
```

---

## FASE 8 — Producción

### HU-31 — Sistema en la nube
**Estado**: 🔲 Pendiente
```
Como: dueño del negocio
Quiero: acceder al sistema desde cualquier dispositivo con internet
Para que: pueda ver el estado del negocio desde cualquier lugar

Estimación: 3 pts | Prioridad: Alta

Criterios de aceptación:
[ ] El sistema está desplegado en Railway con dominio accesible
[ ] El acceso es seguro (HTTPS)
[ ] El backend y el frontend están en URLs separadas
[ ] Los datos persisten entre sesiones (PostgreSQL en Railway)
[ ] En caso de falla del servidor, el POS sigue funcionando offline
```

### HU-32 — CI/CD automático
**Estado**: 🔲 Pendiente
```
Como: desarrollador
Quiero: que los cambios en el código se desplieguen automáticamente al hacer merge
Para que: el proceso de actualización sea confiable y no manual

Estimación: 2 pts | Prioridad: Media

Criterios de aceptación:
[ ] Al hacer push a main, se ejecutan los tests automáticamente
[ ] Si los tests pasan, se despliega a Railway automáticamente
[ ] Si los tests fallan, el deploy no ocurre y recibo notificación
[ ] Puedo hacer rollback al deploy anterior en menos de 5 minutos
```

---

## Resumen de Estimaciones por Fase

| Fase | Historias | Puntos estimados | Duración aprox. |
|------|-----------|-----------------|-----------------|
| 0-1 | HU-01 a HU-03 | 6 pts | ✅ Completado |
| 2 | HU-04 a HU-08 | 8 pts | 2-3 semanas |
| 3 | HU-09 a HU-13 | 11 pts | 3-4 semanas |
| 4 | HU-14 a HU-19 | 16 pts | 4-5 semanas |
| 5 | HU-20 a HU-22 | 14 pts | 3-4 semanas |
| 6 | HU-23 a HU-27 | 11 pts | 3 semanas |
| 7 | HU-28 a HU-30 | 5 pts | 1-2 semanas |
| 8 | HU-31 a HU-32 | 5 pts | 1-2 semanas |
| **Total** | **32 historias** | **76 pts** | **~20-23 semanas** |
