"""
Views for Sales — Venta + AperturaCaja
"""
import random
from datetime import timedelta

from django.db import transaction
from django.db.models import F, Sum, Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from inventory.models import Stock
from .models import Venta, CodigoApertura, AperturaCaja, ReporteCaja
from .serializers import VentaSerializer, VentaCreateSerializer, AperturaCajaSerializer, ReporteCajaSerializer
from .permissions import IsCajeroOrAbove, IsEncargadoOrAbove, IsAdministrator


def _not_found(entity='Recurso'):
    return Response({'success': False, 'message': f'{entity} no encontrado'},
                    status=status.HTTP_404_NOT_FOUND)


def _paginate(qs, request, default_size=20):
    try:
        page      = max(1, int(request.query_params.get('page', 1)))
        page_size = min(100, max(1, int(request.query_params.get('page_size', default_size))))
    except ValueError:
        page, page_size = 1, default_size
    total = qs.count()
    start = (page - 1) * page_size
    return {
        'queryset':   qs[start:start + page_size],
        'pagination': {
            'total':       total,
            'page':        page,
            'page_size':   page_size,
            'total_pages': max(1, (total + page_size - 1) // page_size),
        },
    }


# ─── Ventas ───────────────────────────────────────────────────────────────────

class VentaListCreateView(APIView):
    """
    GET  /api/sales/ventas/
         ?sede_id=  ?fecha_desde=YYYY-MM-DD  ?fecha_hasta=YYYY-MM-DD  ?cajero_id=  ?page=
    POST /api/sales/ventas/   (CASHIER, ENCARGADO, ADMINISTRATOR)
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsCajeroOrAbove()]
        return [IsAuthenticated()]

    def get(self, request):
        qs = Venta.objects.select_related('sede', 'cajero').prefetch_related('items__producto')

        sede_id      = request.query_params.get('sede_id', '').strip()
        fecha_desde  = request.query_params.get('fecha_desde', '').strip()
        fecha_hasta  = request.query_params.get('fecha_hasta', '').strip()
        cajero_id    = request.query_params.get('cajero_id', '').strip()
        status_param = request.query_params.get('status', '').strip()

        if sede_id:
            qs = qs.filter(sede_id=sede_id)
        if fecha_desde:
            qs = qs.filter(created_at__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(created_at__date__lte=fecha_hasta)
        if cajero_id:
            qs = qs.filter(cajero_id=cajero_id)
        if status_param:
            qs = qs.filter(status=status_param)

        result = _paginate(qs, request)
        return Response({'success': True, 'data': {
            'ventas':     VentaSerializer(result['queryset'], many=True).data,
            'pagination': result['pagination'],
        }})

    def post(self, request):
        s = VentaCreateSerializer(data=request.data, context={'request': request})
        if s.is_valid():
            venta = s.save()
            return Response({
                'success': True,
                'message': f'Venta #{venta.id} registrada exitosamente',
                'data': VentaSerializer(venta).data,
            }, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'message': 'Datos inválidos', 'errors': s.errors},
                        status=status.HTTP_400_BAD_REQUEST)


class VentaDetailView(APIView):
    """GET /api/sales/ventas/<id>/"""
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return Venta.objects.select_related('sede', 'cajero').prefetch_related('items__producto').get(pk=pk)
        except Venta.DoesNotExist:
            return None

    def get(self, request, pk):
        venta = self._get(pk)
        return Response({'success': True, 'data': VentaSerializer(venta).data}) if venta else _not_found('Venta')


class VentaCancelarView(APIView):
    """
    PATCH /api/sales/ventas/<id>/cancelar/
    Cancels a COMPLETADA sale and restores stock atomically.
    """
    permission_classes = [IsCajeroOrAbove]

    @transaction.atomic
    def patch(self, request, pk):
        try:
            venta = Venta.objects.select_related('sede').prefetch_related('items__producto').get(pk=pk)
        except Venta.DoesNotExist:
            return _not_found('Venta')

        if venta.status != Venta.Status.COMPLETADA:
            return Response(
                {'success': False, 'message': 'Solo se pueden cancelar ventas con estado COMPLETADA.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        venta.status = Venta.Status.CANCELADA
        venta.save(update_fields=['status'])

        for item in venta.items.all():
            Stock.objects.select_for_update().filter(
                producto=item.producto, sede=venta.sede
            ).update(quantity=F('quantity') + item.quantity)

        return Response({
            'success': True,
            'message': f'Venta #{venta.id} cancelada. Stock restaurado.',
            'data': VentaSerializer(venta).data,
        })


# ─── Apertura de Caja ─────────────────────────────────────────────────────────

class GenerarCodigoView(APIView):
    """
    POST /api/sales/cajas/generar-codigo/
    Encargado generates a 6-digit code valid for 30 minutes.
    """
    permission_classes = [IsEncargadoOrAbove]

    def post(self, request):
        if not request.user.sede:
            return Response(
                {'success': False, 'message': 'Tu cuenta no tiene sede asignada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        codigo     = str(random.randint(0, 999999)).zfill(6)
        expires_at = timezone.now() + timedelta(minutes=30)
        CodigoApertura.objects.create(
            sede=request.user.sede,
            generado_por=request.user,
            codigo=codigo,
            expires_at=expires_at,
        )
        return Response({
            'success': True,
            'data': {
                'codigo':     codigo,
                'expires_at': expires_at.isoformat(),
            },
        }, status=status.HTTP_201_CREATED)


class AbrirCajaView(APIView):
    """
    POST /api/sales/cajas/abrir/
    Cashier enters the 6-digit code to open their register.
    """
    permission_classes = [IsCajeroOrAbove]

    def post(self, request):
        codigo_str = str(request.data.get('codigo', '')).strip()
        if not codigo_str:
            return Response(
                {'success': False, 'message': 'El código es requerido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.sede:
            return Response(
                {'success': False, 'message': 'Tu cuenta no tiene sede asignada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check already has open register
        if AperturaCaja.objects.filter(cajero=request.user, status=AperturaCaja.Status.ABIERTA).exists():
            return Response(
                {'success': False, 'message': 'Ya tienes una caja abierta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find valid code for this sede
        codigo_obj = CodigoApertura.objects.filter(
            codigo=codigo_str,
            sede=request.user.sede,
            expires_at__gt=timezone.now(),
        ).order_by('-created_at').first()

        if not codigo_obj:
            return Response(
                {'success': False, 'message': 'Código incorrecto o expirado. Solicita uno nuevo al encargado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        apertura = AperturaCaja.objects.create(
            sede=request.user.sede,
            cajero=request.user,
            autorizado_por=codigo_obj.generado_por,
            codigo=codigo_obj,
        )
        return Response({
            'success': True,
            'message': 'Caja abierta correctamente.',
            'data': AperturaCajaSerializer(apertura).data,
        }, status=status.HTTP_201_CREATED)


class MiEstadoCajaView(APIView):
    """
    GET /api/sales/cajas/mi-estado/
    Returns whether the current cashier has an open register.
    """
    permission_classes = [IsCajeroOrAbove]

    def get(self, request):
        apertura = AperturaCaja.objects.filter(
            cajero=request.user,
            status=AperturaCaja.Status.ABIERTA,
        ).first()
        return Response({
            'success': True,
            'data': {
                'tiene_caja_abierta': apertura is not None,
                'apertura': AperturaCajaSerializer(apertura).data if apertura else None,
            },
        })


class CerrarCajaView(APIView):
    """
    POST /api/sales/cajas/<id>/cerrar/
    Cashier closes their register.
    """
    permission_classes = [IsCajeroOrAbove]

    def post(self, request, pk):
        try:
            apertura = AperturaCaja.objects.get(pk=pk, cajero=request.user)
        except AperturaCaja.DoesNotExist:
            return _not_found('Apertura de caja')

        if apertura.status != AperturaCaja.Status.ABIERTA:
            return Response(
                {'success': False, 'message': 'Esta caja ya está cerrada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        apertura.status       = AperturaCaja.Status.CERRADA
        apertura.fecha_cierre = timezone.now()
        apertura.save(update_fields=['status', 'fecha_cierre'])

        # Generate PDF report asynchronously (best-effort — don't fail cierre if PDF fails)
        try:
            from .pdf_service import build_reporte_from_apertura
            build_reporte_from_apertura(apertura)
        except Exception:
            pass  # PDF generation is non-critical

        return Response({
            'success': True,
            'message': 'Caja cerrada correctamente.',
            'data': AperturaCajaSerializer(apertura).data,
        })


class CajasActivasView(APIView):
    """
    GET /api/sales/cajas/activas/
    Returns all open registers for the encargado's sede.
    """
    permission_classes = [IsEncargadoOrAbove]

    def get(self, request):
        if not request.user.sede:
            return Response({'success': True, 'data': []})
        qs = AperturaCaja.objects.select_related('cajero', 'autorizado_por').filter(
            sede=request.user.sede,
            status=AperturaCaja.Status.ABIERTA,
        )
        return Response({
            'success': True,
            'data': AperturaCajaSerializer(qs, many=True).data,
        })


# ─── Admin resumen ────────────────────────────────────────────────────────────

class AdminResumenView(APIView):
    """
    GET /api/sales/admin/resumen/
    Per-sede sales summary: ingresos (hoy/semana/mes/año), devoluciones, cajas abiertas.
    ADMINISTRATOR only.
    """
    permission_classes = [IsAdministrator]

    def get(self, request):
        from branches.models import Sede
        from datetime import date

        sedes       = Sede.objects.filter(is_active=True)
        today       = timezone.now().date()
        week_start  = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)
        year_start  = today.replace(month=1, day=1)

        result = []
        for sede in sedes:
            completadas = Venta.objects.filter(sede=sede, status=Venta.Status.COMPLETADA)
            canceladas  = Venta.objects.filter(sede=sede, status=Venta.Status.CANCELADA)

            ingresos_hoy    = completadas.filter(created_at__date=today).aggregate(t=Sum('total'))['t'] or 0
            ingresos_semana = completadas.filter(created_at__date__gte=week_start).aggregate(t=Sum('total'))['t'] or 0
            ingresos_mes    = completadas.filter(created_at__date__gte=month_start).aggregate(t=Sum('total'))['t'] or 0
            ingresos_anio   = completadas.filter(created_at__date__gte=year_start).aggregate(t=Sum('total'))['t'] or 0

            dev_hoy       = canceladas.filter(created_at__date=today).count()
            dev_mes       = canceladas.filter(created_at__date__gte=month_start).count()
            monto_dev_mes = canceladas.filter(created_at__date__gte=month_start).aggregate(t=Sum('total'))['t'] or 0

            cajas = AperturaCaja.objects.filter(
                sede=sede, status=AperturaCaja.Status.ABIERTA
            ).select_related('cajero')
            cajas_abiertas = [
                {
                    'cajero_name': c.cajero.get_full_name(),
                    'desde':       c.fecha_apertura.strftime('%H:%M'),
                }
                for c in cajas
            ]

            result.append({
                'sede_id':                sede.id,
                'sede_name':              sede.name,
                'ingresos_hoy':           str(ingresos_hoy),
                'ingresos_semana':        str(ingresos_semana),
                'ingresos_mes':           str(ingresos_mes),
                'ingresos_anio':          str(ingresos_anio),
                'devoluciones_hoy':       dev_hoy,
                'devoluciones_mes':       dev_mes,
                'monto_devoluciones_mes': str(monto_dev_mes),
                'cajas_abiertas':         cajas_abiertas,
            })

        return Response({'success': True, 'data': result})


# ─── Reportes ─────────────────────────────────────────────────────────────────

class ReportesView(APIView):
    """
    GET /api/sales/reportes/
        ?sede_id=  ?fecha_desde=YYYY-MM-DD  ?fecha_hasta=YYYY-MM-DD
    Returns: ventas_por_dia, top_productos, resumen.
    ADMINISTRATOR only.
    """
    permission_classes = [IsAdministrator]

    def get(self, request):
        from .models import VentaItem

        sede_id     = request.query_params.get('sede_id', '').strip()
        fecha_desde = request.query_params.get('fecha_desde', '').strip()
        fecha_hasta = request.query_params.get('fecha_hasta', '').strip()

        def _apply_filters(qs, date_field='created_at__date'):
            if sede_id:
                qs = qs.filter(sede_id=sede_id)
            if fecha_desde:
                qs = qs.filter(**{f'{date_field}__gte': fecha_desde})
            if fecha_hasta:
                qs = qs.filter(**{f'{date_field}__lte': fecha_hasta})
            return qs

        completadas = _apply_filters(Venta.objects.filter(status=Venta.Status.COMPLETADA))
        canceladas  = _apply_filters(Venta.objects.filter(status=Venta.Status.CANCELADA))

        # Ventas por día
        ventas_por_dia = (
            completadas
            .annotate(fecha=TruncDate('created_at'))
            .values('fecha')
            .annotate(cantidad=Count('id'), monto=Sum('total'))
            .order_by('fecha')
        )

        # Top 20 productos
        items_base = VentaItem.objects.filter(venta__status=Venta.Status.COMPLETADA)
        if sede_id:
            items_base = items_base.filter(venta__sede_id=sede_id)
        if fecha_desde:
            items_base = items_base.filter(venta__created_at__date__gte=fecha_desde)
        if fecha_hasta:
            items_base = items_base.filter(venta__created_at__date__lte=fecha_hasta)

        top_productos = (
            items_base
            .values('producto__name', 'producto__sku')
            .annotate(total_vendidos=Sum('quantity'), monto_total=Sum('subtotal'))
            .order_by('-total_vendidos')[:20]
        )

        resumen_agg  = completadas.aggregate(total=Sum('total'))
        dev_agg      = canceladas.aggregate(total=Sum('total'))

        return Response({'success': True, 'data': {
            'ventas_por_dia': [
                {
                    'fecha':    str(v['fecha']),
                    'cantidad': v['cantidad'],
                    'monto':    str(v['monto'] or 0),
                }
                for v in ventas_por_dia
            ],
            'top_productos': [
                {
                    'producto_name':  v['producto__name'],
                    'sku':            v['producto__sku'],
                    'total_vendidos': v['total_vendidos'],
                    'monto_total':    str(v['monto_total'] or 0),
                }
                for v in top_productos
            ],
            'resumen': {
                'total_ventas':          completadas.count(),
                'monto_total':           str(resumen_agg['total'] or 0),
                'total_cancelaciones':   canceladas.count(),
                'monto_cancelaciones':   str(dev_agg['total'] or 0),
            },
        }})


# ─── Reportes de Caja ──────────────────────────────────────────────────────────

class ReportesCajaListView(APIView):
    """
    GET /api/sales/reportes-caja/
    - CASHIER/ENCARGADO: see reports from their sede
    - ADMINISTRATOR: see all, optionally filter ?sede_id=
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        qs   = ReporteCaja.objects.select_related(
            'apertura__cajero', 'apertura__sede', 'apertura__autorizado_por'
        )

        if user.role == 'ADMINISTRATOR':
            sede_id = request.query_params.get('sede_id', '').strip()
            if sede_id:
                qs = qs.filter(apertura__sede_id=sede_id)
        elif user.role in ('ENCARGADO', 'CASHIER', 'WORKER'):
            if not user.sede:
                return Response({'success': True, 'data': []})
            qs = qs.filter(apertura__sede=user.sede)
        else:
            return Response({'success': False, 'message': 'Sin permisos.'},
                            status=status.HTTP_403_FORBIDDEN)

        result = _paginate(qs, request)
        return Response({'success': True, 'data': {
            'reportes':   ReporteCajaSerializer(result['queryset'], many=True).data,
            'pagination': result['pagination'],
        }})


class ReporteCajaDownloadView(APIView):
    """
    GET /api/sales/reportes-caja/<id>/descargar/
    Returns the PDF file as attachment.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from django.http import FileResponse
        user = request.user

        try:
            reporte = ReporteCaja.objects.select_related('apertura__sede', 'apertura__cajero').get(pk=pk)
        except ReporteCaja.DoesNotExist:
            return _not_found('Reporte')

        # Access control
        if user.role == 'ADMINISTRATOR':
            pass  # full access
        elif user.role in ('ENCARGADO', 'CASHIER', 'WORKER'):
            if not user.sede or reporte.apertura.sede != user.sede:
                return Response({'success': False, 'message': 'Sin permisos para este reporte.'},
                                status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({'success': False, 'message': 'Sin permisos.'},
                            status=status.HTTP_403_FORBIDDEN)

        if not reporte.archivo:
            return Response({'success': False, 'message': 'El archivo PDF no está disponible.'},
                            status=status.HTTP_404_NOT_FOUND)

        response = FileResponse(
            reporte.archivo.open('rb'),
            content_type='application/pdf',
        )
        response['Content-Disposition'] = f'attachment; filename="{reporte.archivo.name.split("/")[-1]}"'
        return response
