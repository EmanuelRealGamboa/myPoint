from rest_framework import serializers
from inventory.models import Producto
from .models import PedidoBodega, PedidoBodegaItem


class PedidoItemInputSerializer(serializers.Serializer):
    producto_id = serializers.IntegerField()
    cantidad    = serializers.IntegerField(min_value=1)


class PedidoBodegaItemSerializer(serializers.ModelSerializer):
    producto_id   = serializers.IntegerField(source='producto.id', read_only=True)
    producto_sku  = serializers.CharField(source='producto.sku', read_only=True)
    producto_name = serializers.CharField(source='producto.name', read_only=True)
    codigo_barras = serializers.CharField(source='producto.codigo_barras', read_only=True)

    class Meta:
        model  = PedidoBodegaItem
        fields = ['id', 'producto_id', 'producto_sku', 'producto_name',
                  'codigo_barras', 'cantidad', 'ubicacion']


class PedidoBodegaSerializer(serializers.ModelSerializer):
    items       = PedidoBodegaItemSerializer(many=True, read_only=True)
    cajero_name = serializers.CharField(source='cajero.get_full_name', read_only=True)
    sede_name   = serializers.CharField(source='sede.name', read_only=True)

    class Meta:
        model  = PedidoBodega
        fields = ['id', 'sede_id', 'sede_name', 'cajero_name',
                  'notas', 'status', 'items', 'created_at', 'updated_at']


class CrearPedidoSerializer(serializers.Serializer):
    items = PedidoItemInputSerializer(many=True, min_length=1)
    notas = serializers.CharField(max_length=300, required=False, allow_blank=True, default='')

    def validate_items(self, items):
        ids = [i['producto_id'] for i in items]
        encontrados = Producto.objects.filter(id__in=ids, is_active=True).values_list('id', flat=True)
        faltantes = set(ids) - set(encontrados)
        if faltantes:
            raise serializers.ValidationError(f'Productos no encontrados: {list(faltantes)}')
        return items

    def create(self, validated_data):
        request = self.context['request']
        items_data = validated_data.pop('items')

        pedido = PedidoBodega.objects.create(
            sede=request.user.sede,
            cajero=request.user,
            notas=validated_data.get('notas', ''),
        )

        productos = {p.id: p for p in Producto.objects.filter(
            id__in=[i['producto_id'] for i in items_data]
        )}

        PedidoBodegaItem.objects.bulk_create([
            PedidoBodegaItem(
                pedido=pedido,
                producto=productos[i['producto_id']],
                cantidad=i['cantidad'],
                ubicacion=productos[i['producto_id']].ubicacion_almacen or '',
            )
            for i in items_data
        ])

        return pedido
