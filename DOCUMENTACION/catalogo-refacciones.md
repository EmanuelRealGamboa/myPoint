# Catálogo de Refacciones — MotoQFox

Sistema de catalogación de piezas para refaccionaria de motos, basado en el estándar **YMM (Year / Make / Model)** usado en la industria.

---

## 1. Estructura de Categorías (2 niveles)

### Nivel 1 — Categorías (Familia)

| # | Categoría | Descripción |
|---|-----------|-------------|
| 1 | Motor | Partes internas y externas del motor |
| 2 | Sistema de frenos | Frenos delanteros y traseros |
| 3 | Transmisión | Cadena, piñones, embrague |
| 4 | Eléctrico e Ignición | Bujías, CDI, bobina, batería, cableado |
| 5 | Lubricación | Aceites y filtros de aceite |
| 6 | Suspensión | Amortiguadores, resortes, horquilla |
| 7 | Carrocería y Plásticos | Carenados, tapas, guardafangos |
| 8 | Iluminación | Faros, direccionales, luces traseras |
| 9 | Escape | Escapes, silenciadores, colectores |
| 10 | Llantas y Rines | Neumáticos, rines, cámaras, válvulas |
| 11 | Accesorios | Manillar, controles, espejos, portaequipajes |
| 12 | Consumibles | Filtros de aire, filtros de combustible, bujías, líquidos |

### Nivel 2 — Subcategorías (ejemplos)

**Motor:**
- Pistón y Cilindro, Cigüeñal y Biela, Válvulas, Empaque de Cabeza, Filtro de Aire (Cartucho), Carburador / Inyector, Bomba de Aceite

**Frenos:**
- Pastillas de Freno, Balatas, Disco de Freno, Bomba de Freno, Mangueras de Freno

**Transmisión:**
- Cadena de Transmisión, Piñón Delantero (Corona de Variador), Piñón Trasero (Sprocket), Kit Cadena + Piñones, Clutch (Discos), Cable de Clutch

**Eléctrico e Ignición:**
- Bujía, CDI / ECU, Bobina de Encendido, Batería, Regulador de Voltaje, Arnés de Cableado

---

## 2. Campos del Producto

### Identificación
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `sku` | string | Código interno único (auto-mayúsculas). Ej: `NGK-CR7E` |
| `codigo_barras` | string | EAN-13 o Code128. Se auto-genera desde SKU si se deja vacío |
| `numero_parte_oem` | string | N° de parte del fabricante original de la moto. Ej: `08798-9031` |
| `numero_parte_aftermarket` | string | N° de parte del fabricante de la refacción |

### Clasificación
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `categoria` | FK | Categoría nivel 1 |
| `subcategoria` | FK | Subcategoría nivel 2 (debe pertenecer a `categoria`) |
| `marca_fabricante` | FK | Marca que fabricó la pieza (NGK, AHL, BREMBO…) |
| `tipo_parte` | choices | `OEM` / `AFTERMARKET` / `REMANUFACTURADO` |
| `unidad_medida` | choices | `PIEZA` / `PAR` / `KIT` / `LITRO` / `METRO` / `ROLLO` |

### Precios
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `price` | Decimal | Precio de venta al público |
| `cost` | Decimal | Costo de compra / entrada |
| `precio_mayoreo` | Decimal (null) | Precio especial para venta al mayoreo |

### Almacén
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ubicacion_almacen` | string | Posición física. Formato: `PASILLO-RACK-NIVEL-POS` Ej: `A-03-2-B` |
| `peso_kg` | Decimal (null) | Peso en kg para cálculo de envío |

### Compatibilidad de Moto (Fitment / YMM)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `es_universal` | bool | Si es `true`, aplica a todos los modelos sin fitment específico |
| `aplicaciones` | M2M → ModeloMoto | Modelos de moto compatibles (a través de `CompatibilidadPieza`) |

### Estado
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `is_active` | bool | Soft delete |
| `es_descontinuado` | bool | Indica que el producto ya no se seguirá surtiendo |

---

## 3. Sistema de Códigos de Barras

### Estándares soportados
| Estándar | Longitud | Uso | Ejemplo |
|----------|----------|-----|---------|
| **EAN-13** | 13 dígitos | Productos retail, escaneo de caja | `7500000123456` |
| **Code 128** | Variable (alfanumérico) | Almacén interno, etiquetas propias | `NGK-CR7E` |

### Regla de auto-generación
Si el campo `codigo_barras` se deja vacío al crear un producto, el sistema asigna automáticamente el valor del `sku`. Esto permite usar el SKU como código de barras interno desde el primer día.

### Flujo de búsqueda por código
El endpoint de lista de productos (`GET /api/inventory/products/?search=`) busca simultáneamente en:
- `sku`
- `codigo_barras`
- `numero_parte_oem`
- `numero_parte_aftermarket`
- `name` y `description`

---

## 4. Catálogo de Motos (Fitment)

### Modelo de datos
```
MarcaMoto (Italika, Honda, Yamaha, Suzuki, Carabela, Vento, Benelli, Bajaj…)
    │  1:N
    ▼
ModeloMoto (Italika FT125 2020–2023, Honda CB125F 2019+…)
    │  M:M a través de CompatibilidadPieza
    ▼
Producto (Pastillas de freno, bujías, etc.)
```

### ModeloMoto — campos
| Campo | Descripción |
|-------|-------------|
| `marca` | FK a MarcaMoto |
| `modelo` | Nombre del modelo. Ej: `FT150` |
| `año_desde` | Año inicial de producción |
| `año_hasta` | Año final (null = se sigue fabricando) |
| `cilindraje` | En cc. Ej: 125, 150, 200 |
| `tipo_motor` | `2T` / `4T` / `ELECTRICO` |
| `tipo_moto` | `CARGO` / `NAKED` / `DEPORTIVA` / `SCOOTER` / `OFF_ROAD` / `CRUCERO` |

### CompatibilidadPieza — tabla intermedia
Permite almacenar datos adicionales por cada relación Producto ↔ ModeloMoto:

| Campo | Descripción |
|-------|-------------|
| `producto` | FK a Producto |
| `modelo_moto` | FK a ModeloMoto |
| `año_desde` | Override del rango de años (opcional) |
| `año_hasta` | Override del rango de años (opcional) |
| `nota` | Ej: "Solo para versión carburada" |

### Búsqueda por moto (ejemplo de uso en POS)
```
GET /api/inventory/products/?moto_modelo_id=5
```
Devuelve todos los productos que:
- Están marcados como `es_universal=true`, **O**
- Tienen `aplicaciones` que incluyen el `ModeloMoto` con id=5

---

## 5. Marcas Fabricante vs. Marcas de Moto

| Tipo | Modelo Django | Uso |
|------|--------------|-----|
| `MarcaFabricante` | NGK, AHL, BREMBO, Motul… | Quién fabricó la **pieza** |
| `MarcaMoto` | Italika, Honda, Yamaha… | Marca de la **motocicleta** |

`MarcaFabricante.tipo` puede ser:
- `OEM` — fabricante original del equipo (ej: Honda hace sus propias bujías para algunas motos)
- `AFTERMARKET` — fabricante de repuesto (ej: NGK, AHL)
- `GENERICO` — sin marca reconocida

---

## 6. Script de Datos de Prueba

### Ejecución
```bash
cd /c/sistemaMotoQFox/backend
source /c/sistemaMotoQFox/venv/Scripts/activate
python manage.py populate_catalog
```

### Opción --reset
```bash
python manage.py populate_catalog --reset
```
Elimina todos los datos del catálogo (categorías, marcas, modelos, productos) antes de poblar.

### Datos que crea
| Entidad | Cantidad |
|---------|----------|
| Categorías | 12 |
| Subcategorías | ~60 |
| Marcas fabricante | 11 (NGK, AHL, BREMBO, EBC, Motul, Bardahl, Mobil, OEM Honda, OEM Yamaha, OEM Italika, Genérico) |
| Marcas de moto | 8 (Italika, Honda, Yamaha, Suzuki, Carabela, Vento, Benelli, Bajaj) |
| Modelos de moto | 25 |
| Productos de prueba | 20 (con precios, bujías, aceites, pastillas, cadenas, etc.) |

---

## 7. Migraciones requeridas

Antes de usar el catálogo, el usuario debe crear y aplicar las migraciones:

```bash
cd /c/sistemaMotoQFox/backend
# Activar venv
source /c/sistemaMotoQFox/venv/Scripts/activate

# Generar migraciones (nuevos modelos inventory)
python manage.py makemigrations inventory

# Aplicar
python manage.py migrate

# Poblar datos de prueba
python manage.py populate_catalog
```

> ⚠️ **IMPORTANTE**: Las migraciones no se generan automáticamente — el desarrollador las ejecuta manualmente.
