# Metodología XP (Extreme Programming) — MotoQFox

---

## ¿Por qué XP para este proyecto?

XP es ideal para equipos pequeños (1-2 desarrolladores) con un cliente
que puede dar feedback frecuente. Sus principios de releases frecuentes,
TDD y simplicidad se alinean perfectamente con construir un POS real
que el negocio use desde las primeras semanas.

---

## Los 5 Valores que seguimos

| Valor | Cómo lo aplicamos |
|-------|-------------------|
| **Comunicación** | El cliente (dueño del negocio) está disponible para preguntas vía WhatsApp. Reunión presencial cada 2 semanas para demo y planificación. |
| **Simplicidad** | Solo implementamos lo que se necesita hoy. Si una historia no está en la iteración actual, no se toca. |
| **Feedback** | El cliente usa el sistema real desde la iteración 1. Cada ciclo termina con demo funcional. |
| **Coraje** | Refactorizamos sin miedo cuando es necesario. Decimos "eso va en la siguiente iteración" cuando aplica. |
| **Respeto** | El tiempo del cliente y del desarrollador es valioso. Las estimaciones son honestas. |

---

## Las 12 Prácticas XP (adaptadas al equipo)

### 1. Planning Game
**Qué**: Reunión de planificación al inicio de cada iteración.
**Cómo**:
- El cliente presenta sus necesidades con sus propias palabras
- El desarrollador traduce a historias de usuario
- Se estima cada historia en puntos (escala: 1, 2, 3, 5, 8)
- El cliente prioriza; el desarrollador selecciona cuánto puede hacer
- Duración: 1-2 horas cada 2 semanas

**Herramienta**: GitHub Projects (columnas: Backlog | Iteración Actual | En progreso | Review | Done)

---

### 2. Small Releases
**Qué**: Desplegar algo funcional al cliente cada 1-2 semanas.
**Cómo**:
- Cada iteración termina con un deploy a Railway
- El cliente puede usar el sistema real y dar feedback inmediato
- Se prefieren features pequeños y completos sobre features grandes a medias

**Regla**: Nunca un "está casi listo". O está listo (testeado y desplegado) o está en progreso.

---

### 3. Metáfora del Sistema
**Qué**: Vocabulario común que todos entienden (cliente y desarrollador).

| Término técnico | Término del negocio |
|----------------|-------------------|
| Sede / Branch | Sucursal |
| POS / Punto de venta | Caja registradora |
| CierreCaja | Corte de caja |
| EntradaInventario | Recepción de mercancía |
| AuditoriaInventario | Inventario físico |
| WORKER | Técnico / bodeguero |
| CASHIER | Cajero(a) |
| ADMINISTRATOR | Encargado / dueño |

---

### 4. Diseño Simple
**Reglas**:
1. El sistema pasa todos los tests
2. No hay lógica duplicada
3. Expresa claramente la intención del programador
4. Tiene el menor número de clases y métodos posible

**En la práctica**:
- No creamos abstracciones para un solo uso
- No agregamos "por si acaso" funcionalidades
- Si hay duda entre dos diseños, elegimos el más simple

---

### 5. TDD (Test-Driven Development)
**Flujo obligatorio para toda lógica de negocio**:
```
1. Escribir el test → falla (RED)
2. Escribir el código mínimo para pasarlo → pasa (GREEN)
3. Refactorizar sin romper el test (REFACTOR)
```

**Django (Backend)**:
```python
# Ejemplo: test antes de implementar el endpoint de ventas
class VentaAPITestCase(TestCase):
    def setUp(self):
        self.sede = Sede.objects.create(name="Norte", address="Av. 1")
        self.cajero = CustomUser.objects.create_user(
            email="cajero@test.com",
            password="test1234",
            role="CASHIER",
            sede=self.sede
        )
        self.producto = Producto.objects.create(
            name="Aceite Motor", price=150.00, sku="ACE-001"
        )
        Stock.objects.create(producto=self.producto, sede=self.sede, quantity=10)
        self.client.force_authenticate(user=self.cajero)

    def test_crear_venta_descuenta_stock(self):
        response = self.client.post('/api/ventas/', {
            'items': [{'producto_id': self.producto.id, 'quantity': 3}],
            'metodo_pago': 'EFECTIVO',
            'monto_recibido': 500.00
        })
        self.assertEqual(response.status_code, 201)
        stock = Stock.objects.get(producto=self.producto, sede=self.sede)
        self.assertEqual(stock.quantity, 7)  # 10 - 3 = 7

    def test_venta_falla_si_stock_insuficiente(self):
        response = self.client.post('/api/ventas/', {
            'items': [{'producto_id': self.producto.id, 'quantity': 15}],
            'metodo_pago': 'EFECTIVO'
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('stock_insuficiente', response.data)
```

**React (Frontend)**:
```typescript
// Ejemplo: test del hook de carrito
import { renderHook, act } from '@testing-library/react';
import { useCarrito } from '../hooks/useCarrito';

describe('useCarrito', () => {
  it('debe agregar un producto al carrito', () => {
    const { result } = renderHook(() => useCarrito());
    act(() => {
      result.current.agregarProducto({ id: 1, name: 'Aceite', price: 150, quantity: 1 });
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(150);
  });

  it('debe incrementar cantidad si el producto ya existe', () => {
    const { result } = renderHook(() => useCarrito());
    act(() => {
      result.current.agregarProducto({ id: 1, name: 'Aceite', price: 150, quantity: 1 });
      result.current.agregarProducto({ id: 1, name: 'Aceite', price: 150, quantity: 1 });
    });
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.total).toBe(300);
  });
});
```

**Cobertura mínima requerida**: 80% en lógica de negocio

---

### 6. Refactoring
**Cuándo refactorizar**:
- Cuando un método tiene más de 20 líneas
- Cuando hay lógica duplicada (DRY)
- Cuando el nombre de una función no describe lo que hace
- Al finalizar una historia, antes de marcarla como Done

**No refactorizar**:
- En medio de una historia no terminada
- Sin que todos los tests pasen primero

---

### 7. Pair Programming (adaptado)
**Para equipo de 1 desarrollador**: Code review al día siguiente con ojos frescos.
**Para equipo de 2 desarrolladores**: Pair en:
- Lógica crítica (cálculo de ventas, cierre de caja)
- Código de seguridad (autenticación, permisos)
- Bugs difíciles de reproducir

**Técnica "Rubber Duck"**: Explicar el código en voz alta antes de preguntar.

---

### 8. Collective Code Ownership
- Cualquier desarrollador puede modificar cualquier parte del código
- No hay "dueños" de módulos
- Los tests protegen contra cambios accidentales

---

### 9. Continuous Integration
```yaml
# Flujo de CI en cada push
Push a branch →
  GitHub Actions ejecuta:
    - Tests Django (python manage.py test)
    - Tests React (npm test)
    - ESLint
    - pip-audit (seguridad de dependencias)
    - npm audit
  Si todo pasa → PR habilitado para review
  Merge a main → Deploy automático a Railway
```

**Regla**: El código en `main` siempre está desplegado y funcional.

---

### 10. Semana de 40 horas
- No trabajar más de 8 horas al día de forma consistente
- Si una historia está tardando más de lo estimado: re-estimar y mover parte al siguiente sprint
- La velocidad sostenible es más importante que la velocidad máxima

---

### 11. Cliente On-Site (adaptado)
- El cliente (dueño del negocio) es contactable por WhatsApp en horario laboral
- Respuesta máxima a preguntas de negocio: 24 horas
- Demo de avance cada 2 semanas en el negocio

---

### 12. Estándares de Código
**Python/Django**:
- Formatter: `black`
- Imports: `isort`
- Linter: `flake8`
- Docstrings: en vistas, modelos y funciones complejas

**TypeScript/React**:
- Formatter: `prettier`
- Linter: `eslint` con reglas de react-hooks
- Componentes: PascalCase
- Hooks: camelCase con prefijo `use`
- Variables/funciones: camelCase

---

## Estructura de una Iteración (2 semanas)

```
DÍA 1 (Lunes) — Planificación
  09:00 - Demo de la iteración anterior al cliente (30 min)
  09:30 - Retrospectiva interna (15 min):
          "¿Qué funcionó? ¿Qué mejorar?"
  10:00 - Planning Game (1-2 horas):
          Leer historias del backlog
          Estimar en puntos
          Seleccionar historias para la iteración
  12:00 - Desglosar historias en tareas técnicas
          Cada tarea ≤ 1 día de trabajo

DÍAS 2-9 (Martes a Miércoles siguiente)
  Standup diario (10 min):
    "¿Qué hice ayer?"
    "¿Qué haré hoy?"
    "¿Hay algún bloqueo?"

  Trabajo en TDD: Red → Green → Refactor
  CI: Push frecuente (mínimo 1 vez al día)
  Demo informal al cliente cada 3-4 días

DÍA 10 (Viernes) — Cierre
  Tests completos pasan ✅
  Deploy a Railway ✅
  Demo al cliente de las historias completadas
  Actualizar documentación (plan-proyecto.md, historias-de-usuario.md)
  Velocidad registrada para planificar la siguiente iteración
```

---

## Velocidad del Equipo

La "velocidad" es cuántos puntos se completan por iteración.
Se usa para planificar iteraciones futuras.

| Iteración | Puntos Planeados | Puntos Completados | Velocidad |
|-----------|-----------------|-------------------|-----------|
| 1 (Fundamentos) | 6 | 6 | 6 pts |
| 2 | — | — | — |
| ... | — | — | — |

> **Regla**: Planifica la siguiente iteración con la velocidad de la anterior.
> Si la velocidad varía mucho, usa el promedio de las últimas 3.

---

## GitHub Projects — Tablero Kanban

```
COLUMNAS:
┌──────────┬────────────────┬─────────────┬──────────┬──────┐
│ Backlog  │ Iteración      │ En Progreso │  Review  │ Done │
│          │ Actual         │             │          │      │
│ HU-04    │ HU-08 (2pts)   │ HU-05 (2pts)│ HU-07    │ HU-01│
│ HU-09    │ HU-06 (1pt)    │             │          │ HU-02│
│ HU-10    │                │             │          │ HU-03│
│ ...      │                │             │          │      │
└──────────┴────────────────┴─────────────┴──────────┴──────┘

REGLAS:
- Máximo 1 historia "En Progreso" a la vez
- Una historia pasa a "Review" solo cuando todos sus criterios de aceptación están cumplidos y los tests pasan
- Una historia pasa a "Done" cuando el cliente la confirma en la demo
```

---

## Definición de "Done" (DoD)

Una historia se considera **completamente terminada** cuando:

1. ✅ Todos los criterios de aceptación están cumplidos
2. ✅ Tests unitarios escritos y pasando (cobertura ≥ 80%)
3. ✅ No hay errores de ESLint ni flake8
4. ✅ El código está en `main` y desplegado en Railway
5. ✅ La documentación fue actualizada (si aplica)
6. ✅ El cliente vio la funcionalidad en la demo y la aprobó

---

## Reglas del Proyecto

1. **No mergear a main si los tests fallan** — nunca, sin excepción
2. **No estimar en horas**, solo en puntos de historia
3. **Una historia en progreso a la vez** — terminar antes de empezar la siguiente
4. **El cliente aprueba, no el desarrollador** — una historia no está "Done" hasta que el cliente lo confirme
5. **Si una historia tarda más del doble de lo estimado** — dividirla en dos historias más pequeñas
