"""
URL Configuration for Inventory
"""
from django.urls import path
from .views import (
    CategoriaListCreateView, CategoriaDetailView,
    SubcategoriaListCreateView, SubcategoriaDetailView,
    MarcaFabricanteListCreateView, MarcaFabricanteDetailView,
    MarcaMotoListCreateView, MarcaMotoDetailView,
    ModeloMotoListCreateView, ModeloMotoDetailView,
    ProductoListCreateView, ProductoDetailView,
    ProductoImageUploadView,
    CompatibilidadListCreateView, CompatibilidadDetailView,
    StockBySedeView, StockUpdateView,
    EntradaInventarioListCreateView,
    AuditoriaListCreateView, AuditoriaDetailView,
    AuditoriaItemUpdateView, AuditoriaFinalizeView,
)

app_name = 'inventory'

urlpatterns = [
    # ── Categories (2 levels) ─────────────────────────────────────────────────
    path('categories/',              CategoriaListCreateView.as_view(),     name='category_list_create'),
    path('categories/<int:pk>/',     CategoriaDetailView.as_view(),         name='category_detail'),
    path('subcategories/',           SubcategoriaListCreateView.as_view(),  name='subcategory_list_create'),
    path('subcategories/<int:pk>/',  SubcategoriaDetailView.as_view(),      name='subcategory_detail'),

    # ── Manufacturer brands ───────────────────────────────────────────────────
    path('fabricante-brands/',           MarcaFabricanteListCreateView.as_view(), name='marca_fab_list_create'),
    path('fabricante-brands/<int:pk>/',  MarcaFabricanteDetailView.as_view(),     name='marca_fab_detail'),

    # ── Motorcycle catalog (for fitment) ──────────────────────────────────────
    path('moto-brands/',                 MarcaMotoListCreateView.as_view(),    name='marca_moto_list'),
    path('moto-brands/<int:pk>/',        MarcaMotoDetailView.as_view(),        name='marca_moto_detail'),
    path('moto-models/',                 ModeloMotoListCreateView.as_view(),   name='modelo_moto_list_create'),
    path('moto-models/<int:pk>/',        ModeloMotoDetailView.as_view(),       name='modelo_moto_detail'),

    # ── Products ──────────────────────────────────────────────────────────────
    path('products/',                    ProductoListCreateView.as_view(),     name='product_list_create'),
    path('products/<int:pk>/',           ProductoDetailView.as_view(),         name='product_detail'),
    path('products/<int:pk>/image/',     ProductoImageUploadView.as_view(),    name='product_image_upload'),

    # ── Product fitment (compatibility) ──────────────────────────────────────
    path('products/<int:pk>/compatibility/',
         CompatibilidadListCreateView.as_view(),  name='compatibility_list_create'),
    path('products/<int:pk>/compatibility/<int:compat_id>/',
         CompatibilidadDetailView.as_view(),       name='compatibility_detail'),

    # ── Stock ─────────────────────────────────────────────────────────────────
    path('stock/',           StockBySedeView.as_view(),   name='stock_by_sede'),
    path('stock/<int:pk>/', StockUpdateView.as_view(),    name='stock_update'),

    # ── Inventory entries ─────────────────────────────────────────────────────
    path('entries/',         EntradaInventarioListCreateView.as_view(), name='entry_list_create'),

    # ── Audits ────────────────────────────────────────────────────────────────
    path('audits/',                                       AuditoriaListCreateView.as_view(),  name='audit_list_create'),
    path('audits/<int:pk>/',                              AuditoriaDetailView.as_view(),       name='audit_detail'),
    path('audits/<int:audit_id>/items/<int:item_id>/',    AuditoriaItemUpdateView.as_view(),   name='audit_item_update'),
    path('audits/<int:pk>/finalize/',                     AuditoriaFinalizeView.as_view(),     name='audit_finalize'),
]
