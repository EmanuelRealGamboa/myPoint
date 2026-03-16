"""
Serializers for Inventory — Categoria, Subcategoria, MarcaFabricante,
MarcaMoto, ModeloMoto, Producto (with fitment), Stock, EntradaInventario,
AuditoriaInventario / AuditoriaItem
"""
from django.db import transaction
from rest_framework import serializers
from .models import (
    Categoria, Subcategoria,
    MarcaFabricante, MarcaMoto, ModeloMoto,
    Producto, CompatibilidadPieza,
    Stock, EntradaInventario,
    AuditoriaInventario, AuditoriaItem,
)


# ─── Categoria ────────────────────────────────────────────────────────────────

class SubcategoriaMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Subcategoria
        fields = ('id', 'name', 'is_active')


class CategoriaSerializer(serializers.ModelSerializer):
    product_count  = serializers.SerializerMethodField()
    subcategorias  = SubcategoriaMinimalSerializer(many=True, read_only=True)

    class Meta:
        model  = Categoria
        fields = ('id', 'name', 'description', 'is_active', 'product_count', 'subcategorias', 'created_at')
        read_only_fields = ('id', 'created_at')

    def get_product_count(self, obj):
        return obj.productos.filter(is_active=True).count()

    def validate_name(self, value):
        qs = Categoria.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe una categoría con ese nombre.')
        return value


class SubcategoriaSerializer(serializers.ModelSerializer):
    categoria_name = serializers.CharField(source='categoria.name', read_only=True)
    product_count  = serializers.SerializerMethodField()

    class Meta:
        model  = Subcategoria
        fields = ('id', 'categoria', 'categoria_name', 'name', 'description', 'is_active', 'product_count', 'created_at')
        read_only_fields = ('id', 'created_at')

    def get_product_count(self, obj):
        return obj.productos.filter(is_active=True).count()

    def validate(self, attrs):
        categoria = attrs.get('categoria', self.instance.categoria if self.instance else None)
        name      = attrs.get('name', self.instance.name if self.instance else None)
        qs = Subcategoria.objects.filter(categoria=categoria, name__iexact=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({'name': 'Ya existe esa subcategoría en esta categoría.'})
        return attrs


# ─── MarcaFabricante ──────────────────────────────────────────────────────────

class MarcaFabricanteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MarcaFabricante
        fields = ('id', 'name', 'tipo', 'pais', 'is_active')
        read_only_fields = ('id',)

    def validate_name(self, value):
        qs = MarcaFabricante.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe esa marca.')
        return value


# ─── MarcaMoto / ModeloMoto ───────────────────────────────────────────────────

class MarcaMotoSerializer(serializers.ModelSerializer):
    modelos_count = serializers.SerializerMethodField()

    class Meta:
        model  = MarcaMoto
        fields = ('id', 'name', 'is_active', 'modelos_count')
        read_only_fields = ('id',)

    def get_modelos_count(self, obj):
        return obj.modelos.filter(is_active=True).count()


class ModeloMotoSerializer(serializers.ModelSerializer):
    marca_name = serializers.CharField(source='marca.name', read_only=True)

    class Meta:
        model  = ModeloMoto
        fields = (
            'id', 'marca', 'marca_name', 'modelo',
            'año_desde', 'año_hasta', 'cilindraje',
            'tipo_motor', 'tipo_moto', 'is_active',
        )
        read_only_fields = ('id',)

    def validate(self, attrs):
        año_desde = attrs.get('año_desde', self.instance.año_desde if self.instance else None)
        año_hasta = attrs.get('año_hasta', self.instance.año_hasta if self.instance else None)
        if año_hasta and año_hasta < año_desde:
            raise serializers.ValidationError({'año_hasta': 'El año hasta debe ser >= año desde.'})
        return attrs


# ─── Compatibilidad ───────────────────────────────────────────────────────────

class CompatibilidadSerializer(serializers.ModelSerializer):
    modelo_moto_str  = serializers.CharField(source='modelo_moto.__str__', read_only=True)
    marca_name       = serializers.CharField(source='modelo_moto.marca.name', read_only=True)

    class Meta:
        model  = CompatibilidadPieza
        fields = ('id', 'modelo_moto', 'modelo_moto_str', 'marca_name', 'año_desde', 'año_hasta', 'nota')
        read_only_fields = ('id',)


# ─── Stock ────────────────────────────────────────────────────────────────────

class StockSerializer(serializers.ModelSerializer):
    sede_id      = serializers.IntegerField(source='sede.id', read_only=True)
    sede_name    = serializers.CharField(source='sede.name', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model  = Stock
        fields = ('id', 'sede_id', 'sede_name', 'quantity', 'min_quantity', 'is_low_stock', 'updated_at')
        read_only_fields = ('id', 'sede_id', 'sede_name', 'updated_at')


class StockUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Stock
        fields = ('quantity', 'min_quantity')


# ─── Producto ─────────────────────────────────────────────────────────────────

class ProductoSerializer(serializers.ModelSerializer):
    categoria_name        = serializers.CharField(source='categoria.name', read_only=True, default=None)
    subcategoria_name     = serializers.CharField(source='subcategoria.name', read_only=True, default=None)
    marca_fabricante_name = serializers.CharField(source='marca_fabricante.name', read_only=True, default=None)
    stock_items           = StockSerializer(many=True, read_only=True)
    total_stock           = serializers.SerializerMethodField()
    compatibilidades      = CompatibilidadSerializer(many=True, read_only=True)

    class Meta:
        model  = Producto
        fields = (
            # Identification
            'id', 'sku', 'name', 'description',
            'codigo_barras', 'numero_parte_oem', 'numero_parte_aftermarket',
            'imagen',
            # Classification
            'categoria', 'categoria_name',
            'subcategoria', 'subcategoria_name',
            'marca_fabricante', 'marca_fabricante_name',
            'tipo_parte', 'unidad_medida',
            # Pricing
            'price', 'cost', 'precio_mayoreo',
            # Warehouse
            'ubicacion_almacen', 'peso_kg',
            # Fitment
            'es_universal', 'compatibilidades',
            # Status
            'is_active', 'es_descontinuado',
            'stock_items', 'total_stock',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_total_stock(self, obj):
        return sum(s.quantity for s in obj.stock_items.all())


class ProductoCreateSerializer(serializers.ModelSerializer):
    """Used for both create and update (partial=True for PUT)."""

    class Meta:
        model  = Producto
        fields = (
            'sku', 'name', 'description',
            'codigo_barras', 'numero_parte_oem', 'numero_parte_aftermarket',
            'categoria', 'subcategoria', 'marca_fabricante',
            'tipo_parte', 'unidad_medida',
            'price', 'cost', 'precio_mayoreo',
            'ubicacion_almacen', 'peso_kg',
            'es_universal', 'is_active', 'es_descontinuado',
        )

    def validate_sku(self, value):
        qs = Producto.objects.filter(sku__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe un producto con ese SKU.')
        return value.upper()

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('El precio debe ser mayor a 0.')
        return value

    def validate_cost(self, value):
        if value < 0:
            raise serializers.ValidationError('El costo no puede ser negativo.')
        return value

    def validate(self, attrs):
        categoria    = attrs.get('categoria',    self.instance.categoria    if self.instance else None)
        subcategoria = attrs.get('subcategoria', self.instance.subcategoria if self.instance else None)
        if subcategoria and categoria and subcategoria.categoria_id != categoria.id:
            raise serializers.ValidationError(
                {'subcategoria': 'La subcategoría no pertenece a la categoría seleccionada.'}
            )
        return attrs


# ─── Producto imagen ──────────────────────────────────────────────────────────

class ProductoImageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Producto
        fields = ('imagen',)

    def validate_imagen(self, value):
        allowed = ['image/jpeg', 'image/png']
        if hasattr(value, 'content_type') and value.content_type not in allowed:
            raise serializers.ValidationError('Solo se permiten imágenes PNG o JPG.')
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('La imagen no debe superar 5 MB.')
        return value


# ─── Entrada de Inventario ────────────────────────────────────────────────────

class EntradaInventarioSerializer(serializers.ModelSerializer):
    producto_name  = serializers.CharField(source='producto.name', read_only=True)
    producto_sku   = serializers.CharField(source='producto.sku', read_only=True)
    sede_name      = serializers.CharField(source='sede.name', read_only=True)
    created_by_name= serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model  = EntradaInventario
        fields = (
            'id', 'producto', 'producto_name', 'producto_sku',
            'sede', 'sede_name', 'quantity', 'cost_unit',
            'notes', 'created_by', 'created_by_name', 'created_at',
        )
        read_only_fields = ('id', 'created_by', 'created_at')

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('La cantidad debe ser mayor a 0.')
        return value

    def validate_cost_unit(self, value):
        if value < 0:
            raise serializers.ValidationError('El costo no puede ser negativo.')
        return value

    @transaction.atomic
    def create(self, validated_data):
        entrada = EntradaInventario.objects.create(**validated_data)
        stock, _ = Stock.objects.select_for_update().get_or_create(
            producto=entrada.producto,
            sede=entrada.sede,
            defaults={'quantity': 0, 'min_quantity': 5},
        )
        stock.quantity += entrada.quantity
        stock.save()
        return entrada


# ─── Auditoria ────────────────────────────────────────────────────────────────

class AuditoriaItemSerializer(serializers.ModelSerializer):
    producto_sku  = serializers.CharField(source='producto.sku', read_only=True)
    producto_name = serializers.CharField(source='producto.name', read_only=True)
    diferencia    = serializers.IntegerField(read_only=True)

    class Meta:
        model  = AuditoriaItem
        fields = (
            'id', 'producto', 'producto_sku', 'producto_name',
            'stock_sistema', 'stock_fisico', 'diferencia',
        )
        read_only_fields = ('id', 'stock_sistema')


class AuditoriaInventarioSerializer(serializers.ModelSerializer):
    sede_name      = serializers.CharField(source='sede.name', read_only=True)
    created_by_name= serializers.CharField(source='created_by.get_full_name', read_only=True)
    items          = AuditoriaItemSerializer(many=True, read_only=True)
    items_count    = serializers.SerializerMethodField()

    class Meta:
        model  = AuditoriaInventario
        fields = (
            'id', 'sede', 'sede_name', 'fecha', 'status',
            'created_by', 'created_by_name',
            'items', 'items_count', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'status', 'created_by', 'created_at', 'updated_at')

    def get_items_count(self, obj):
        return obj.items.count()


class AuditoriaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AuditoriaInventario
        fields = ('sede', 'fecha')

    @transaction.atomic
    def create(self, validated_data):
        auditoria = AuditoriaInventario.objects.create(
            **validated_data,
            created_by=self.context['request'].user,
        )
        stocks = Stock.objects.filter(
            sede=auditoria.sede,
            producto__is_active=True,
        ).select_related('producto')

        AuditoriaItem.objects.bulk_create([
            AuditoriaItem(
                auditoria=auditoria,
                producto=s.producto,
                stock_sistema=s.quantity,
            )
            for s in stocks
        ])
        return auditoria
