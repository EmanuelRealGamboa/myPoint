"""
Taller Serializers — MotoQFox
"""
from rest_framework import serializers
from django.utils import timezone
from .models import MotoCliente, ServicioMoto, ServicioItem, SolicitudRefaccionExtra
from inventory.models import Producto, Stock


# ─────────────────────────────────────────────────────────────────────────────
#  MOTO CLIENTE
# ─────────────────────────────────────────────────────────────────────────────

class MotoClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MotoCliente
        fields = ['id', 'cliente', 'marca', 'modelo', 'año', 'placa', 'color', 'notas', 'created_at']
        read_only_fields = ['id', 'created_at']


class MotoClienteMinimalSerializer(serializers.ModelSerializer):
    """Versión compacta para incluir en servicios."""
    class Meta:
        model = MotoCliente
        fields = ['id', 'marca', 'modelo', 'año', 'placa', 'color']


# ─────────────────────────────────────────────────────────────────────────────
#  SERVICIO ITEM
# ─────────────────────────────────────────────────────────────────────────────

class ServicioItemSerializer(serializers.ModelSerializer):
    producto_name = serializers.CharField(source='producto.name', read_only=True, default=None)
    producto_sku  = serializers.CharField(source='producto.sku', read_only=True, default=None)

    class Meta:
        model = ServicioItem
        fields = [
            'id', 'tipo', 'descripcion',
            'producto', 'producto_name', 'producto_sku',
            'cantidad', 'precio_unitario', 'subtotal',
            'aprobado', 'created_at'
        ]
        read_only_fields = ['id', 'subtotal', 'created_at', 'producto_name', 'producto_sku']


class ServicioItemInputSerializer(serializers.Serializer):
    """Para agregar items al crear un servicio."""
    tipo            = serializers.ChoiceField(choices=['REFACCION', 'MANO_OBRA'])
    descripcion     = serializers.CharField(max_length=200)
    producto        = serializers.PrimaryKeyRelatedField(
        queryset=Producto.objects.filter(is_active=True),
        required=False, allow_null=True
    )
    cantidad        = serializers.IntegerField(min_value=1, default=1)
    precio_unitario = serializers.DecimalField(max_digits=10, decimal_places=2)


# ─────────────────────────────────────────────────────────────────────────────
#  SOLICITUD REFACCIÓN EXTRA
# ─────────────────────────────────────────────────────────────────────────────

class SolicitudRefaccionExtraSerializer(serializers.ModelSerializer):
    producto_name = serializers.CharField(source='producto.name', read_only=True)
    producto_sku  = serializers.CharField(source='producto.sku', read_only=True)
    mecanico_name = serializers.CharField(source='mecanico.get_full_name', read_only=True)

    class Meta:
        model = SolicitudRefaccionExtra
        fields = [
            'id', 'servicio', 'mecanico', 'mecanico_name',
            'producto', 'producto_name', 'producto_sku',
            'cantidad', 'motivo', 'status',
            'respondido_por', 'created_at', 'respondido_at'
        ]
        read_only_fields = ['id', 'status', 'respondido_por', 'created_at', 'respondido_at',
                            'producto_name', 'producto_sku', 'mecanico_name']


class SolicitudRefaccionExtraCreateSerializer(serializers.ModelSerializer):
    """Mecánico crea solicitud de pieza extra."""

    class Meta:
        model = SolicitudRefaccionExtra
        fields = ['servicio', 'producto', 'cantidad', 'motivo']

    def validate(self, data):
        servicio = data['servicio']
        user = self.context['request'].user
        # Solo el mecánico asignado puede solicitar piezas extra
        if servicio.mecanico != user:
            raise serializers.ValidationError('Solo el mecánico asignado puede solicitar piezas extra.')
        if servicio.status not in ['EN_PROCESO', 'COTIZACION_EXTRA']:
            raise serializers.ValidationError(
                f'No se pueden solicitar piezas para un servicio en estado {servicio.get_status_display()}.'
            )
        return data


# ─────────────────────────────────────────────────────────────────────────────
#  SERVICIO MOTO — READ
# ─────────────────────────────────────────────────────────────────────────────

class ServicioMotoListSerializer(serializers.ModelSerializer):
    """Versión compacta para listas y Kanban."""
    moto_str         = serializers.SerializerMethodField()
    cajero_name      = serializers.CharField(source='cajero.get_full_name', read_only=True)
    mecanico_name    = serializers.CharField(source='mecanico.get_full_name', read_only=True, default=None)
    cliente_nombre   = serializers.SerializerMethodField()
    tiempo_recibido  = serializers.SerializerMethodField()
    tiene_extra_pendiente = serializers.SerializerMethodField()

    class Meta:
        model = ServicioMoto
        fields = [
            'id', 'folio', 'descripcion', 'status', 'pago_status',
            'moto_str', 'cliente_nombre', 'cajero_name', 'mecanico_name',
            'mano_de_obra', 'total_refacciones', 'total',
            'tiempo_recibido', 'tiene_extra_pendiente',
            'fecha_recepcion', 'fecha_inicio', 'fecha_listo', 'fecha_entrega',
            'cliente_notificado'
        ]

    def get_moto_str(self, obj):
        if obj.moto:
            return f'{obj.moto.marca} {obj.moto.modelo} {obj.moto.año}'
        return None

    def get_cliente_nombre(self, obj):
        if obj.cliente:
            return obj.cliente.usuario.get_full_name()
        return 'Walk-in'

    def get_tiempo_recibido(self, obj):
        """Minutos transcurridos desde la recepción."""
        delta = timezone.now() - obj.fecha_recepcion
        return int(delta.total_seconds() / 60)

    def get_tiene_extra_pendiente(self, obj):
        return obj.solicitudes_extra.filter(status='PENDIENTE').exists()


class ServicioMotoDetailSerializer(serializers.ModelSerializer):
    """Detalle completo con ítems y solicitudes extra."""
    moto             = MotoClienteMinimalSerializer(read_only=True)
    cajero_name      = serializers.CharField(source='cajero.get_full_name', read_only=True)
    mecanico_name    = serializers.CharField(source='mecanico.get_full_name', read_only=True, default=None)
    asignado_por_name = serializers.CharField(source='asignado_por.get_full_name', read_only=True, default=None)
    cliente_nombre   = serializers.SerializerMethodField()
    cliente_email    = serializers.SerializerMethodField()
    items            = ServicioItemSerializer(many=True, read_only=True)
    solicitudes_extra = SolicitudRefaccionExtraSerializer(many=True, read_only=True)

    class Meta:
        model = ServicioMoto
        fields = [
            'id', 'folio', 'sede', 'descripcion', 'status', 'pago_status',
            'moto', 'cliente', 'cliente_nombre', 'cliente_email',
            'cajero', 'cajero_name',
            'mecanico', 'mecanico_name',
            'asignado_por', 'asignado_por_name',
            'mano_de_obra', 'total_refacciones', 'total',
            'metodo_pago', 'monto_pagado', 'cambio',
            'cliente_notificado',
            'fecha_recepcion', 'fecha_inicio', 'fecha_listo', 'fecha_entrega',
            'items', 'solicitudes_extra'
        ]

    def get_cliente_nombre(self, obj):
        if obj.cliente:
            return obj.cliente.usuario.get_full_name()
        return 'Walk-in'

    def get_cliente_email(self, obj):
        if obj.cliente:
            return obj.cliente.usuario.email
        return None


# ─────────────────────────────────────────────────────────────────────────────
#  SERVICIO MOTO — CREATE
# ─────────────────────────────────────────────────────────────────────────────

class ServicioMotoCreateSerializer(serializers.Serializer):
    """
    Cajero crea una orden de servicio con cotización inicial.
    """
    sede        = serializers.IntegerField()
    cliente     = serializers.IntegerField(required=False, allow_null=True)  # ClienteProfile id
    moto        = serializers.IntegerField(required=False, allow_null=True)  # MotoCliente id existente
    # Si no hay moto existente, se crea inline
    moto_nueva  = MotoClienteSerializer(required=False, allow_null=True)
    descripcion = serializers.CharField()
    mano_de_obra = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    items       = ServicioItemInputSerializer(many=True, required=False, default=list)
    pago_status = serializers.ChoiceField(
        choices=['PENDIENTE_PAGO', 'PAGADO'],
        default='PENDIENTE_PAGO'
    )
    metodo_pago = serializers.ChoiceField(
        choices=['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'],
        required=False, allow_null=True
    )
    monto_pagado = serializers.DecimalField(
        max_digits=10, decimal_places=2,
        required=False, allow_null=True
    )

    def validate(self, data):
        from branches.models import Sede
        from customers.models import ClienteProfile
        try:
            Sede.objects.get(id=data['sede'], is_active=True)
        except Sede.DoesNotExist:
            raise serializers.ValidationError({'sede': 'Sede no encontrada o inactiva.'})

        if data.get('cliente'):
            try:
                ClienteProfile.objects.get(id=data['cliente'])
            except ClienteProfile.DoesNotExist:
                raise serializers.ValidationError({'cliente': 'Cliente no encontrado.'})

        if data.get('moto'):
            try:
                MotoCliente.objects.get(id=data['moto'])
            except MotoCliente.DoesNotExist:
                raise serializers.ValidationError({'moto': 'Moto no encontrada.'})

        if data.get('pago_status') == 'PAGADO' and not data.get('metodo_pago'):
            raise serializers.ValidationError({'metodo_pago': 'Se requiere método de pago si el servicio está pagado.'})

        return data

    def create(self, validated_data):
        from django.db import transaction
        from django.db.models import F
        from branches.models import Sede
        from customers.models import ClienteProfile
        from inventory.models import Stock

        with transaction.atomic():
            sede = Sede.objects.get(id=validated_data['sede'])
            cajero = self.context['request'].user

            # Moto: existente, nueva o None
            moto = None
            if validated_data.get('moto'):
                moto = MotoCliente.objects.get(id=validated_data['moto'])
            elif validated_data.get('moto_nueva'):
                moto_data = validated_data['moto_nueva']
                cliente_id = validated_data.get('cliente')
                cliente_profile = ClienteProfile.objects.get(id=cliente_id) if cliente_id else None
                moto = MotoCliente.objects.create(cliente=cliente_profile, **moto_data)

            # Cliente
            cliente = None
            if validated_data.get('cliente'):
                cliente = ClienteProfile.objects.get(id=validated_data['cliente'])

            # Generar folio
            folio = ServicioMoto.generar_folio(sede.id)

            # Calcular total refacciones desde items
            items_data = validated_data.get('items', [])
            total_ref = sum(
                (item['precio_unitario'] * item.get('cantidad', 1))
                for item in items_data
                if item['tipo'] == 'REFACCION'
            )
            mano_de_obra = validated_data['mano_de_obra']
            total = mano_de_obra + total_ref

            # Pago inicial
            pago_status = validated_data.get('pago_status', 'PENDIENTE_PAGO')
            metodo_pago = validated_data.get('metodo_pago')
            monto_pagado = validated_data.get('monto_pagado')
            cambio = None
            if pago_status == 'PAGADO' and monto_pagado is not None:
                cambio = monto_pagado - total

            servicio = ServicioMoto.objects.create(
                folio=folio,
                sede=sede,
                cliente=cliente,
                moto=moto,
                descripcion=validated_data['descripcion'],
                cajero=cajero,
                mano_de_obra=mano_de_obra,
                total_refacciones=total_ref,
                total=total,
                pago_status=pago_status,
                metodo_pago=metodo_pago,
                monto_pagado=monto_pagado,
                cambio=cambio,
            )

            # Crear ítems cotizados
            for item_data in items_data:
                ServicioItem.objects.create(
                    servicio=servicio,
                    tipo=item_data['tipo'],
                    descripcion=item_data['descripcion'],
                    producto=item_data.get('producto'),
                    cantidad=item_data.get('cantidad', 1),
                    precio_unitario=item_data['precio_unitario'],
                    subtotal=item_data['precio_unitario'] * item_data.get('cantidad', 1),
                    aprobado=True,
                    created_by=cajero,
                )

            # Si se paga en el momento, decrementar stock de refacciones
            if pago_status == 'PAGADO':
                for item_data in items_data:
                    if item_data['tipo'] == 'REFACCION' and item_data.get('producto'):
                        Stock.objects.select_for_update().filter(
                            producto=item_data['producto'],
                            sede=sede
                        ).update(quantity=F('quantity') - item_data.get('cantidad', 1))

        return servicio


# ─────────────────────────────────────────────────────────────────────────────
#  SERVICIO MOTO — UPDATE (edición de cotización, solo si RECIBIDO)
# ─────────────────────────────────────────────────────────────────────────────

class ServicioMotoUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicioMoto
        fields = ['descripcion', 'mano_de_obra']

    def validate(self, data):
        if self.instance and self.instance.status != 'RECIBIDO':
            raise serializers.ValidationError(
                'Solo se puede editar la cotización si el servicio está en estado RECIBIDO.'
            )
        return data

    def update(self, instance, validated_data):
        instance.descripcion = validated_data.get('descripcion', instance.descripcion)
        instance.mano_de_obra = validated_data.get('mano_de_obra', instance.mano_de_obra)
        instance.total = instance.mano_de_obra + instance.total_refacciones
        instance.save(update_fields=['descripcion', 'mano_de_obra', 'total'])
        return instance


# ─────────────────────────────────────────────────────────────────────────────
#  ENTREGAR (cobro y cierre del servicio)
# ─────────────────────────────────────────────────────────────────────────────

class EntregarServicioSerializer(serializers.Serializer):
    metodo_pago  = serializers.ChoiceField(choices=['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'])
    monto_pagado = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)

    def validate(self, data):
        servicio = self.context['servicio']
        if servicio.status != ServicioMoto.Status.LISTO:
            raise serializers.ValidationError(
                'Solo se puede entregar un servicio que esté en estado LISTO.'
            )
        if servicio.pago_status == 'PAGADO':
            # Ya pagado, solo necesita confirmación de entrega
            pass
        else:
            if data['monto_pagado'] < servicio.total:
                raise serializers.ValidationError(
                    {'monto_pagado': f'El monto pagado debe ser al menos ${servicio.total}.'}
                )
        return data
