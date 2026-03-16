"""
Taller Views — MotoQFox
========================
Endpoints para gestión de órdenes de servicio de taller.
"""
import uuid
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.db.models import F, Q

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import MotoCliente, ServicioMoto, ServicioItem, SolicitudRefaccionExtra
from .serializers import (
    MotoClienteSerializer,
    ServicioMotoListSerializer,
    ServicioMotoDetailSerializer,
    ServicioMotoCreateSerializer,
    ServicioMotoUpdateSerializer,
    SolicitudRefaccionExtraSerializer,
    SolicitudRefaccionExtraCreateSerializer,
    EntregarServicioSerializer,
)
from .permissions import (
    IsCajeroOrAbove,
    IsJefeMecanicoOrAbove,
    IsMecanicoOrAbove,
    IsTallerStaff,
)
from inventory.models import Stock
from customers.models import ClienteProfile


# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _paginate(qs, request, default_size=20):
    try:
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = min(100, max(1, int(request.query_params.get('page_size', default_size))))
    except (ValueError, TypeError):
        page, page_size = 1, default_size
    total = qs.count()
    start = (page - 1) * page_size
    items = qs[start:start + page_size]
    return items, {
        'total': total,
        'page': page,
        'page_size': page_size,
        'total_pages': max(1, -(-total // page_size)),
    }


def _notificar_cliente_listo(servicio):
    """Envía email al cliente cuando el servicio está listo."""
    if not servicio.cliente:
        return
    email = servicio.cliente.usuario.email
    nombre = servicio.cliente.usuario.get_full_name()
    moto_str = str(servicio.moto) if servicio.moto else 'su moto'
    try:
        send_mail(
            subject=f'[MotoQFox] Tu moto está lista — {servicio.folio}',
            message=(
                f'Hola {nombre},\n\n'
                f'Te informamos que {moto_str} ya está lista para ser recogida.\n\n'
                f'Folio de servicio: {servicio.folio}\n'
                f'Total a pagar: ${servicio.total}\n\n'
                f'Puedes presentar tu código QR en caja para agilizar el proceso.\n\n'
                f'¡Gracias por confiar en MotoQFox!'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )
        servicio.cliente_notificado = True
        servicio.save(update_fields=['cliente_notificado'])
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
#  MOTOS DEL CLIENTE
# ─────────────────────────────────────────────────────────────────────────────

class MotoClienteListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Cajero puede ver motos de cualquier cliente (?cliente_id=X).
        Cliente ve solo las suyas.
        """
        user = request.user
        if user.role == 'CUSTOMER':
            try:
                profile = ClienteProfile.objects.get(usuario=user)
                qs = MotoCliente.objects.filter(cliente=profile)
            except ClienteProfile.DoesNotExist:
                qs = MotoCliente.objects.none()
        else:
            cliente_id = request.query_params.get('cliente_id')
            if cliente_id:
                qs = MotoCliente.objects.filter(cliente_id=cliente_id)
            else:
                qs = MotoCliente.objects.all()
            if user.role not in ('ADMINISTRATOR',) and user.sede:
                # Filtrar por clientes de la sede (a través de sus servicios)
                pass  # Sin restricción extra por ahora

        serializer = MotoClienteSerializer(qs, many=True)
        return Response({'success': True, 'data': serializer.data})

    def post(self, request):
        serializer = MotoClienteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'success': True, 'message': 'Moto registrada.', 'data': serializer.data},
                status=status.HTTP_201_CREATED
            )
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class MotoClienteDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_moto(self, pk):
        try:
            return MotoCliente.objects.get(pk=pk)
        except MotoCliente.DoesNotExist:
            return None

    def get(self, request, pk):
        moto = self._get_moto(pk)
        if not moto:
            return Response({'success': False, 'message': 'Moto no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'data': MotoClienteSerializer(moto).data})

    def put(self, request, pk):
        moto = self._get_moto(pk)
        if not moto:
            return Response({'success': False, 'message': 'Moto no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = MotoClienteSerializer(moto, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'success': True, 'data': serializer.data})
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────────────────────────
#  SERVICIOS — LISTA Y CREACIÓN
# ─────────────────────────────────────────────────────────────────────────────

class ServicioListView(APIView):
    permission_classes = [IsTallerStaff]

    def get(self, request):
        user = request.user
        qs = ServicioMoto.objects.select_related(
            'moto', 'cliente__usuario', 'cajero', 'mecanico', 'sede'
        )

        # Filtro por sede
        if user.role == 'ADMINISTRATOR':
            sede_id = request.query_params.get('sede_id')
            if sede_id:
                qs = qs.filter(sede_id=sede_id)
        elif user.sede:
            qs = qs.filter(sede=user.sede)

        # Mecánico solo ve sus servicios asignados
        if user.role == 'MECANICO':
            qs = qs.filter(mecanico=user)

        # Filtros opcionales
        estado = request.query_params.get('status')
        if estado:
            qs = qs.filter(status=estado)

        fecha_desde = request.query_params.get('fecha_desde')
        if fecha_desde:
            qs = qs.filter(fecha_recepcion__date__gte=fecha_desde)

        fecha_hasta = request.query_params.get('fecha_hasta')
        if fecha_hasta:
            qs = qs.filter(fecha_recepcion__date__lte=fecha_hasta)

        # Excluir ENTREGADO por defecto (salvo que se pida explícitamente)
        include_entregado = request.query_params.get('include_entregado', 'false').lower() == 'true'
        if not include_entregado and not estado:
            qs = qs.exclude(status='ENTREGADO')

        items, pagination = _paginate(qs, request)
        serializer = ServicioMotoListSerializer(items, many=True)
        return Response({
            'success': True,
            'data': {'servicios': serializer.data, 'pagination': pagination}
        })

    def post(self, request):
        if request.user.role not in ('CASHIER', 'ENCARGADO', 'ADMINISTRATOR'):
            return Response(
                {'success': False, 'message': 'Solo cajeros y encargados pueden crear servicios.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = ServicioMotoCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            servicio = serializer.save()
            return Response(
                {
                    'success': True,
                    'message': 'Servicio creado exitosamente.',
                    'data': ServicioMotoDetailSerializer(servicio).data
                },
                status=status.HTTP_201_CREATED
            )
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────────────────────────
#  SERVICIOS — DETALLE, EDICIÓN Y ACCIONES
# ─────────────────────────────────────────────────────────────────────────────

class ServicioDetailView(APIView):
    permission_classes = [IsTallerStaff]

    def _get_servicio(self, pk):
        try:
            return ServicioMoto.objects.select_related(
                'moto', 'cliente__usuario', 'cajero', 'mecanico', 'sede'
            ).prefetch_related('items', 'solicitudes_extra').get(pk=pk)
        except ServicioMoto.DoesNotExist:
            return None

    def get(self, request, pk):
        servicio = self._get_servicio(pk)
        if not servicio:
            return Response({'success': False, 'message': 'Servicio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'data': ServicioMotoDetailSerializer(servicio).data})

    def put(self, request, pk):
        """Editar cotización (solo si status=RECIBIDO, solo cajero/encargado/admin)."""
        if request.user.role not in ('CASHIER', 'ENCARGADO', 'ADMINISTRATOR'):
            return Response({'success': False, 'message': 'Sin permisos.'}, status=status.HTTP_403_FORBIDDEN)
        servicio = self._get_servicio(pk)
        if not servicio:
            return Response({'success': False, 'message': 'Servicio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ServicioMotoUpdateSerializer(servicio, data=request.data, partial=True)
        if serializer.is_valid():
            servicio = serializer.save()
            return Response({'success': True, 'data': ServicioMotoDetailSerializer(servicio).data})
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class AsignarMecanicoView(APIView):
    """Jefe de mecánicos asigna un mecánico → status EN_PROCESO."""
    permission_classes = [IsJefeMecanicoOrAbove]

    def patch(self, request, pk):
        try:
            servicio = ServicioMoto.objects.get(pk=pk)
        except ServicioMoto.DoesNotExist:
            return Response({'success': False, 'message': 'Servicio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if servicio.status != ServicioMoto.Status.RECIBIDO:
            return Response(
                {'success': False, 'message': f'No se puede asignar un mecánico a un servicio en estado {servicio.get_status_display()}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        mecanico_id = request.data.get('mecanico_id')
        if not mecanico_id:
            return Response({'success': False, 'message': 'Se requiere mecanico_id.'}, status=status.HTTP_400_BAD_REQUEST)

        from users.models import CustomUser
        try:
            mecanico = CustomUser.objects.get(
                id=mecanico_id,
                role='MECANICO',
                is_active=True,
                sede=servicio.sede
            )
        except CustomUser.DoesNotExist:
            return Response(
                {'success': False, 'message': 'Mecánico no encontrado o no pertenece a esta sede.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        servicio.mecanico = mecanico
        servicio.asignado_por = request.user
        servicio.status = ServicioMoto.Status.EN_PROCESO
        servicio.fecha_inicio = timezone.now()
        servicio.save(update_fields=['mecanico', 'asignado_por', 'status', 'fecha_inicio'])

        return Response({
            'success': True,
            'message': f'Servicio asignado a {mecanico.get_full_name()}.',
            'data': ServicioMotoDetailSerializer(servicio).data
        })


class MarcarListoView(APIView):
    """Mecánico marca el servicio como listo → notifica al cliente."""
    permission_classes = [IsMecanicoOrAbove]

    def patch(self, request, pk):
        try:
            servicio = ServicioMoto.objects.get(pk=pk)
        except ServicioMoto.DoesNotExist:
            return Response({'success': False, 'message': 'Servicio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        # El mecánico solo puede marcar sus propios servicios
        if request.user.role == 'MECANICO' and servicio.mecanico != request.user:
            return Response({'success': False, 'message': 'No eres el mecánico asignado.'}, status=status.HTTP_403_FORBIDDEN)

        if servicio.status not in (ServicioMoto.Status.EN_PROCESO,):
            return Response(
                {'success': False, 'message': f'No se puede marcar como listo un servicio en estado {servicio.get_status_display()}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        servicio.status = ServicioMoto.Status.LISTO
        servicio.fecha_listo = timezone.now()
        servicio.save(update_fields=['status', 'fecha_listo'])

        # Notificar al cliente por email
        _notificar_cliente_listo(servicio)

        return Response({
            'success': True,
            'message': 'Servicio marcado como listo. El cliente ha sido notificado.',
            'data': ServicioMotoDetailSerializer(servicio).data
        })


class EntregarServicioView(APIView):
    """Cajero cobra y entrega la moto → status ENTREGADO."""
    permission_classes = [IsCajeroOrAbove]

    def patch(self, request, pk):
        try:
            servicio = ServicioMoto.objects.get(pk=pk)
        except ServicioMoto.DoesNotExist:
            return Response({'success': False, 'message': 'Servicio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = EntregarServicioSerializer(
            data=request.data,
            context={'servicio': servicio}
        )
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        metodo_pago = serializer.validated_data['metodo_pago']
        monto_pagado = serializer.validated_data['monto_pagado']

        with transaction.atomic():
            servicio.status = ServicioMoto.Status.ENTREGADO
            servicio.fecha_entrega = timezone.now()

            if servicio.pago_status == 'PENDIENTE_PAGO':
                # Decrementar stock de refacciones (se paga al recoger)
                for item in servicio.items.filter(tipo__in=['REFACCION', 'EXTRA'], aprobado=True):
                    if item.producto:
                        Stock.objects.select_for_update().filter(
                            producto=item.producto,
                            sede=servicio.sede
                        ).update(quantity=F('quantity') - item.cantidad)

                servicio.pago_status = 'PAGADO'
                servicio.metodo_pago = metodo_pago
                servicio.monto_pagado = monto_pagado
                servicio.cambio = monto_pagado - servicio.total

            servicio.save(update_fields=[
                'status', 'fecha_entrega', 'pago_status',
                'metodo_pago', 'monto_pagado', 'cambio'
            ])

        return Response({
            'success': True,
            'message': 'Servicio entregado y cobrado correctamente.',
            'data': ServicioMotoDetailSerializer(servicio).data
        })


class ServicioPorQRView(APIView):
    """Cajero busca el servicio activo de un cliente por su QR token."""
    permission_classes = [IsCajeroOrAbove]

    def get(self, request, token):
        try:
            uuid.UUID(str(token))
        except ValueError:
            return Response({'success': False, 'message': 'Token inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cliente = ClienteProfile.objects.get(qr_token=token)
        except ClienteProfile.DoesNotExist:
            return Response({'success': False, 'message': 'Cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        servicios = ServicioMoto.objects.filter(
            cliente=cliente
        ).exclude(status='ENTREGADO').order_by('-fecha_recepcion')

        if not servicios.exists():
            return Response({
                'success': True,
                'message': 'El cliente no tiene servicios activos.',
                'data': {
                    'cliente_nombre': cliente.usuario.get_full_name(),
                    'cliente_email': cliente.usuario.email,
                    'servicios': []
                }
            })

        return Response({
            'success': True,
            'data': {
                'cliente_nombre': cliente.usuario.get_full_name(),
                'cliente_email': cliente.usuario.email,
                'servicios': ServicioMotoListSerializer(servicios, many=True).data
            }
        })


# ─────────────────────────────────────────────────────────────────────────────
#  SOLICITUDES DE REFACCIÓN EXTRA
# ─────────────────────────────────────────────────────────────────────────────

class SolicitudRefaccionExtraListView(APIView):
    permission_classes = [IsTallerStaff]

    def get(self, request):
        user = request.user
        qs = SolicitudRefaccionExtra.objects.select_related(
            'servicio', 'mecanico', 'producto', 'respondido_por'
        )

        if user.role == 'MECANICO':
            qs = qs.filter(mecanico=user)
        elif user.role not in ('ADMINISTRATOR',) and user.sede:
            qs = qs.filter(servicio__sede=user.sede)

        # Filtro por status
        estado = request.query_params.get('status')
        if estado:
            qs = qs.filter(status=estado)

        # Filtro por servicio
        servicio_id = request.query_params.get('servicio_id')
        if servicio_id:
            qs = qs.filter(servicio_id=servicio_id)

        serializer = SolicitudRefaccionExtraSerializer(qs, many=True)
        return Response({'success': True, 'data': serializer.data})

    def post(self, request):
        """Mecánico solicita refacción extra → servicio pasa a COTIZACION_EXTRA."""
        if request.user.role not in ('MECANICO', 'JEFE_MECANICO'):
            return Response(
                {'success': False, 'message': 'Solo mecánicos pueden solicitar refacciones extra.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = SolicitudRefaccionExtraCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            with transaction.atomic():
                solicitud = serializer.save(mecanico=request.user)
                # Cambiar status del servicio
                servicio = solicitud.servicio
                servicio.status = ServicioMoto.Status.COTIZACION_EXTRA
                servicio.save(update_fields=['status'])
            return Response(
                {
                    'success': True,
                    'message': 'Solicitud enviada. En espera de autorización del cliente.',
                    'data': SolicitudRefaccionExtraSerializer(solicitud).data
                },
                status=status.HTTP_201_CREATED
            )
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class AprobarSolicitudView(APIView):
    """Cajero aprueba la solicitud → agrega item al ticket + decrementa stock."""
    permission_classes = [IsCajeroOrAbove]

    def patch(self, request, pk):
        try:
            solicitud = SolicitudRefaccionExtra.objects.select_related(
                'servicio__sede', 'producto', 'mecanico'
            ).get(pk=pk)
        except SolicitudRefaccionExtra.DoesNotExist:
            return Response({'success': False, 'message': 'Solicitud no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        if solicitud.status != 'PENDIENTE':
            return Response(
                {'success': False, 'message': f'Esta solicitud ya fue {solicitud.get_status_display().lower()}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        servicio = solicitud.servicio

        with transaction.atomic():
            # Verificar stock
            stock = Stock.objects.select_for_update().filter(
                producto=solicitud.producto,
                sede=servicio.sede
            ).first()

            if not stock or stock.quantity < solicitud.cantidad:
                return Response(
                    {'success': False, 'message': 'Stock insuficiente para esta refacción.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Crear ítem en el ticket
            ServicioItem.objects.create(
                servicio=servicio,
                tipo='EXTRA',
                descripcion=solicitud.producto.name,
                producto=solicitud.producto,
                cantidad=solicitud.cantidad,
                precio_unitario=solicitud.producto.price,
                subtotal=solicitud.producto.price * solicitud.cantidad,
                aprobado=True,
                created_by=request.user,
            )

            # Decrementar stock
            Stock.objects.filter(
                producto=solicitud.producto,
                sede=servicio.sede
            ).update(quantity=F('quantity') - solicitud.cantidad)

            # Actualizar solicitud
            solicitud.status = 'APROBADA'
            solicitud.respondido_por = request.user
            solicitud.respondido_at = timezone.now()
            solicitud.save(update_fields=['status', 'respondido_por', 'respondido_at'])

            # Recalcular totales y volver a EN_PROCESO
            servicio.recalcular_totales()
            servicio.status = ServicioMoto.Status.EN_PROCESO
            servicio.save(update_fields=['status'])

        return Response({
            'success': True,
            'message': 'Refacción aprobada y agregada al ticket.',
            'data': SolicitudRefaccionExtraSerializer(solicitud).data
        })


class RechazarSolicitudView(APIView):
    """Cajero rechaza la solicitud → servicio vuelve a EN_PROCESO."""
    permission_classes = [IsCajeroOrAbove]

    def patch(self, request, pk):
        try:
            solicitud = SolicitudRefaccionExtra.objects.select_related('servicio').get(pk=pk)
        except SolicitudRefaccionExtra.DoesNotExist:
            return Response({'success': False, 'message': 'Solicitud no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        if solicitud.status != 'PENDIENTE':
            return Response(
                {'success': False, 'message': f'Esta solicitud ya fue {solicitud.get_status_display().lower()}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            solicitud.status = 'RECHAZADA'
            solicitud.respondido_por = request.user
            solicitud.respondido_at = timezone.now()
            solicitud.save(update_fields=['status', 'respondido_por', 'respondido_at'])

            # Si no quedan solicitudes pendientes, volver a EN_PROCESO
            servicio = solicitud.servicio
            if not servicio.solicitudes_extra.filter(status='PENDIENTE').exists():
                servicio.status = ServicioMoto.Status.EN_PROCESO
                servicio.save(update_fields=['status'])

        return Response({
            'success': True,
            'message': 'Solicitud rechazada. El mecánico puede continuar sin esa refacción.',
            'data': SolicitudRefaccionExtraSerializer(solicitud).data
        })


# ─────────────────────────────────────────────────────────────────────────────
#  ENDPOINTS PARA LA APP DEL CLIENTE (CUSTOMER role)
# ─────────────────────────────────────────────────────────────────────────────

class MisServiciosView(APIView):
    """Cliente autenticado ve sus propios servicios."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'CUSTOMER':
            return Response({'success': False, 'message': 'Solo clientes pueden acceder.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            cliente = ClienteProfile.objects.get(usuario=request.user)
        except ClienteProfile.DoesNotExist:
            return Response({'success': False, 'message': 'Perfil de cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        qs = ServicioMoto.objects.filter(cliente=cliente).select_related(
            'moto', 'sede'
        ).prefetch_related('items', 'solicitudes_extra')

        include_entregado = request.query_params.get('include_entregado', 'false').lower() == 'true'
        if not include_entregado:
            qs = qs.exclude(status='ENTREGADO')

        serializer = ServicioMotoListSerializer(qs, many=True)
        return Response({'success': True, 'data': serializer.data})


class MiServicioDetailView(APIView):
    """Cliente ve el detalle de un servicio suyo."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if request.user.role != 'CUSTOMER':
            return Response({'success': False, 'message': 'Solo clientes pueden acceder.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            cliente = ClienteProfile.objects.get(usuario=request.user)
        except ClienteProfile.DoesNotExist:
            return Response({'success': False, 'message': 'Perfil no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            servicio = ServicioMoto.objects.get(pk=pk, cliente=cliente)
        except ServicioMoto.DoesNotExist:
            return Response({'success': False, 'message': 'Servicio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'success': True,
            'data': ServicioMotoDetailSerializer(servicio).data
        })
