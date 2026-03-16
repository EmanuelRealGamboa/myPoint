import io
import qrcode
import base64
from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import ClienteProfile
from .serializers import (
    ClienteRegistroSerializer,
    ClienteProfileSerializer,
    ClienteBusquedaSerializer,
)


def _jwt_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    }


# ── Registro público ──────────────────────────────────────────────────────────

class RegistroClienteView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ClienteRegistroSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        profile = user.cliente_profile
        tokens = _jwt_for_user(user)
        return Response({
            'success': True,
            'message': '¡Bienvenido a MotoQFox!',
            'data': {
                'tokens':  tokens,
                'profile': ClienteProfileSerializer(profile).data,
            },
        }, status=status.HTTP_201_CREATED)


# ── Perfil propio ─────────────────────────────────────────────────────────────

class MiPerfilView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_profile(self, user):
        try:
            return user.cliente_profile
        except ClienteProfile.DoesNotExist:
            return None

    def get(self, request):
        profile = self._get_profile(request.user)
        if not profile:
            return Response({'success': False, 'message': 'Perfil no encontrado.'},
                            status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'data': ClienteProfileSerializer(profile).data})

    def patch(self, request):
        profile = self._get_profile(request.user)
        if not profile:
            return Response({'success': False, 'message': 'Perfil no encontrado.'},
                            status=status.HTTP_404_NOT_FOUND)
        serializer = ClienteProfileSerializer(profile, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response({'success': True, 'data': serializer.data})


# ── QR del cliente (imagen base64) ───────────────────────────────────────────

class MiQRView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.cliente_profile
        except ClienteProfile.DoesNotExist:
            return Response({'success': False, 'message': 'Perfil no encontrado.'},
                            status=status.HTTP_404_NOT_FOUND)

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        qr.add_data(str(profile.qr_token))
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')

        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        img_b64 = base64.b64encode(buffer.read()).decode('utf-8')

        return Response({
            'success': True,
            'data': {
                'qr_token':   str(profile.qr_token),
                'qr_base64':  f'data:image/png;base64,{img_b64}',
            },
        })


# ── Historial de compras del cliente ─────────────────────────────────────────

class MisComprasView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.cliente_profile
        except ClienteProfile.DoesNotExist:
            return Response({'success': False, 'data': []})

        from sales.models import Venta
        from sales.serializers import VentaSerializer

        ventas = Venta.objects.filter(cliente=profile).select_related(
            'sede', 'cajero'
        ).prefetch_related('items__producto')

        page      = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end   = start + page_size
        total = ventas.count()

        return Response({
            'success': True,
            'data': {
                'ventas':     VentaSerializer(ventas[start:end], many=True).data,
                'total':      total,
                'page':       page,
                'page_size':  page_size,
                'total_pages': (total + page_size - 1) // page_size,
            },
        })


# ── POS: buscar cliente por nombre/teléfono/email ────────────────────────────

class BuscarClienteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response({'success': True, 'data': []})

        profiles = ClienteProfile.objects.filter(
            Q(usuario__first_name__icontains=q) |
            Q(usuario__last_name__icontains=q)  |
            Q(usuario__email__icontains=q)       |
            Q(telefono__icontains=q)
        ).select_related('usuario')[:10]

        return Response({
            'success': True,
            'data': ClienteBusquedaSerializer(profiles, many=True).data,
        })


# ── POS: obtener cliente por QR token ────────────────────────────────────────

class ClientePorQRView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, token):
        try:
            profile = ClienteProfile.objects.select_related('usuario').get(qr_token=token)
        except (ClienteProfile.DoesNotExist, ValueError):
            return Response({'success': False, 'message': 'Cliente no encontrado.'},
                            status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'data': ClienteBusquedaSerializer(profile).data})
