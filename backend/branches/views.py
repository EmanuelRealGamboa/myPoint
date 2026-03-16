"""
Views for Sede (Branch) management
"""
from django.db.models import F
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Sede
from .serializers import SedeSerializer


class SedeListCreateView(APIView):
    """
    GET  /api/branches/  — List all active sedes (any authenticated user).
    POST /api/branches/  — Create a new sede (ADMINISTRATOR only).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sedes = Sede.objects.filter(is_active=True)
        return Response({
            'success': True,
            'data': SedeSerializer(sedes, many=True).data,
        }, status=status.HTTP_200_OK)

    def post(self, request):
        if not request.user.is_administrator:
            return Response({
                'success': False,
                'message': 'No tienes permisos para crear sedes',
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = SedeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Sede creada exitosamente',
                'data': serializer.data,
            }, status=status.HTTP_201_CREATED)

        return Response({
            'success': False,
            'message': 'Datos inválidos',
            'errors': serializer.errors,
        }, status=status.HTTP_400_BAD_REQUEST)


class SedeDetailView(APIView):
    """
    GET    /api/branches/<id>/  — Retrieve sede (any authenticated user).
    PUT    /api/branches/<id>/  — Update sede (ADMINISTRATOR only).
    DELETE /api/branches/<id>/  — Deactivate sede (ADMINISTRATOR only).
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return Sede.objects.get(pk=pk)
        except Sede.DoesNotExist:
            return None

    def get(self, request, pk):
        sede = self.get_object(pk)
        if not sede:
            return Response({'success': False, 'message': 'Sede no encontrada'},
                            status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'data': SedeSerializer(sede).data},
                        status=status.HTTP_200_OK)

    def put(self, request, pk):
        if not request.user.is_administrator:
            return Response({'success': False, 'message': 'No tienes permisos para modificar sedes'},
                            status=status.HTTP_403_FORBIDDEN)
        sede = self.get_object(pk)
        if not sede:
            return Response({'success': False, 'message': 'Sede no encontrada'},
                            status=status.HTTP_404_NOT_FOUND)

        serializer = SedeSerializer(sede, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Sede actualizada exitosamente',
                'data': serializer.data,
            }, status=status.HTTP_200_OK)

        return Response({'success': False, 'message': 'Datos inválidos', 'errors': serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not request.user.is_administrator:
            return Response({'success': False, 'message': 'No tienes permisos para eliminar sedes'},
                            status=status.HTTP_403_FORBIDDEN)
        sede = self.get_object(pk)
        if not sede:
            return Response({'success': False, 'message': 'Sede no encontrada'},
                            status=status.HTTP_404_NOT_FOUND)

        sede.is_active = False
        sede.save()
        return Response({'success': True, 'message': 'Sede desactivada exitosamente'},
                        status=status.HTTP_200_OK)


class SedeSummaryView(APIView):
    """
    GET /api/branches/<id>/summary/
    Rich real-time stats for a single sede: employee counts, on-shift workers,
    and stock alerts.

    ADMINISTRATOR — can view any sede.
    ENCARGADO     — can only view their own sede.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        user = request.user

        # Permission check
        if not user.is_administrator:
            if not (user.is_encargado and user.sede_id == int(pk)):
                return Response({'success': False, 'message': 'No tienes permisos'},
                                status=status.HTTP_403_FORBIDDEN)

        try:
            sede = Sede.objects.get(pk=pk, is_active=True)
        except Sede.DoesNotExist:
            return Response({'success': False, 'message': 'Sede no encontrada'},
                            status=status.HTTP_404_NOT_FOUND)

        from django.utils import timezone
        from users.models import CustomUser, Turno

        now      = timezone.localtime()
        today    = now.weekday()
        now_time = now.time()

        emp_qs = CustomUser.objects.filter(is_active=True, sede=sede)
        on_shift_qs = Turno.objects.filter(
            sede=sede,
            is_active=True,
            dia_semana=today,
            hora_inicio__lte=now_time,
            hora_fin__gte=now_time,
        ).select_related('user')

        try:
            from inventory.models import Stock
            low_stock_count    = Stock.objects.filter(sede=sede, quantity__lte=F('min_quantity')).count()
            out_of_stock_count = Stock.objects.filter(sede=sede, quantity=0).count()
        except Exception:
            low_stock_count = out_of_stock_count = 0

        return Response({
            'success': True,
            'data': {
                'id':       sede.id,
                'name':     sede.name,
                'address':  sede.address,
                'phone':    sede.phone,
                'is_active': sede.is_active,
                'total_employees':  emp_qs.count(),
                'total_encargados': emp_qs.filter(role=CustomUser.Role.ENCARGADO).count(),
                'total_workers':    emp_qs.filter(role=CustomUser.Role.WORKER).count(),
                'total_cashiers':   emp_qs.filter(role=CustomUser.Role.CASHIER).count(),
                'on_shift_now':  on_shift_qs.count(),
                'on_shift_users': [
                    {'id': t.user.id, 'name': t.user.get_full_name(), 'role': t.user.role}
                    for t in on_shift_qs
                ],
                'low_stock_count':    low_stock_count,
                'out_of_stock_count': out_of_stock_count,
            },
        }, status=status.HTTP_200_OK)
