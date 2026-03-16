"""
Views for Billing — ConfiguracionFiscalSede
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from branches.models import Sede
from .models import ConfiguracionFiscalSede
from .serializers import ConfiguracionFiscalSedeSerializer


class IsAdministrator(IsAuthenticated):
    message = 'Se requiere rol Administrador.'

    def has_permission(self, request, view):
        return (
            super().has_permission(request, view) and
            request.user.role == 'ADMINISTRATOR'
        )


class ConfigFiscalSedeView(APIView):
    """
    GET  /api/billing/config/<sede_id>/   — anyone authenticated
    PUT  /api/billing/config/<sede_id>/   — ADMINISTRATOR only (create or update)
    """

    def get_permissions(self):
        if self.request.method == 'PUT':
            return [IsAdministrator()]
        return [IsAuthenticated()]

    def _get_sede(self, sede_id):
        try:
            return Sede.objects.get(pk=sede_id)
        except Sede.DoesNotExist:
            return None

    def get(self, request, sede_id):
        sede = self._get_sede(sede_id)
        if not sede:
            return Response({'success': False, 'message': 'Sede no encontrada'},
                            status=status.HTTP_404_NOT_FOUND)
        config = ConfiguracionFiscalSede.objects.filter(sede=sede).first()
        if config:
            return Response({'success': True, 'data': ConfiguracionFiscalSedeSerializer(config).data})
        return Response({'success': True, 'data': None})

    def put(self, request, sede_id):
        sede = self._get_sede(sede_id)
        if not sede:
            return Response({'success': False, 'message': 'Sede no encontrada'},
                            status=status.HTTP_404_NOT_FOUND)

        config = ConfiguracionFiscalSede.objects.filter(sede=sede).first()
        if config:
            serializer = ConfiguracionFiscalSedeSerializer(config, data=request.data, partial=True)
        else:
            data = {**request.data, 'sede': sede_id}
            serializer = ConfiguracionFiscalSedeSerializer(data=data)

        if serializer.is_valid():
            serializer.save(sede=sede)
            return Response({'success': True, 'data': serializer.data})
        return Response({'success': False, 'errors': serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST)


class ConfigFiscalListView(APIView):
    """
    GET /api/billing/config/   — ADMINISTRATOR: list all sede configs
    """
    permission_classes = [IsAdministrator]

    def get(self, request):
        configs = ConfiguracionFiscalSede.objects.select_related('sede').all()
        return Response({
            'success': True,
            'data': ConfiguracionFiscalSedeSerializer(configs, many=True).data,
        })
