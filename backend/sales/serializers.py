"""
Serializers for Sales — Venta, VentaItem
"""
from decimal import Decimal
from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from branches.models import Sede
from inventory.models import Producto, Stock
from .models import Venta, VentaItem, AperturaCaja, ReporteCaja


# ─── VentaItem ────────────────────────────────────────────────────────────────

class VentaItemCreateSerializer(serializers.Serializer):
    """Write-only: one line item for creating a sale."""
    producto   = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.filter(is_active=True))
    quantity   = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))


class VentaItemSerializer(serializers.ModelSerializer):
    producto_name = serializers.CharField(source='producto.name', read_only=True)
    producto_sku  = serializers.CharField(source='producto.sku', read_only=True)

    class Meta:
        model  = VentaItem
        fields = ('id', 'producto', 'producto_name', 'producto_sku', 'quantity', 'unit_price', 'subtotal')


# ─── Venta ────────────────────────────────────────────────────────────────────

class VentaSerializer(serializers.ModelSerializer):
    """Read-only: full sale with all items and computed fields."""
    cajero_name = serializers.CharField(source='cajero.get_full_name', read_only=True)
    sede_name   = serializers.CharField(source='sede.name', read_only=True)
    items       = VentaItemSerializer(many=True, read_only=True)

    class Meta:
        model  = Venta
        fields = (
            'id', 'sede', 'sede_name', 'cajero', 'cajero_name',
            'items', 'subtotal', 'descuento', 'total',
            'metodo_pago', 'monto_pagado', 'cambio',
            'status', 'notas', 'created_at',
        )


class VentaCreateSerializer(serializers.Serializer):
    """
    Write-only: validates stock and creates Venta + VentaItems atomically.
    Stock is decremented via select_for_update to prevent race conditions.
    """
    sede         = serializers.PrimaryKeyRelatedField(queryset=Sede.objects.filter(is_active=True))
    items        = VentaItemCreateSerializer(many=True)
    descuento    = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0'), default=Decimal('0'))
    metodo_pago  = serializers.ChoiceField(choices=Venta.MetodoPago.choices, default=Venta.MetodoPago.EFECTIVO)
    monto_pagado = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0'), default=Decimal('0'))
    notas        = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('La venta debe tener al menos un producto.')
        return items

    def validate(self, attrs):
        sede      = attrs['sede']
        items     = attrs['items']
        descuento = attrs.get('descuento', Decimal('0'))
        metodo    = attrs.get('metodo_pago', Venta.MetodoPago.EFECTIVO)
        monto     = attrs.get('monto_pagado', Decimal('0'))

        # Check stock availability and calculate subtotal
        subtotal = Decimal('0')
        errors = []
        for item in items:
            producto = item['producto']
            qty      = item['quantity']

            try:
                stock = Stock.objects.get(producto=producto, sede=sede)
                if stock.quantity < qty:
                    errors.append(
                        f'"{producto.name}": stock insuficiente ({stock.quantity} disponibles, se piden {qty}).'
                    )
            except Stock.DoesNotExist:
                errors.append(
                    f'"{producto.name}": sin stock registrado en esta sede.'
                )
            subtotal += item['unit_price'] * qty

        if errors:
            raise serializers.ValidationError({'items': errors})

        total = subtotal - descuento
        if total < 0:
            raise serializers.ValidationError({'descuento': 'El descuento no puede ser mayor al subtotal.'})

        # Validate cash payment
        if metodo == Venta.MetodoPago.EFECTIVO and monto < total:
            raise serializers.ValidationError({
                'monto_pagado': f'El monto pagado (${monto}) es menor al total (${total}).'
            })

        # Store computed values for create()
        attrs['_subtotal'] = subtotal
        attrs['_total']    = total
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        sede         = validated_data['sede']
        items        = validated_data['items']
        descuento    = validated_data.get('descuento', Decimal('0'))
        metodo       = validated_data.get('metodo_pago', Venta.MetodoPago.EFECTIVO)
        monto_pagado = validated_data.get('monto_pagado', Decimal('0'))
        notas        = validated_data.get('notas', '')
        subtotal     = validated_data['_subtotal']
        total        = validated_data['_total']
        cajero       = self.context['request'].user

        cambio = (monto_pagado - total) if metodo == Venta.MetodoPago.EFECTIVO else Decimal('0')

        venta = Venta.objects.create(
            sede=sede,
            cajero=cajero,
            subtotal=subtotal,
            descuento=descuento,
            total=total,
            metodo_pago=metodo,
            monto_pagado=monto_pagado,
            cambio=cambio,
            notas=notas,
        )

        for item in items:
            producto   = item['producto']
            quantity   = item['quantity']
            unit_price = item['unit_price']

            VentaItem.objects.create(
                venta=venta,
                producto=producto,
                quantity=quantity,
                unit_price=unit_price,
                subtotal=unit_price * quantity,
            )

            # Decrement stock atomically
            Stock.objects.select_for_update().filter(
                producto=producto, sede=sede
            ).update(quantity=F('quantity') - quantity)

        return venta


# ─── AperturaCaja ─────────────────────────────────────────────────────────────

class AperturaCajaSerializer(serializers.ModelSerializer):
    cajero_name         = serializers.CharField(source='cajero.get_full_name', read_only=True)
    autorizado_por_name = serializers.CharField(source='autorizado_por.get_full_name', read_only=True)

    class Meta:
        model  = AperturaCaja
        fields = (
            'id', 'sede', 'cajero', 'cajero_name',
            'autorizado_por_name', 'fecha_apertura', 'fecha_cierre', 'status',
        )


# ─── ReporteCaja ──────────────────────────────────────────────────────────────

class ReporteCajaSerializer(serializers.ModelSerializer):
    sede_name    = serializers.CharField(source='apertura.sede.name',              read_only=True)
    cajero_name  = serializers.CharField(source='apertura.cajero.get_full_name',   read_only=True)
    fecha_apertura = serializers.DateTimeField(source='apertura.fecha_apertura',   read_only=True)
    fecha_cierre   = serializers.DateTimeField(source='apertura.fecha_cierre',     read_only=True)
    tiene_archivo  = serializers.SerializerMethodField()

    class Meta:
        model  = ReporteCaja
        fields = (
            'id', 'sede_name', 'cajero_name',
            'fecha_apertura', 'fecha_cierre',
            'total_ventas', 'total_canceladas',
            'monto_total', 'monto_efectivo', 'monto_tarjeta', 'monto_transferencia',
            'total_descuentos', 'tiene_archivo', 'created_at',
        )

    def get_tiene_archivo(self, obj):
        return bool(obj.archivo)
