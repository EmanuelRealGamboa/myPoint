"""
URL Configuration for Sales
"""
from django.urls import path
from .views import (
    VentaListCreateView, VentaDetailView, VentaCancelarView,
    GenerarCodigoView, AbrirCajaView, MiEstadoCajaView,
    CerrarCajaView, CajasActivasView, AdminResumenView, ReportesView,
    ReportesCajaListView, ReporteCajaDownloadView,
)

app_name = 'sales'

urlpatterns = [
    # Ventas
    path('ventas/',                             VentaListCreateView.as_view(),      name='venta_list_create'),
    path('ventas/<int:pk>/',                    VentaDetailView.as_view(),          name='venta_detail'),
    path('ventas/<int:pk>/cancelar/',           VentaCancelarView.as_view(),        name='venta_cancelar'),

    # Apertura de caja
    path('cajas/generar-codigo/',               GenerarCodigoView.as_view(),        name='caja_generar_codigo'),
    path('cajas/abrir/',                        AbrirCajaView.as_view(),            name='caja_abrir'),
    path('cajas/mi-estado/',                    MiEstadoCajaView.as_view(),         name='caja_mi_estado'),
    path('cajas/<int:pk>/cerrar/',              CerrarCajaView.as_view(),           name='caja_cerrar'),
    path('cajas/activas/',                      CajasActivasView.as_view(),         name='caja_activas'),

    # Admin resumen
    path('admin/resumen/',                      AdminResumenView.as_view(),         name='admin_resumen'),

    # Reportes analíticos (charts/KPIs)
    path('reportes/',                           ReportesView.as_view(),             name='reportes'),

    # Reportes de cierre de caja (PDF)
    path('reportes-caja/',                      ReportesCajaListView.as_view(),     name='reportes_caja_list'),
    path('reportes-caja/<int:pk>/descargar/',   ReporteCajaDownloadView.as_view(),  name='reporte_caja_download'),
]
