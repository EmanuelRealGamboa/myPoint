# Módulo de Facturación y Tickets PDF — MotoQFox

**Fecha de planificación**: 2026-03-10
**Versión SAT aplicable**: CFDI 4.0 (obligatoria desde enero 2022)
**Referencia normativa**: Anexo 20 de la Resolución Miscelánea Fiscal (RMF)

---

## Índice

1. [Diferencia entre Ticket y Factura CFDI](#1-diferencia-entre-ticket-y-factura-cfdi)
2. [Requisitos legales del SAT México](#2-requisitos-legales-del-sat-méxico)
3. [Arquitectura del módulo](#3-arquitectura-del-módulo)
4. [Modelos de base de datos](#4-modelos-de-base-de-datos)
5. [Plan de implementación por fases](#5-plan-de-implementación-por-fases)
6. [Integración con PAC](#6-integración-con-pac)
7. [Flujos de usuario](#7-flujos-de-usuario)
8. [Consideraciones de seguridad](#8-consideraciones-de-seguridad)
9. [Pendientes y decisiones del cliente](#9-pendientes-y-decisiones-del-cliente)

---

## 1. Diferencia entre Ticket y Factura CFDI

| Concepto | Ticket de Venta | Factura CFDI 4.0 |
|---|---|---|
| Validez fiscal | ❌ No tiene | ✅ Documento fiscal válido ante SAT |
| Formato | PDF simple | XML timbrado + PDF representación |
| Requiere RFC del cliente | ❌ No | ✅ Sí (exacto como en SAT) |
| Requiere PAC | ❌ No | ✅ Sí |
| Deducible de impuestos | ❌ No | ✅ Sí |
| Puede cancelarse ante SAT | ❌ No aplica | ✅ Sí, con proceso formal |
| Complejidad técnica | Baja | Alta |
| Costo por documento | $0 | ~$0.50–$2 MXN por timbre (PAC) |

**Decisión de diseño**: El sistema implementará ambos en fases separadas. El ticket es inmediato y sin costo extra; la factura requiere contrato con un PAC.

---

## 2. Requisitos legales del SAT México

### 2.1 Qué necesita el EMISOR (la empresa MotoQFox por sede)

Para poder emitir CFDIs fiscalmente válidos, **cada sede que emita facturas** necesita:

| Requisito | Descripción |
|---|---|
| **RFC activo** | Registro Federal de Contribuyentes vigente |
| **e.firma (FIEL)** | Firma electrónica avanzada del SAT |
| **CSD** | Certificado de Sello Digital (se obtiene con la FIEL en el portal Certifica del SAT). Válido 4 años |
| **Régimen fiscal** | El código de régimen registrado en el SAT (ej. 601, 612) |
| **Domicilio fiscal** | CP del domicilio fiscal registrado ante el SAT |
| **PAC contratado** | Proveedor Autorizado de Certificación (empresa que sella y timbra el CFDI) |

> ⚠️ El CSD es un par de archivos: **`.cer`** (certificado público) y **`.key`** (llave privada), más una contraseña. Son SECRETOS y deben almacenarse cifrados.

### 2.2 Qué necesita proporcionar el RECEPTOR (el cliente)

Desde CFDI 4.0 (2022), el receptor debe proporcionar **4 datos obligatorios**:

| Campo SAT | Descripción | Ejemplo |
|---|---|---|
| **RFC** | 12 chars (empresa) ó 13 chars (persona física). Público general = `XAXX010101000` | `ABCD840101XYZ` |
| **Nombre** | Nombre o Razón Social **exactamente** como está en el RFC del SAT. Case-sensitive | `JUAN GARCIA LOPEZ` |
| **Código Postal fiscal** | CP de su domicilio fiscal registrado ante SAT (no necesariamente donde vive) | `07700` |
| **Régimen fiscal** | Código del régimen del cliente (de catálogo SAT) | `605`, `612`, `616` |
| **Uso CFDI** | Para qué usará la factura (de catálogo SAT) | `G01`, `G03`, `S01` |

### 2.3 Campos requeridos en el XML CFDI 4.0

#### Comprobante (raíz del documento)

| Campo XML | Descripción | Valor típico MotoQFox |
|---|---|---|
| `Version` | Versión CFDI | `4.0` |
| `Fecha` | Fecha/hora de emisión (ISO 8601, dentro de 72h) | `2026-03-10T14:30:00` |
| `FormaPago` | Cómo pagó el cliente (catálogo SAT) | `01`=Efectivo, `04`=T.Crédito, `28`=T.Débito, `03`=Transferencia |
| `SubTotal` | Suma de importes antes de IVA | `862.07` |
| `Descuento` | Descuento total (si aplica) | `0` |
| `Moneda` | ISO 4217 | `MXN` |
| `Total` | Total incluyendo impuestos | `1000.00` |
| `TipoDeComprobante` | Tipo de CFDI | `I` (Ingreso) |
| `Exportacion` | `01` (No aplica) para ventas locales | `01` |
| `MetodoPago` | `PUE` = pago único; `PPD` = a plazos | `PUE` |
| `LugarExpedicion` | CP del lugar de emisión (sede) | `07700` |

#### Por producto (`Concepto`)

| Campo XML | Descripción | Ejemplo pieza de moto |
|---|---|---|
| `ClaveProdServ` | Clave del catálogo de productos SAT | `25171500` (refacciones auto/moto) |
| `NoIdentificacion` | SKU interno | `MOT-001` |
| `Cantidad` | Cantidad vendida | `2` |
| `ClaveUnidad` | Clave SAT de unidad | `H87` (Pieza) |
| `Unidad` | Descripción unidad | `PIEZA` |
| `Descripcion` | Nombre del producto | `Filtro de aceite Honda Wave 110` |
| `ValorUnitario` | Precio antes de IVA | `431.03` |
| `Importe` | Cantidad × ValorUnitario | `862.07` |
| `ObjetoImp` | ¿Objeto de impuesto? | `02` (Sí, objeto de IVA) |

#### Impuestos IVA por concepto

| Campo | Valor para IVA 16% estándar |
|---|---|
| `Base` | Importe del concepto |
| `Impuesto` | `002` (IVA) |
| `TipoFactor` | `Tasa` |
| `TasaOCuota` | `0.160000` |
| `Importe` | Base × 0.16 |

### 2.4 Catálogo FormaPago (relevante para MotoQFox)

| Código | Forma de pago |
|---|---|
| `01` | Efectivo |
| `03` | Transferencia electrónica |
| `04` | Tarjeta de crédito |
| `28` | Tarjeta de débito |
| `99` | Por definir (si MetodoPago=PPD) |

### 2.5 Uso CFDI más comunes para clientes de refacciones

| Código | Descripción |
|---|---|
| `G01` | Adquisición de mercancías |
| `G03` | Gastos en general |
| `I03` | Equipo de transporte |
| `S01` | Sin efectos fiscales (el más común si no saben) |

### 2.6 Claves ClaveProdServ relevantes para motos/refacciones

| Clave SAT | Categoría |
|---|---|
| `25171500` | Refacciones y accesorios para motocicletas |
| `25172100` | Partes de motor (automotriz) |
| `25172200` | Accesorios de transmisión |
| `15101500` | Aceites lubricantes |
| `25174400` | Accesorios eléctricos para vehículos |
| `25174500` | Accesorios de frenos |
| `84111501` | Filtros |

---

## 3. Arquitectura del módulo

```
┌─────────────────────────────────────────────────────────────────┐
│  MÓDULO FACTURACIÓN / TICKETS                                    │
│                                                                  │
│  Fase T ────────────────────────────────────────────────────    │
│   ┌──────────────────┐    ┌──────────────────────────────────┐  │
│   │ ConfigFiscalSede │    │  PDF Ticket (WeasyPrint/ReportLab)│  │
│   │ (logo, nombre,   │───▶│  Generado en backend, descargable │  │
│   │  tel, dirección) │    │  desde historial de ventas        │  │
│   └──────────────────┘    └──────────────────────────────────┘  │
│                                                                  │
│  Fase F ────────────────────────────────────────────────────    │
│   ┌──────────────────┐    ┌──────────────────────────────────┐  │
│   │ConfigCFDISede    │    │  PAC API (FacturAPI / Facturama)  │  │
│   │(RFC, CSD.cer,    │───▶│  POST /cfdi → XML timbrado       │  │
│   │ CSD.key,         │    │  → UUID + PDF representación      │  │
│   │ régimen,         │    └──────────────────────────────────┘  │
│   │ CP emisión)      │           │                              │
│   └──────────────────┘           ▼                              │
│   ┌──────────────────┐    ┌──────────────────────────────────┐  │
│   │DatosFiscalesClien│    │  CFDI almacenado en BD           │  │
│   │(RFC, nombre SAT, │    │  UUID, XML, PDF, status          │  │
│   │ CP, régimen,     │    │  Reenvío por email al cliente     │  │
│   │ uso_cfdi, email) │    └──────────────────────────────────┘  │
│   └──────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Stack tecnológico propuesto

| Componente | Tecnología | Razón |
|---|---|---|
| PDF Tickets | **WeasyPrint** (Python) o **xhtml2pdf** | HTML+CSS → PDF, fácil de personalizar por sede |
| CFDI generación XML | **FacturAPI** (SaaS PAC) | API REST simple, ~$0.80 MXN/timbre, sandbox gratis |
| CFDI alternativa PAC | **Facturama** | También API REST, popular en México |
| Almacenamiento CSD | **Archivos cifrados en servidor** (AES-256) | Los .cer/.key NUNCA van a la BD directamente |
| Email CFDI | **Django send_mail** + SMTP (Gmail/SendGrid) | Envío de XML+PDF al correo del cliente |

---

## 4. Modelos de base de datos

### 4.1 App `billing` (nueva app Django)

```python
# billing/models.py

class ConfiguracionFiscalSede(models.Model):
    """
    Información fiscal y comercial por sede.
    El superadministrador configura una por sede.
    """
    sede              = models.OneToOneField('branches.Sede', on_delete=models.PROTECT,
                                             related_name='config_fiscal')
    # Datos generales (para TICKET simple)
    nombre_comercial  = models.CharField(max_length=200)      # ej. "MotoQFox Sucursal Norte"
    nombre_legal      = models.CharField(max_length=300)      # Razón social legal
    rfc               = models.CharField(max_length=13)       # RFC del emisor
    regimen_fiscal    = models.CharField(max_length=3)        # Código SAT ej. "601"
    cp_expedicion     = models.CharField(max_length=5)        # CP lugar de expedición
    direccion         = models.TextField()                    # Dirección completa
    telefono          = models.CharField(max_length=20)
    email_facturas    = models.EmailField()                   # Email para enviar CFDIs
    logo              = models.ImageField(upload_to='billing/logos/', null=True, blank=True)
    # Leyenda pie de ticket
    leyenda_ticket    = models.TextField(default='Gracias por su compra. Este documento no es una factura fiscal.')
    # Control
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_config_fiscal_sede'
        verbose_name = 'Configuración Fiscal de Sede'


class ConfiguracionCFDI(models.Model):
    """
    Credenciales del CSD para timbrado CFDI. UNO por sede.
    Sólo superadministrador puede configurar esto.
    Los archivos CSD se almacenan cifrados.
    """
    sede              = models.OneToOneField('branches.Sede', on_delete=models.PROTECT,
                                             related_name='config_cfdi')
    pac_nombre        = models.CharField(max_length=50, choices=[
                            ('facturapi', 'FacturAPI'),
                            ('facturama', 'Facturama'),
                        ])
    pac_api_key       = models.TextField()                    # API key del PAC (cifrada en BD)
    pac_api_key_sandbox = models.TextField(null=True)         # Para pruebas
    modo_sandbox      = models.BooleanField(default=True)     # Cambiar a False en producción
    csd_cer_path      = models.CharField(max_length=500)      # Ruta del .cer cifrado en servidor
    csd_key_path      = models.CharField(max_length=500)      # Ruta del .key cifrado en servidor
    csd_password      = models.TextField()                    # Contraseña del .key (cifrada)
    csd_numero        = models.CharField(max_length=20)       # Número de certificado
    csd_vigencia      = models.DateField()                    # Fecha de expiración del CSD
    serie             = models.CharField(max_length=10, default='A')  # Serie del folio
    folio_actual      = models.PositiveIntegerField(default=1)        # Autoincremental
    activo            = models.BooleanField(default=False)
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_config_cfdi'
        verbose_name = 'Configuración CFDI'


class DatosFiscalesCliente(models.Model):
    """
    Datos fiscales de un cliente para facturación.
    Se guarda por RFC para reutilizar en compras futuras.
    """
    rfc               = models.CharField(max_length=13, unique=True)
    nombre            = models.CharField(max_length=300)      # Exactamente como en SAT
    cp_fiscal         = models.CharField(max_length=5)        # CP domicilio fiscal
    regimen_fiscal    = models.CharField(max_length=3)        # Código SAT
    email             = models.EmailField()                   # Para recibir el CFDI
    telefono          = models.CharField(max_length=20, blank=True)
    # Para clientes extranjeros
    residencia_fiscal = models.CharField(max_length=3, blank=True)  # País ISO
    num_reg_id_trib   = models.CharField(max_length=40, blank=True) # Tax ID extranjero
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_datos_fiscales_cliente'
        verbose_name = 'Datos Fiscales de Cliente'


class CFDI(models.Model):
    """
    Registro de cada CFDI generado, asociado a una Venta.
    """
    class Status(models.TextChoices):
        BORRADOR    = 'BORRADOR',    'Borrador'
        TIMBRADO    = 'TIMBRADO',    'Timbrado'
        CANCELADO   = 'CANCELADO',   'Cancelado'
        ERROR       = 'ERROR',       'Error de timbrado'

    venta           = models.OneToOneField('sales.Venta', on_delete=models.PROTECT,
                                           related_name='cfdi')
    sede            = models.ForeignKey('branches.Sede', on_delete=models.PROTECT)
    cliente         = models.ForeignKey(DatosFiscalesCliente, on_delete=models.PROTECT,
                                        null=True)  # null si es XAXX (público general)
    uso_cfdi        = models.CharField(max_length=4, default='S01')  # Catálogo SAT

    # Datos del timbrado (llenados por PAC)
    uuid            = models.UUIDField(null=True, blank=True)    # Folio Fiscal SAT
    serie           = models.CharField(max_length=10, blank=True)
    folio           = models.PositiveIntegerField(null=True)
    fecha_emision   = models.DateTimeField(null=True)
    fecha_timbrado  = models.DateTimeField(null=True)
    total           = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal        = models.DecimalField(max_digits=12, decimal_places=2)
    total_iva       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    descuento       = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Archivos
    xml_timbrado    = models.TextField(blank=True)           # XML completo timbrado
    pdf_path        = models.CharField(max_length=500, blank=True)  # Ruta al PDF

    # Estado
    status          = models.CharField(max_length=20, choices=Status.choices,
                                       default=Status.BORRADOR)
    error_msg       = models.TextField(blank=True)           # Mensaje de error si falló

    # Cancelación
    motivo_cancelacion = models.CharField(max_length=2, blank=True)  # 01-04 catálogo SAT
    uuid_sustiticion   = models.UUIDField(null=True, blank=True)     # Si motivo = 01

    # Control
    generado_por    = models.ForeignKey('users.CustomUser', on_delete=models.SET_NULL,
                                        null=True, related_name='cfdis_generados')
    enviado_por_email = models.BooleanField(default=False)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_cfdis'
        verbose_name = 'CFDI'
        verbose_name_plural = 'CFDIs'


class ProductoClaveSAT(models.Model):
    """
    Mapeo entre Producto del inventario y clave SAT (ClaveProdServ y ClaveUnidad).
    Necesario para generar los conceptos del CFDI.
    """
    producto         = models.OneToOneField('inventory.Producto', on_delete=models.CASCADE,
                                            related_name='clave_sat')
    clave_prod_serv  = models.CharField(max_length=8, default='25171500')
    clave_unidad     = models.CharField(max_length=3, default='H87')  # H87=Pieza
    objeto_imp       = models.CharField(max_length=2, default='02')   # 02=Objeto de IVA
    tasa_iva         = models.DecimalField(max_digits=6, decimal_places=4,
                                           default='0.160000')        # 16% estándar

    class Meta:
        db_table = 'billing_producto_clave_sat'
        verbose_name = 'Clave SAT de Producto'
```

---

## 5. Plan de implementación por fases

### Fase T — Ticket de Venta PDF *(Prioridad Alta, sin dependencias externas)*

**Objetivo**: Generar un PDF descargable/imprimible por cada venta, personalizado por sede.

#### T.1 — Configuración fiscal por sede (Admin)

**Backend:**
- [ ] Crear app `billing` en Django
- [ ] Modelo `ConfiguracionFiscalSede` (OneToOne con Sede)
- [ ] `GET/POST/PUT /api/billing/config/<sede_id>/` — solo ADMINISTRATOR
- [ ] Endpoint upload logo: `PATCH /api/billing/config/<sede_id>/logo/`
- [ ] `makemigrations billing` + `migrate`

**Frontend:**
- [ ] Nueva sección en DashboardPage: **"Facturación"**
- [ ] `ConfigFiscalAdmin.tsx` — lista de sedes con su estado de configuración
- [ ] `ConfigFiscalForm.tsx` — formulario por sede: nombre comercial, nombre legal, RFC, régimen, CP, dirección, teléfono, email, logo, leyenda ticket

#### T.2 — Generación de ticket PDF

**Backend:**
- [ ] Instalar: `pip install weasyprint` (o `xhtml2pdf` como alternativa más liviana)
- [ ] Template HTML del ticket: `billing/templates/ticket.html`
  ```
  [LOGO SEDE]          [Nombre comercial]
  RFC: XXXX           Dirección
  Tel: XXXX           Email
  ─────────────────────────────────
  TICKET #0001         10/03/2026 14:30
  Cajero: Juan López   Sede: Norte
  ─────────────────────────────────
  Cant.  Descripción          Precio   Total
  2      Filtro aceite Honda  $50.00   $100.00
  1      Bujía NGK            $45.00   $45.00
  ─────────────────────────────────
  Subtotal:                           $145.00
  IVA (incluido):                     $20.00
  TOTAL:                              $145.00
  ─────────────────────────────────
  Pago: Efectivo        Pagó: $200.00
  Cambio:                     $55.00
  ─────────────────────────────────
  Este documento no es una factura fiscal.
  Solicite su factura en un plazo de 30 días.
  ```
- [ ] `GET /api/billing/ticket/<venta_id>/` → retorna PDF (Content-Type: application/pdf)

**Frontend:**
- [ ] Botón **"🖨️ Ticket"** en `SalesHistoryView.tsx` (admin y encargado)
- [ ] Botón **"🖨️ Ticket"** en `POSView.tsx` (cajero, después de completar venta)
- [ ] `window.open(url)` o descarga directa del PDF

---

### Fase F1 — Claves SAT por producto *(Prerrequisito para CFDI)*

**Objetivo**: Que cada producto tenga su clave del catálogo SAT asignada.

**Backend:**
- [ ] Modelo `ProductoClaveSAT` (OneToOne con Producto)
- [ ] `GET/PUT /api/billing/productos/clave-sat/<producto_id>/`

**Frontend:**
- [ ] En `ProductFormModal.tsx` → nueva pestaña **"Fiscal"**
  - Campo: ClaveProdServ (con búsqueda del catálogo SAT o input libre)
  - Campo: ClaveUnidad (selector: H87=Pieza, KGM=Kg, E48=Servicio, LTR=Litro)
  - Campo: Tasa IVA (selector: 16%, 8% zona frontera, 0%, Exento)
  - Campo: ObjetoImp (automático según tasa)

---

### Fase F2 — Datos fiscales del cliente *(Para solicitar factura)*

**Objetivo**: El cajero/encargado puede buscar o registrar los datos fiscales del cliente al momento de solicitar factura.

**Backend:**
- [ ] Modelo `DatosFiscalesCliente`
- [ ] `GET /api/billing/clientes-fiscales/?rfc=` — búsqueda por RFC
- [ ] `POST /api/billing/clientes-fiscales/` — crear nuevo
- [ ] `PUT /api/billing/clientes-fiscales/<id>/` — actualizar

**Frontend:**
- [ ] `SolicitarFacturaModal.tsx`:
  1. Buscador por RFC
  2. Si existe → muestra datos pre-llenados (editable)
  3. Si no existe → formulario nuevo
  4. Selector UsoCFDI
  5. Botón "Generar CFDI"

---

### Fase F3 — Integración PAC y generación CFDI *(Fase principal)*

**Objetivo**: Timbrar CFDIs reales a través de un PAC y almacenarlos.

#### F3.1 — Configuración CFDI por sede (Admin)

**Backend:**
- [ ] Modelo `ConfiguracionCFDI`
- [ ] Upload CSD: `POST /api/billing/config-cfdi/<sede_id>/csd/` — recibe .cer + .key + password
  - Valida que los archivos sean válidos
  - Los guarda cifrados en el servidor (no en BD directamente)
  - Extrae número de certificado y fecha de vigencia
- [ ] `GET/PUT /api/billing/config-cfdi/<sede_id>/` — API key del PAC, modo sandbox, serie

**Frontend:**
- [ ] `ConfigCFDIForm.tsx` — formulario de configuración CFDI por sede:
  - Selector PAC (FacturAPI / Facturama)
  - API Key del PAC (campo password)
  - Upload .cer y .key
  - Password del .key
  - Serie del folio
  - Toggle modo sandbox/producción
  - Indicador de vigencia del CSD

#### F3.2 — Servicio de timbrado

**Backend — Service Layer:**
```python
# billing/services/cfdi_service.py

class CFDIService:
    def __init__(self, sede_id: int):
        self.config = ConfiguracionCFDI.objects.get(sede_id=sede_id)
        self.pac = self._get_pac_client()

    def generar_cfdi(self, venta: Venta, cliente: DatosFiscalesCliente,
                     uso_cfdi: str) -> CFDI:
        """
        1. Construye el payload con los datos de la venta
        2. Llama al PAC API para timbrar
        3. Guarda el CFDI resultante
        4. Incrementa el folio
        """
        ...

    def cancelar_cfdi(self, cfdi: CFDI, motivo: str) -> bool:
        ...

    def reenviar_por_email(self, cfdi: CFDI) -> bool:
        ...
```

**Backend — Endpoints:**
- [ ] `POST /api/billing/cfdi/generar/` — body: {venta_id, cliente_fiscal_id, uso_cfdi}
- [ ] `GET /api/billing/cfdi/<uuid>/` — detalle del CFDI
- [ ] `GET /api/billing/cfdi/<uuid>/pdf/` — descarga PDF
- [ ] `GET /api/billing/cfdi/<uuid>/xml/` — descarga XML
- [ ] `POST /api/billing/cfdi/<uuid>/cancelar/` — cancelar ante SAT
- [ ] `POST /api/billing/cfdi/<uuid>/reenviar/` — reenviar por email
- [ ] `GET /api/billing/cfdi/?sede_id=&fecha_desde=&fecha_hasta=` — listado

**Frontend — Flujo cajero:**
- [ ] En POSView o SalesHistoryView: botón **"Solicitar Factura"** (disponible 30 días)
- [ ] Abre `SolicitarFacturaModal.tsx`
- [ ] Al confirmar → spinner de timbrado → muestra UUID + botones descarga

---

### Fase F4 — Gestión de CFDIs (Panel Admin)

**Objetivo**: El administrador puede ver, descargar y gestionar todos los CFDIs por sede.

**Frontend:**
- [ ] Nueva sección en DashboardPage: **"CFDIs"** (dentro de grupo Facturación)
- [ ] `CFDIListView.tsx`:
  - Filtros: sede, fecha, status (TIMBRADO/CANCELADO/ERROR), RFC cliente
  - Tabla: UUID (folio fiscal), Venta, Cliente, Total, Status, Fecha
  - Acciones: Descargar XML, Descargar PDF, Reenviar email, Cancelar
- [ ] `CFDIDetailView.tsx` — modal con datos completos del CFDI

---

## 6. Integración con PAC

### FacturAPI (recomendado)

**Por qué FacturAPI:**
- API REST moderna y bien documentada en español
- Sandbox gratuito e ilimitado
- ~$0.80 MXN por timbre en producción
- Maneja automáticamente el XML CFDI 4.0 y el timbrado
- Genera el PDF de representación impresa automáticamente
- Portal web para gestión manual si se requiere

**Flujo de integración:**

```
MotoQFox Backend                    FacturAPI
      │                                  │
      │  POST /v2/invoices               │
      │  {                               │
      │    type: "I",                    │
      │    customer: {                   │
      │      legal_name, rfc,           │
      │      tax_id, tax_system,        │
      │      address: { zip }           │
      │    },                            │
      │    use: "G01",                   │
      │    items: [                      │
      │      {                           │
      │        product: {               │
      │          description, price,    │
      │          product_key,           │
      │          unit_key              │
      │        },                       │
      │        quantity: 2             │
      │      }                          │
      │    ],                            │
      │    payment_form: "01"           │
      │  }  ──────────────────────────▶ │
      │                                  │ Timbra con SAT
      │  ◀────────────────────────────  │
      │  {                               │
      │    id, uuid,                    │
      │    status: "valid",             │
      │    xml (base64),                │
      │    pdf_url                      │
      │  }                               │
```

**Instalación:**
```bash
pip install requests  # Ya disponible, usar httpx o requests para llamadas HTTP
```

**Configuración en Django:**
```python
# settings.py
FACTURAPI_KEY_SANDBOX = env('FACTURAPI_KEY_SANDBOX')
FACTURAPI_KEY_PROD    = env('FACTURAPI_KEY_PROD')
FACTURAPI_BASE_URL    = 'https://www.facturapi.io/v2/'
```

### Facturama (alternativa)

Similar funcionalidad, también con API REST. Requiere subir el CSD directamente a su plataforma. Precio similar.

---

## 7. Flujos de usuario

### 7.1 Configuración inicial (Superadministrador)

```
Admin inicia sesión
  └─▶ Panel Admin → Facturación → Configuración por Sede
        └─▶ Selecciona sede
              └─▶ Formulario Configuración Fiscal:
                    • Nombre comercial
                    • Nombre legal (razón social)
                    • RFC
                    • Régimen fiscal (selector SAT)
                    • CP de expedición
                    • Dirección completa
                    • Teléfono
                    • Email para facturas
                    • Logo (PNG/JPG, max 2MB)
                    • Leyenda pie de ticket
                    [Guardar]
              └─▶ (Opcional) Formulario CFDI:
                    • PAC a usar
                    • API Key del PAC
                    • Subir CSD (.cer + .key + password)
                    • Serie del folio
                    • Modo sandbox/producción
                    [Guardar]
```

### 7.2 Generación de Ticket (Cajero/Encargado)

```
Venta completada en POS
  └─▶ Pantalla de resumen de venta
        └─▶ Botón "Imprimir Ticket"
              └─▶ [GET /api/billing/ticket/<venta_id>/]
                    └─▶ PDF se abre en nueva pestaña / descarga automática
```

### 7.3 Solicitud de Factura CFDI (Cajero/Encargado)

```
Cliente solicita factura (hasta 30 días después de la venta)
  └─▶ Historial de ventas → Venta específica → "Solicitar Factura"
        └─▶ Modal: "Solicitar Factura"
              └─▶ Paso 1: Buscar por RFC
                    • Si existe → pre-llena datos (editable)
                    • Si no → ingresar manualmente:
                        - RFC
                        - Nombre (exacto como en SAT)
                        - CP fiscal
                        - Régimen fiscal (selector)
              └─▶ Paso 2: Uso CFDI
                    • Selector: G01, G03, S01, etc.
              └─▶ [Generar Factura]
                    └─▶ Spinner "Timbrado en progreso..."
                          └─▶ Éxito:
                                • UUID (Folio Fiscal): XXXX-XXXX-...
                                • [Descargar XML] [Descargar PDF]
                                • Enviado al email: cliente@email.com
                          └─▶ Error:
                                • Mensaje de error del PAC
                                • [Intentar de nuevo]
```

### 7.4 Gestión de CFDIs (Admin/Encargado)

```
Panel Admin → Facturación → CFDIs
  └─▶ Filtros: sede, fecha, status, RFC
  └─▶ Tabla de CFDIs
        └─▶ Acciones por CFDI:
              • [XML] → descarga el XML timbrado
              • [PDF] → descarga la representación impresa
              • [Email] → reenvía al correo del cliente
              • [Cancelar] → inicia proceso de cancelación ante SAT
                    └─▶ Modal: motivo de cancelación (01-04)
                          └─▶ [Confirmar cancelación]
```

---

## 8. Consideraciones de seguridad

### Protección del CSD

Los archivos `.cer` y `.key` son **extremadamente sensibles**. Si alguien obtiene el `.key` + password puede emitir facturas en nombre del negocio.

**Medidas obligatorias:**
- [ ] Los archivos CSD **nunca** se almacenan en la base de datos
- [ ] Se guardan en una carpeta fuera del webroot: `/etc/motoqfox/csd/<sede_id>/`
- [ ] Cifrados con AES-256 usando una clave maestra almacenada en variable de entorno
- [ ] Permisos de archivo: `chmod 600`
- [ ] La contraseña del `.key` se almacena cifrada en BD con `cryptography.fernet`
- [ ] Las API Keys del PAC también se cifran en BD
- [ ] Solo el proceso Django puede leer estos archivos (usuario www-data)
- [ ] Audit log de cada CFDI generado (quién lo generó, cuándo, para qué venta)

### Validación de RFC

- El RFC del receptor debe validarse contra el patrón del SAT antes de enviar al PAC
- Regex: `^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$` (persona física: 4 letras; moral: 3 letras)
- Para público en general usar `XAXX010101000` (no pedir RFC al cliente)

### Cancelación de CFDIs

- Desde 2022, muchas cancelaciones requieren la **aceptación del receptor** dentro de 72 horas
- El sistema debe manejar el estado "pendiente de aceptación" del receptor
- Motivos de cancelación SAT:
  - `01` = Comprobante emitido con errores con relación (requiere UUID sustitución)
  - `02` = Comprobante emitido con errores sin relación
  - `03` = No se llevó a cabo la operación
  - `04` = Operación nominativa relacionada en una factura global

---

## 9. Pendientes y decisiones del cliente

Antes de implementar Fase F (CFDI), el cliente debe resolver:

| Decisión | Opciones | Impacto |
|---|---|---|
| **¿Qué PAC usar?** | FacturAPI, Facturama, u otro PAC autorizado SAT | Requiere contrato y pago por timbrado |
| **¿Factura por sede o una sola empresa?** | Si todas las sedes son la misma razón social → un solo RFC; si son entidades distintas → un RFC por sede | Define si se usa una o varias `ConfiguracionCFDI` |
| **¿Modo de generación de tickets?** | WeasyPrint (requiere instalación del sistema) vs xhtml2pdf (pip only) vs jsPDF (frontend, más simple) | WeasyPrint = mejor calidad visual; jsPDF = más rápido de implementar |
| **¿Período para solicitar factura?** | SAT permite dentro del mes natural; propuesto: 30 días | Definir regla de negocio |
| **¿Factura global para público en general?** | Al fin del día, se puede emitir un CFDI global con RFC `XAXX010101000` cubriendo todas las ventas sin RFC | Requerido si se expiden tickets sin factura |

---

## Resumen de fases y prioridad

| Fase | Descripción | Complejidad | Dependencias externas |
|---|---|---|---|
| **T.1** | Config fiscal por sede (admin) | Baja | Ninguna |
| **T.2** | Generación de Ticket PDF | Media | WeasyPrint/xhtml2pdf |
| **F1** | Claves SAT por producto | Baja | Ninguna |
| **F2** | Datos fiscales del cliente | Baja-Media | Ninguna |
| **F3** | Integración PAC + CFDI real | Alta | PAC contratado, CSD vigente |
| **F4** | Gestión CFDIs (admin) | Media | F3 completada |

**Recomendación de orden de implementación:**
`T.1 → T.2 → F1 → F2 → F3 → F4`

Las fases T son completamente independientes del SAT y pueden implementarse de inmediato. Las fases F requieren que el cliente tenga su CSD vigente y haya contratado un PAC.
