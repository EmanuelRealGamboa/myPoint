"""
Views for Inventory — Categoria, Subcategoria, MarcaFabricante,
MarcaMoto, ModeloMoto, Producto (with fitment), Stock,
EntradaInventario, AuditoriaInventario / AuditoriaItem
"""
from django.db import transaction
from django.db.models import Q, F
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from .models import (
    Categoria, Subcategoria,
    MarcaFabricante, MarcaMoto, ModeloMoto,
    Producto, CompatibilidadPieza,
    Stock, EntradaInventario,
    AuditoriaInventario, AuditoriaItem,
)
from .serializers import (
    CategoriaSerializer, SubcategoriaSerializer,
    MarcaFabricanteSerializer, MarcaMotoSerializer, ModeloMotoSerializer,
    CompatibilidadSerializer,
    ProductoSerializer, ProductoCreateSerializer, ProductoImageSerializer,
    StockSerializer, StockUpdateSerializer,
    EntradaInventarioSerializer,
    AuditoriaInventarioSerializer, AuditoriaCreateSerializer,
    AuditoriaItemSerializer,
)
from .permissions import IsAdministrator, IsAdministratorOrWorker


# ─── Helpers ──────────────────────────────────────────────────────────────────

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


def _not_found(entity='Recurso'):
    return Response({'success': False, 'message': f'{entity} no encontrado'},
                    status=status.HTTP_404_NOT_FOUND)


# ─────────────────────────────────────────────
#  CATEGORIAS
# ─────────────────────────────────────────────

class CategoriaListCreateView(APIView):
    """
    GET  /api/inventory/categories/
    POST /api/inventory/categories/   (ADMINISTRATOR or WORKER)
    """
    def get_permissions(self):
        return [IsAdministratorOrWorker()] if self.request.method == 'POST' else [IsAuthenticated()]

    def get(self, request):
        qs = Categoria.objects.prefetch_related('subcategorias')
        is_active = request.query_params.get('is_active', '').strip()
        if is_active in ('true', 'false'):
            qs = qs.filter(is_active=(is_active == 'true'))
        result = _paginate(qs, request)
        return Response({'success': True, 'data': {
            'categories': CategoriaSerializer(result['queryset'], many=True).data,
            'pagination': result['pagination'],
        }})

    def post(self, request):
        s = CategoriaSerializer(data=request.data)
        if s.is_valid():
            s.save()
            return Response({'success': True, 'message': 'Categoría creada', 'data': s.data},
                            status=status.HTTP_201_CREATED)
        return Response({'success': False, 'message': 'Datos inválidos', 'errors': s.errors},
                        status=status.HTTP_400_BAD_REQUEST)


class CategoriaDetailView(APIView):
    """GET / PUT / DELETE /api/inventory/categories/<id>/"""
    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAdministrator()]
        if self.request.method == 'PUT':
            return [IsAdministratorOrWorker()]
        return [IsAuthenticated()]

    def _get(self, pk):
        try:
            return Categoria.objects.prefetch_related('subcategorias').get(pk=pk)
        except Categoria.DoesNotExist:
            return None

    def get(self, request, pk):
        cat = self._get(pk)
        return Response({'success': True, 'data': CategoriaSerializer(cat).data}) if cat else _not_found('Categoría')

    def put(self, request, pk):
        cat = self._get(pk)
        if not cat:
            return _not_found('Categoría')
        s = CategoriaSerializer(cat, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response({'success': True, 'message': 'Categoría actualizada', 'data': s.data})
        return Response({'success': False, 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        cat = self._get(pk)
        if not cat:
            return _not_found('Categoría')
        if cat.productos.filter(is_active=True).exists():
            return Response({'success': False,
                             'message': 'No se puede desactivar: tiene productos activos.'},
                            status=status.HTTP_400_BAD_REQUEST)
        cat.is_active = not cat.is_active
        cat.save()
        return Response({'success': True, 'message': f'Categoría {"activada" if cat.is_active else "desactivada"}',
                         'data': {'is_active': cat.is_active}})


# ─────────────────────────────────────────────
#  SUBCATEGORIAS
# ─────────────────────────────────────────────

class SubcategoriaListCreateView(APIView):
    """
    GET  /api/inventory/subcategories/?categoria=<id>
    POST /api/inventory/subcategories/
    """
    def get_permissions(self):
        return [IsAdministratorOrWorker()] if self.request.method == 'POST' else [IsAuthenticated()]

    def get(self, request):
        qs = Subcategoria.objects.select_related('categoria')
        cat_id    = request.query_params.get('categoria', '').strip()
        is_active = request.query_params.get('is_active', '').strip()
        if cat_id:
            qs = qs.filter(categoria_id=cat_id)
        if is_active in ('true', 'false'):
            qs = qs.filter(is_active=(is_active == 'true'))
        result = _paginate(qs, request, default_size=100)
        return Response({'success': True, 'data': {
            'subcategories': SubcategoriaSerializer(result['queryset'], many=True).data,
            'pagination': result['pagination'],
        }})

    def post(self, request):
        s = SubcategoriaSerializer(data=request.data)
        if s.is_valid():
            s.save()
            return Response({'success': True, 'message': 'Subcategoría creada', 'data': s.data},
                            status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)


class SubcategoriaDetailView(APIView):
    """GET / PUT / DELETE /api/inventory/subcategories/<id>/"""
    def get_permissions(self):
        if self.request.method in ('PUT', 'DELETE'):
            return [IsAdministratorOrWorker()]
        return [IsAuthenticated()]

    def _get(self, pk):
        try:
            return Subcategoria.objects.select_related('categoria').get(pk=pk)
        except Subcategoria.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        return Response({'success': True, 'data': SubcategoriaSerializer(obj).data}) if obj else _not_found('Subcategoría')

    def put(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return _not_found('Subcategoría')
        s = SubcategoriaSerializer(obj, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response({'success': True, 'message': 'Subcategoría actualizada', 'data': s.data})
        return Response({'success': False, 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return _not_found('Subcategoría')
        obj.is_active = not obj.is_active
        obj.save()
        return Response({'success': True, 'message': f'Subcategoría {"activada" if obj.is_active else "desactivada"}',
                         'data': {'is_active': obj.is_active}})


# ─────────────────────────────────────────────
#  MARCA FABRICANTE
# ─────────────────────────────────────────────

class MarcaFabricanteListCreateView(APIView):
    def get_permissions(self):
        return [IsAdministratorOrWorker()] if self.request.method == 'POST' else [IsAuthenticated()]

    def get(self, request):
        qs = MarcaFabricante.objects.all()
        is_active = request.query_params.get('is_active', '').strip()
        tipo      = request.query_params.get('tipo', '').strip()
        if is_active in ('true', 'false'):
            qs = qs.filter(is_active=(is_active == 'true'))
        if tipo:
            qs = qs.filter(tipo=tipo)
        return Response({'success': True, 'data': MarcaFabricanteSerializer(qs, many=True).data})

    def post(self, request):
        s = MarcaFabricanteSerializer(data=request.data)
        if s.is_valid():
            s.save()
            return Response({'success': True, 'message': 'Marca creada', 'data': s.data},
                            status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)


class MarcaFabricanteDetailView(APIView):
    def get_permissions(self):
        return [IsAdministratorOrWorker()] if self.request.method == 'PUT' else [IsAuthenticated()]

    def _get(self, pk):
        try:
            return MarcaFabricante.objects.get(pk=pk)
        except MarcaFabricante.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        return Response({'success': True, 'data': MarcaFabricanteSerializer(obj).data}) if obj else _not_found('Marca')

    def put(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return _not_found('Marca')
        s = MarcaFabricanteSerializer(obj, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response({'success': True, 'data': s.data})
        return Response({'success': False, 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
#  MARCAS Y MODELOS DE MOTO
# ─────────────────────────────────────────────

class MarcaMotoListCreateView(APIView):
    def get_permissions(self):
        return [IsAdministratorOrWorker()] if self.request.method == 'POST' else [IsAuthenticated()]

    def get(self, request):
        qs = MarcaMoto.objects.filter(is_active=True)
        return Response({'success': True, 'data': MarcaMotoSerializer(qs, many=True).data})

    def post(self, request):
        s = MarcaMotoSerializer(data=request.data)
        if s.is_valid():
            s.save()
            return Response({'success': True, 'data': s.data}, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)


class MarcaMotoDetailView(APIView):
    """GET / PUT /api/inventory/moto-brands/<id>/"""
    def get_permissions(self):
        return [IsAdministratorOrWorker()] if self.request.method == 'PUT' else [IsAuthenticated()]

    def _get(self, pk):
        try:
            return MarcaMoto.objects.get(pk=pk)
        except MarcaMoto.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        return Response({'success': True, 'data': MarcaMotoSerializer(obj).data}) if obj else _not_found('Marca moto')

    def put(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return _not_found('Marca moto')
        s = MarcaMotoSerializer(obj, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response({'success': True, 'data': s.data})
        return Response({'success': False, 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)


class ModeloMotoListCreateView(APIView):
    """
    GET  /api/inventory/moto-models/?marca=<id>&tipo_moto=&search=
    POST /api/inventory/moto-models/
    """
    def get_permissions(self):
        return [IsAdministratorOrWorker()] if self.request.method == 'POST' else [IsAuthenticated()]

    def get(self, request):
        qs = ModeloMoto.objects.select_related('marca').filter(is_active=True)
        marca_id  = request.query_params.get('marca', '').strip()
        tipo_moto = request.query_params.get('tipo_moto', '').strip()
        search    = request.query_params.get('search', '').strip()
        if marca_id:
            qs = qs.filter(marca_id=marca_id)
        if tipo_moto:
            qs = qs.filter(tipo_moto=tipo_moto)
        if search:
            qs = qs.filter(Q(modelo__icontains=search) | Q(marca__name__icontains=search))
        result = _paginate(qs, request, default_size=100)
        return Response({'success': True, 'data': {
            'models': ModeloMotoSerializer(result['queryset'], many=True).data,
            'pagination': result['pagination'],
        }})

    def post(self, request):
        s = ModeloMotoSerializer(data=request.data)
        if s.is_valid():
            s.save()
            return Response({'success': True, 'data': s.data}, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)


class ModeloMotoDetailView(APIView):
    def get_permissions(self):
        return [IsAdministratorOrWorker()] if self.request.method == 'PUT' else [IsAuthenticated()]

    def _get(self, pk):
        try:
            return ModeloMoto.objects.select_related('marca').get(pk=pk)
        except ModeloMoto.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        return Response({'success': True, 'data': ModeloMotoSerializer(obj).data}) if obj else _not_found('Modelo')

    def put(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return _not_found('Modelo')
        s = ModeloMotoSerializer(obj, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response({'success': True, 'data': s.data})
        return Response({'success': False, 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
#  PRODUCTOS
# ─────────────────────────────────────────────

class ProductoListCreateView(APIView):
    """
    GET  /api/inventory/products/
         ?search=  ?categoria=  ?subcategoria=  ?marca_fabricante=
         ?tipo_parte=  ?moto_modelo_id=  ?is_active=  ?low_stock=
         ?sede_id=  ?page=  ?page_size=
    POST /api/inventory/products/
    """
    def get_permissions(self):
        return [IsAdministratorOrWorker()] if self.request.method == 'POST' else [IsAuthenticated()]

    def get(self, request):
        qs = Producto.objects.select_related(
            'categoria', 'subcategoria', 'marca_fabricante'
        ).prefetch_related(
            'stock_items__sede',
            'compatibilidades__modelo_moto__marca',
        )

        search           = request.query_params.get('search', '').strip()
        categoria_id     = request.query_params.get('categoria', '').strip()
        subcategoria_id  = request.query_params.get('subcategoria', '').strip()
        marca_fab_id     = request.query_params.get('marca_fabricante', '').strip()
        tipo_parte       = request.query_params.get('tipo_parte', '').strip()
        moto_modelo_id   = request.query_params.get('moto_modelo_id', '').strip()
        is_active        = request.query_params.get('is_active', '').strip()
        sede_id          = request.query_params.get('sede_id', '').strip()
        low_stock        = request.query_params.get('low_stock', '').strip()
        barcode          = request.query_params.get('barcode', '').strip()

        if search:
            qs = qs.filter(
                Q(name__icontains=search) | Q(sku__icontains=search) |
                Q(codigo_barras__icontains=search) |
                Q(numero_parte_oem__icontains=search) |
                Q(numero_parte_aftermarket__icontains=search) |
                Q(description__icontains=search)
            )
        if barcode:
            qs = qs.filter(codigo_barras=barcode)
        if categoria_id:
            qs = qs.filter(categoria_id=categoria_id)
        if subcategoria_id:
            qs = qs.filter(subcategoria_id=subcategoria_id)
        if marca_fab_id:
            qs = qs.filter(marca_fabricante_id=marca_fab_id)
        if tipo_parte:
            qs = qs.filter(tipo_parte=tipo_parte)
        if moto_modelo_id:
            # Products compatible with the given moto model OR universal
            qs = qs.filter(
                Q(es_universal=True) | Q(aplicaciones__id=moto_modelo_id)
            )
        if is_active in ('true', 'false'):
            qs = qs.filter(is_active=(is_active == 'true'))
        if sede_id:
            qs = qs.filter(stock_items__sede_id=sede_id)
        if low_stock == 'true':
            qs = qs.filter(stock_items__quantity__lte=F('stock_items__min_quantity'))

        qs = qs.distinct()
        result = _paginate(qs, request)
        return Response({'success': True, 'data': {
            'products':   ProductoSerializer(result['queryset'], many=True, context={'request': request}).data,
            'pagination': result['pagination'],
        }})

    def post(self, request):
        s = ProductoCreateSerializer(data=request.data)
        if s.is_valid():
            producto = s.save()
            return Response({
                'success': True,
                'message': 'Producto creado exitosamente',
                'data': ProductoSerializer(producto, context={'request': request}).data,
            }, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'message': 'Datos inválidos', 'errors': s.errors},
                        status=status.HTTP_400_BAD_REQUEST)


class ProductoDetailView(APIView):
    """GET / PUT / DELETE /api/inventory/products/<id>/"""
    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAdministrator()]
        if self.request.method == 'PUT':
            return [IsAdministratorOrWorker()]
        return [IsAuthenticated()]

    def _get(self, pk):
        try:
            return Producto.objects.select_related(
                'categoria', 'subcategoria', 'marca_fabricante'
            ).prefetch_related(
                'stock_items__sede',
                'compatibilidades__modelo_moto__marca',
            ).get(pk=pk)
        except Producto.DoesNotExist:
            return None

    def get(self, request, pk):
        p = self._get(pk)
        return Response({'success': True, 'data': ProductoSerializer(p, context={'request': request}).data}) if p else _not_found('Producto')

    def put(self, request, pk):
        p = self._get(pk)
        if not p:
            return _not_found('Producto')
        s = ProductoCreateSerializer(p, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response({'success': True, 'message': 'Producto actualizado',
                             'data': ProductoSerializer(self._get(pk), context={'request': request}).data})
        return Response({'success': False, 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        p = self._get(pk)
        if not p:
            return _not_found('Producto')
        p.is_active = not p.is_active
        p.save()
        return Response({'success': True, 'message': f'Producto {"activado" if p.is_active else "desactivado"}',
                         'data': {'is_active': p.is_active}})


# ─────────────────────────────────────────────
#  IMAGEN DE PRODUCTO
# ─────────────────────────────────────────────

class ProductoImageUploadView(APIView):
    """PATCH /api/inventory/products/<id>/image/"""
    permission_classes = [IsAdministratorOrWorker]
    parser_classes     = [MultiPartParser, FormParser]

    def patch(self, request, pk):
        try:
            producto = Producto.objects.get(pk=pk)
        except Producto.DoesNotExist:
            return _not_found('Producto')
        s = ProductoImageSerializer(producto, data=request.data, partial=True)
        if s.is_valid():
            if producto.imagen:
                producto.imagen.delete(save=False)
            s.save()
            imagen_url = request.build_absolute_uri(s.instance.imagen.url) if s.instance.imagen else None
            return Response({'success': True, 'message': 'Imagen actualizada',
                             'data': {'imagen': imagen_url}})
        return Response({'success': False, 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
#  COMPATIBILIDAD DE PIEZAS  (fitment management)
# ─────────────────────────────────────────────

class CompatibilidadListCreateView(APIView):
    """
    GET  /api/inventory/products/<pk>/compatibility/
    POST /api/inventory/products/<pk>/compatibility/
    """
    permission_classes = [IsAdministratorOrWorker]

    def _get_producto(self, pk):
        try:
            return Producto.objects.get(pk=pk)
        except Producto.DoesNotExist:
            return None

    def get(self, request, pk):
        producto = self._get_producto(pk)
        if not producto:
            return _not_found('Producto')
        qs = CompatibilidadPieza.objects.filter(producto=producto).select_related('modelo_moto__marca')
        return Response({'success': True, 'data': CompatibilidadSerializer(qs, many=True).data})

    def post(self, request, pk):
        producto = self._get_producto(pk)
        if not producto:
            return _not_found('Producto')
        data = {**request.data, 'producto': pk}
        # Prevent duplicates
        if CompatibilidadPieza.objects.filter(
            producto_id=pk, modelo_moto_id=request.data.get('modelo_moto')
        ).exists():
            return Response({'success': False, 'message': 'Esta compatibilidad ya existe.'},
                            status=status.HTTP_400_BAD_REQUEST)
        s = CompatibilidadSerializer(data=data)
        if s.is_valid():
            s.save(producto=producto)
            return Response({'success': True, 'data': s.data}, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)


class CompatibilidadDetailView(APIView):
    """DELETE /api/inventory/products/<pk>/compatibility/<compat_id>/"""
    permission_classes = [IsAdministratorOrWorker]

    def delete(self, request, pk, compat_id):
        try:
            c = CompatibilidadPieza.objects.get(pk=compat_id, producto_id=pk)
            c.delete()
            return Response({'success': True, 'message': 'Compatibilidad eliminada'})
        except CompatibilidadPieza.DoesNotExist:
            return _not_found('Compatibilidad')


# ─────────────────────────────────────────────
#  STOCK
# ─────────────────────────────────────────────

class StockBySedeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sede_id = request.query_params.get('sede_id', '').strip()
        if not sede_id:
            return Response({'success': False, 'message': 'sede_id es requerido'},
                            status=status.HTTP_400_BAD_REQUEST)
        qs = Stock.objects.filter(sede_id=sede_id).select_related('producto', 'sede')
        return Response({'success': True, 'data': StockSerializer(qs, many=True).data})


class StockUpdateView(APIView):
    permission_classes = [IsAdministratorOrWorker]

    def put(self, request, pk):
        try:
            stock = Stock.objects.get(pk=pk)
        except Stock.DoesNotExist:
            return _not_found('Stock')
        s = StockUpdateSerializer(stock, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response({'success': True, 'message': 'Stock actualizado',
                             'data': StockSerializer(stock).data})
        return Response({'success': False, 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
#  ENTRADAS DE INVENTARIO
# ─────────────────────────────────────────────

class EntradaInventarioListCreateView(APIView):
    def get_permissions(self):
        return [IsAdministratorOrWorker()] if self.request.method == 'POST' else [IsAuthenticated()]

    def get(self, request):
        qs = EntradaInventario.objects.select_related('producto', 'sede', 'created_by')
        producto_id = request.query_params.get('producto_id', '').strip()
        sede_id     = request.query_params.get('sede_id', '').strip()
        if producto_id:
            qs = qs.filter(producto_id=producto_id)
        if sede_id:
            qs = qs.filter(sede_id=sede_id)
        result = _paginate(qs, request)
        return Response({'success': True, 'data': {
            'entries':    EntradaInventarioSerializer(result['queryset'], many=True).data,
            'pagination': result['pagination'],
        }})

    def post(self, request):
        s = EntradaInventarioSerializer(data=request.data, context={'request': request})
        if s.is_valid():
            entrada = s.save(created_by=request.user)
            return Response({'success': True, 'message': 'Entrada de inventario registrada',
                             'data': EntradaInventarioSerializer(entrada).data},
                            status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
#  AUDITORIAS DE INVENTARIO
# ─────────────────────────────────────────────

class AuditoriaListCreateView(APIView):
    def get_permissions(self):
        return [IsAdministratorOrWorker()] if self.request.method == 'POST' else [IsAuthenticated()]

    def get(self, request):
        qs = AuditoriaInventario.objects.select_related('sede', 'created_by')
        sede_id       = request.query_params.get('sede_id', '').strip()
        status_filter = request.query_params.get('status', '').strip()
        if sede_id:
            qs = qs.filter(sede_id=sede_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        result = _paginate(qs, request)
        return Response({'success': True, 'data': {
            'audits':     AuditoriaInventarioSerializer(result['queryset'], many=True).data,
            'pagination': result['pagination'],
        }})

    def post(self, request):
        s = AuditoriaCreateSerializer(data=request.data, context={'request': request})
        if s.is_valid():
            auditoria = s.save()
            return Response({'success': True, 'message': 'Auditoría creada',
                             'data': AuditoriaInventarioSerializer(auditoria).data},
                            status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)


class AuditoriaDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return AuditoriaInventario.objects.prefetch_related(
                'items__producto'
            ).select_related('sede', 'created_by').get(pk=pk)
        except AuditoriaInventario.DoesNotExist:
            return None

    def get(self, request, pk):
        audit = self._get(pk)
        return Response({'success': True, 'data': AuditoriaInventarioSerializer(audit).data}) if audit else _not_found('Auditoría')


class AuditoriaItemUpdateView(APIView):
    permission_classes = [IsAdministratorOrWorker]

    def patch(self, request, audit_id, item_id):
        try:
            item = AuditoriaItem.objects.select_related('auditoria').get(
                pk=item_id, auditoria_id=audit_id
            )
        except AuditoriaItem.DoesNotExist:
            return _not_found('Ítem de auditoría')

        if item.auditoria.status == AuditoriaInventario.Status.FINALIZADA:
            return Response({'success': False, 'message': 'La auditoría ya está finalizada.'},
                            status=status.HTTP_400_BAD_REQUEST)

        stock_fisico = request.data.get('stock_fisico')
        if stock_fisico is None or not isinstance(stock_fisico, int) or stock_fisico < 0:
            return Response({'success': False, 'message': 'stock_fisico debe ser un entero >= 0'},
                            status=status.HTTP_400_BAD_REQUEST)

        item.stock_fisico = stock_fisico
        item.save()
        return Response({'success': True, 'data': AuditoriaItemSerializer(item).data})


class AuditoriaFinalizeView(APIView):
    permission_classes = [IsAdministratorOrWorker]

    @transaction.atomic
    def post(self, request, pk):
        try:
            audit = AuditoriaInventario.objects.prefetch_related(
                'items__producto'
            ).select_for_update().get(pk=pk)
        except AuditoriaInventario.DoesNotExist:
            return _not_found('Auditoría')

        if audit.status == AuditoriaInventario.Status.FINALIZADA:
            return Response({'success': False, 'message': 'La auditoría ya está finalizada.'},
                            status=status.HTTP_400_BAD_REQUEST)

        pending = audit.items.filter(stock_fisico__isnull=True).count()
        if pending:
            return Response({'success': False,
                             'message': f'Hay {pending} productos sin conteo físico.'},
                            status=status.HTTP_400_BAD_REQUEST)

        for item in audit.items.all():
            Stock.objects.filter(producto=item.producto, sede=audit.sede).update(quantity=item.stock_fisico)

        audit.status = AuditoriaInventario.Status.FINALIZADA
        audit.save()
        return Response({'success': True, 'message': 'Auditoría finalizada. Stock ajustado.',
                         'data': AuditoriaInventarioSerializer(audit).data})
