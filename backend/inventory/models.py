"""
Inventory Models — MotoQFox POS
=================================
Categoria → Subcategoria → Producto → Stock (per sede)
MarcaMoto + ModeloMoto + CompatibilidadPieza (product ↔ moto fitment)
MarcaFabricante (NGK, AHL, OEM Honda…)
EntradaInventario  — merchandise receiving, updates Stock automatically
AuditoriaInventario / AuditoriaItem — physical count & stock reconciliation
"""
from django.db import models
from django.db import transaction


# ─────────────────────────────────────────────────────────────────────────────
#  CATEGORÍA (2 niveles)
# ─────────────────────────────────────────────────────────────────────────────

class Categoria(models.Model):
    name        = models.CharField(max_length=100, unique=True, verbose_name='Nombre')
    description = models.TextField(blank=True, default='', verbose_name='Descripción')
    is_active   = models.BooleanField(default=True, verbose_name='Activa')
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inventory_categorias'
        ordering = ['name']
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'

    def __str__(self):
        return self.name


class Subcategoria(models.Model):
    """Second-level category, always linked to a parent Categoria."""
    categoria   = models.ForeignKey(
        Categoria, on_delete=models.CASCADE,
        related_name='subcategorias', verbose_name='Categoría'
    )
    name        = models.CharField(max_length=100, verbose_name='Nombre')
    description = models.TextField(blank=True, default='', verbose_name='Descripción')
    is_active   = models.BooleanField(default=True, verbose_name='Activa')
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inventory_subcategorias'
        unique_together = ('categoria', 'name')
        ordering = ['categoria__name', 'name']
        verbose_name = 'Subcategoría'
        verbose_name_plural = 'Subcategorías'

    def __str__(self):
        return f'{self.categoria.name} › {self.name}'


# ─────────────────────────────────────────────────────────────────────────────
#  MARCA FABRICANTE  (NGK, AHL, BREMBO, OEM Honda…)
# ─────────────────────────────────────────────────────────────────────────────

class MarcaFabricante(models.Model):
    """Brand that manufactured the part (not the motorcycle brand)."""

    class TipoMarca(models.TextChoices):
        OEM         = 'OEM',         'OEM (Original Equipment Manufacturer)'
        AFTERMARKET = 'AFTERMARKET', 'Aftermarket'
        GENERICO    = 'GENERICO',    'Genérico'

    name      = models.CharField(max_length=100, unique=True, verbose_name='Nombre')
    tipo      = models.CharField(
        max_length=20, choices=TipoMarca.choices,
        default=TipoMarca.AFTERMARKET, verbose_name='Tipo'
    )
    pais      = models.CharField(max_length=50, blank=True, default='', verbose_name='País de origen')
    is_active = models.BooleanField(default=True, verbose_name='Activa')

    class Meta:
        db_table = 'inventory_marcas_fabricante'
        ordering = ['name']
        verbose_name = 'Marca Fabricante'
        verbose_name_plural = 'Marcas Fabricante'

    def __str__(self):
        return f'{self.name} ({self.tipo})'


# ─────────────────────────────────────────────────────────────────────────────
#  CATÁLOGO DE MOTOS  (para compatibilidad de piezas / fitment)
# ─────────────────────────────────────────────────────────────────────────────

class MarcaMoto(models.Model):
    """Motorcycle brand: Italika, Honda, Yamaha, Suzuki…"""
    name      = models.CharField(max_length=80, unique=True, verbose_name='Marca')
    is_active = models.BooleanField(default=True, verbose_name='Activa')

    class Meta:
        db_table = 'inventory_marcas_moto'
        ordering = ['name']
        verbose_name = 'Marca de Moto'
        verbose_name_plural = 'Marcas de Moto'

    def __str__(self):
        return self.name


class ModeloMoto(models.Model):
    """Specific motorcycle model variant used for fitment (compatibility)."""

    class TipoMotor(models.TextChoices):
        DOS_TIEMPOS   = '2T',       '2 Tiempos'
        CUATRO_TIEMPOS= '4T',       '4 Tiempos'
        ELECTRICO     = 'ELECTRICO','Eléctrico'

    class TipoMoto(models.TextChoices):
        CARGO    = 'CARGO',    'Carga / Trabajo'
        NAKED    = 'NAKED',    'Naked / Urbana'
        DEPORTIVA= 'DEPORTIVA','Deportiva'
        SCOOTER  = 'SCOOTER',  'Scooter / Automática'
        OFF_ROAD = 'OFF_ROAD', 'Off Road / Enduro'
        CRUCERO  = 'CRUCERO',  'Crucero'

    marca       = models.ForeignKey(
        MarcaMoto, on_delete=models.CASCADE,
        related_name='modelos', verbose_name='Marca'
    )
    modelo      = models.CharField(max_length=100, verbose_name='Modelo')
    año_desde   = models.SmallIntegerField(verbose_name='Año desde', default=2018)
    año_hasta   = models.SmallIntegerField(verbose_name='Año hasta', null=True, blank=True)
    cilindraje  = models.SmallIntegerField(verbose_name='Cilindraje (cc)', null=True, blank=True)
    tipo_motor  = models.CharField(
        max_length=10, choices=TipoMotor.choices,
        default=TipoMotor.CUATRO_TIEMPOS, verbose_name='Tipo de motor'
    )
    tipo_moto   = models.CharField(
        max_length=20, choices=TipoMoto.choices,
        default=TipoMoto.CARGO, verbose_name='Tipo de moto'
    )
    is_active   = models.BooleanField(default=True, verbose_name='Activo')

    class Meta:
        db_table = 'inventory_modelos_moto'
        unique_together = ('marca', 'modelo', 'año_desde')
        ordering = ['marca__name', 'modelo', 'año_desde']
        verbose_name = 'Modelo de Moto'
        verbose_name_plural = 'Modelos de Moto'

    def __str__(self):
        año_str = f'{self.año_desde}–{self.año_hasta}' if self.año_hasta else f'{self.año_desde}+'
        return f'{self.marca.name} {self.modelo} ({año_str})'


# ─────────────────────────────────────────────────────────────────────────────
#  PRODUCTO  (extended with all refaccionaria fields)
# ─────────────────────────────────────────────────────────────────────────────

class Producto(models.Model):

    class TipoParte(models.TextChoices):
        OEM            = 'OEM',            'OEM (Original)'
        AFTERMARKET    = 'AFTERMARKET',    'Aftermarket'
        REMANUFACTURADO= 'REMANUFACTURADO','Remanufacturado'

    class UnidadMedida(models.TextChoices):
        PIEZA  = 'PIEZA',  'Pieza'
        PAR    = 'PAR',    'Par'
        KIT    = 'KIT',    'Kit'
        LITRO  = 'LITRO',  'Litro'
        METRO  = 'METRO',  'Metro'
        ROLLO  = 'ROLLO',  'Rollo'

    # ── Identification ────────────────────────────────────────────────────
    sku                    = models.CharField(max_length=50, unique=True, verbose_name='SKU')
    name                   = models.CharField(max_length=200, verbose_name='Nombre')
    description            = models.TextField(blank=True, default='', verbose_name='Descripción')
    codigo_barras          = models.CharField(
        max_length=50, blank=True, default='', verbose_name='Código de barras',
        db_index=True,
        help_text='EAN-13, Code128 u otro. Se genera automáticamente si se deja vacío.'
    )
    numero_parte_oem       = models.CharField(
        max_length=80, blank=True, default='', verbose_name='N° de parte OEM',
        help_text='Número de parte del fabricante original de la moto.'
    )
    numero_parte_aftermarket = models.CharField(
        max_length=80, blank=True, default='', verbose_name='N° parte aftermarket',
        help_text='Número de parte del fabricante de la refacción.'
    )
    imagen = models.ImageField(
        upload_to='products/',
        null=True, blank=True,
        verbose_name='Imagen del producto'
    )

    # ── Classification ────────────────────────────────────────────────────
    categoria         = models.ForeignKey(
        Categoria, verbose_name='Categoría',
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='productos'
    )
    subcategoria      = models.ForeignKey(
        Subcategoria, verbose_name='Subcategoría',
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='productos'
    )
    marca_fabricante  = models.ForeignKey(
        MarcaFabricante, verbose_name='Marca fabricante',
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='productos'
    )
    tipo_parte        = models.CharField(
        max_length=20, choices=TipoParte.choices,
        default=TipoParte.AFTERMARKET, verbose_name='Tipo de parte'
    )
    unidad_medida     = models.CharField(
        max_length=10, choices=UnidadMedida.choices,
        default=UnidadMedida.PIEZA, verbose_name='Unidad de medida'
    )

    # ── Pricing ───────────────────────────────────────────────────────────
    price           = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Precio de venta')
    cost            = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Costo de compra')
    precio_mayoreo  = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name='Precio mayoreo'
    )

    # ── Warehouse ─────────────────────────────────────────────────────────
    ubicacion_almacen = models.CharField(
        max_length=30, blank=True, default='', verbose_name='Ubicación almacén',
        help_text='Formato: PASILLO-RACK-NIVEL-POS  Ej: A-03-2-B'
    )
    peso_kg           = models.DecimalField(
        max_digits=6, decimal_places=3, null=True, blank=True,
        verbose_name='Peso (kg)'
    )

    # ── Moto compatibility ────────────────────────────────────────────────
    es_universal  = models.BooleanField(
        default=False, verbose_name='Es universal',
        help_text='Aplica a múltiples modelos sin restricción de fitment.'
    )
    aplicaciones  = models.ManyToManyField(
        ModeloMoto,
        through='CompatibilidadPieza',
        related_name='piezas',
        blank=True,
        verbose_name='Modelos compatibles'
    )

    # ── Status ────────────────────────────────────────────────────────────
    is_active       = models.BooleanField(default=True, verbose_name='Activo')
    es_descontinuado= models.BooleanField(default=False, verbose_name='Descontinuado')
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory_productos'
        ordering = ['name']
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'

    def __str__(self):
        return f'[{self.sku}] {self.name}'

    def save(self, *args, **kwargs):
        # Auto-generate barcode from SKU if empty
        if not self.codigo_barras and self.sku:
            self.codigo_barras = self.sku
        super().save(*args, **kwargs)


class CompatibilidadPieza(models.Model):
    """
    Through model for Producto ↔ ModeloMoto M2M.
    Allows storing extra fitment data (year range, notes).
    """
    producto    = models.ForeignKey(Producto,   on_delete=models.CASCADE, related_name='compatibilidades')
    modelo_moto = models.ForeignKey(ModeloMoto, on_delete=models.CASCADE, related_name='compatibilidades')
    año_desde   = models.SmallIntegerField(null=True, blank=True, verbose_name='Año desde (override)')
    año_hasta   = models.SmallIntegerField(null=True, blank=True, verbose_name='Año hasta (override)')
    nota        = models.CharField(max_length=200, blank=True, default='', verbose_name='Nota')

    class Meta:
        db_table = 'inventory_compatibilidad_pieza'
        unique_together = ('producto', 'modelo_moto')
        verbose_name = 'Compatibilidad'
        verbose_name_plural = 'Compatibilidades'

    def __str__(self):
        return f'{self.producto.sku} ↔ {self.modelo_moto}'


# ─────────────────────────────────────────────────────────────────────────────
#  STOCK  (per sede, unchanged)
# ─────────────────────────────────────────────────────────────────────────────

class Stock(models.Model):
    """Current stock level for a product at a specific sede."""
    producto    = models.ForeignKey(
        Producto, on_delete=models.CASCADE,
        related_name='stock_items', verbose_name='Producto'
    )
    sede        = models.ForeignKey(
        'branches.Sede', on_delete=models.CASCADE,
        related_name='stock_items', verbose_name='Sede'
    )
    quantity    = models.IntegerField(default=0, verbose_name='Cantidad')
    min_quantity= models.IntegerField(default=5, verbose_name='Stock mínimo (alerta)')
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory_stock'
        unique_together = ('producto', 'sede')
        verbose_name = 'Stock'
        verbose_name_plural = 'Stock'

    def __str__(self):
        return f'{self.producto.sku} @ {self.sede.name}: {self.quantity}'

    @property
    def is_low_stock(self):
        return self.quantity <= self.min_quantity


# ─────────────────────────────────────────────────────────────────────────────
#  ENTRADA DE INVENTARIO  (merchandise receiving)
# ─────────────────────────────────────────────────────────────────────────────

class EntradaInventario(models.Model):
    """Records a merchandise receive event. On save, Stock.quantity is incremented atomically."""
    producto   = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='entradas', verbose_name='Producto')
    sede       = models.ForeignKey('branches.Sede', on_delete=models.PROTECT, related_name='entradas_inventario', verbose_name='Sede')
    quantity   = models.IntegerField(verbose_name='Cantidad recibida')
    cost_unit  = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Costo unitario')
    notes      = models.TextField(blank=True, default='', verbose_name='Notas')
    created_by = models.ForeignKey(
        'users.CustomUser', on_delete=models.SET_NULL,
        null=True, related_name='entradas_creadas', verbose_name='Registrado por'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inventory_entradas'
        ordering = ['-created_at']
        verbose_name = 'Entrada de Inventario'
        verbose_name_plural = 'Entradas de Inventario'

    def __str__(self):
        return f'Entrada {self.producto.sku} x{self.quantity} @ {self.sede.name}'


# ─────────────────────────────────────────────────────────────────────────────
#  AUDITORÍA DE INVENTARIO  (physical count)
# ─────────────────────────────────────────────────────────────────────────────

class AuditoriaInventario(models.Model):
    """Header of a physical inventory count session."""

    class Status(models.TextChoices):
        DRAFT      = 'DRAFT',      'Borrador'
        FINALIZADA = 'FINALIZADA', 'Finalizada'

    sede       = models.ForeignKey('branches.Sede', on_delete=models.PROTECT, related_name='auditorias', verbose_name='Sede')
    fecha      = models.DateField(verbose_name='Fecha')
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, verbose_name='Estado')
    created_by = models.ForeignKey(
        'users.CustomUser', on_delete=models.SET_NULL,
        null=True, related_name='auditorias_creadas', verbose_name='Creada por'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory_auditorias'
        ordering = ['-created_at']
        verbose_name = 'Auditoría de Inventario'
        verbose_name_plural = 'Auditorías de Inventario'

    def __str__(self):
        return f'Auditoría {self.sede.name} {self.fecha} [{self.status}]'


class AuditoriaItem(models.Model):
    """One line of an inventory audit — sistema vs. físico count."""
    auditoria    = models.ForeignKey(AuditoriaInventario, on_delete=models.CASCADE, related_name='items', verbose_name='Auditoría')
    producto     = models.ForeignKey(Producto, on_delete=models.PROTECT, verbose_name='Producto')
    stock_sistema= models.IntegerField(verbose_name='Stock en sistema')
    stock_fisico = models.IntegerField(null=True, blank=True, verbose_name='Conteo físico')

    class Meta:
        db_table = 'inventory_auditoria_items'
        unique_together = ('auditoria', 'producto')
        verbose_name = 'Ítem de Auditoría'
        verbose_name_plural = 'Ítems de Auditoría'

    @property
    def diferencia(self):
        if self.stock_fisico is not None:
            return self.stock_fisico - self.stock_sistema
        return None

    def __str__(self):
        return f'{self.producto.sku}: sistema={self.stock_sistema} físico={self.stock_fisico}'
