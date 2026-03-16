from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import PedidoBodega
from .serializers import PedidoBodegaSerializer, CrearPedidoSerializer


class PedidosListView(APIView):
    """
    GET  — lista pedidos PENDIENTES de la sede (cajera y trabajador)
    POST — cajera crea un nuevo pedido
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sede = getattr(request.user, 'sede', None)
        if not sede:
            return Response({'success': False, 'message': 'Sin sede asignada.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Admins/encargados pueden filtrar por sede
        sede_id = request.query_params.get('sede_id', sede.id if sede else None)

        qs = PedidoBodega.objects.filter(
            sede_id=sede_id,
            status=PedidoBodega.Status.PENDIENTE,
        ).prefetch_related('items__producto').select_related('cajero', 'sede')

        return Response({
            'success': True,
            'data': PedidoBodegaSerializer(qs, many=True).data,
        })

    def post(self, request):
        serializer = CrearPedidoSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)
        pedido = serializer.save()
        return Response({
            'success': True,
            'message': 'Pedido enviado a bodega.',
            'data': PedidoBodegaSerializer(pedido).data,
        }, status=status.HTTP_201_CREATED)


class PedidoDetailView(APIView):
    """
    PATCH /<id>/  — cajera marca como ENTREGADO o CANCELADO
    """
    permission_classes = [IsAuthenticated]

    def _get_pedido(self, pk, sede):
        try:
            return PedidoBodega.objects.prefetch_related('items__producto').get(
                pk=pk, sede=sede
            )
        except PedidoBodega.DoesNotExist:
            return None

    def patch(self, request, pk):
        sede = getattr(request.user, 'sede', None)
        pedido = self._get_pedido(pk, sede)
        if not pedido:
            return Response({'success': False, 'message': 'Pedido no encontrado.'},
                            status=status.HTTP_404_NOT_FOUND)

        nuevo_status = request.data.get('status')
        if nuevo_status not in (PedidoBodega.Status.ENTREGADO, PedidoBodega.Status.CANCELADO):
            return Response({'success': False,
                             'message': 'Estado inválido. Use ENTREGADO o CANCELADO.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if pedido.status != PedidoBodega.Status.PENDIENTE:
            return Response({'success': False,
                             'message': 'Solo se pueden modificar pedidos PENDIENTES.'},
                            status=status.HTTP_400_BAD_REQUEST)

        pedido.status = nuevo_status
        pedido.save(update_fields=['status', 'updated_at'])

        return Response({
            'success': True,
            'message': 'Pedido actualizado.',
            'data': PedidoBodegaSerializer(pedido).data,
        })
