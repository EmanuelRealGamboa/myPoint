"""
Taller URL Configuration — MotoQFox
"""
from django.urls import path
from . import views

urlpatterns = [
    # ── Motos del cliente ─────────────────────────────────────────────────────
    path('motos-cliente/',       views.MotoClienteListView.as_view(),   name='moto-cliente-list'),
    path('motos-cliente/<int:pk>/', views.MotoClienteDetailView.as_view(), name='moto-cliente-detail'),

    # ── Órdenes de servicio ───────────────────────────────────────────────────
    path('servicios/',           views.ServicioListView.as_view(),      name='servicio-list'),
    path('servicios/<int:pk>/',  views.ServicioDetailView.as_view(),    name='servicio-detail'),

    # Transiciones de estado
    path('servicios/<int:pk>/asignar/',  views.AsignarMecanicoView.as_view(),  name='servicio-asignar'),
    path('servicios/<int:pk>/listo/',    views.MarcarListoView.as_view(),      name='servicio-listo'),
    path('servicios/<int:pk>/entregar/', views.EntregarServicioView.as_view(), name='servicio-entregar'),

    # Búsqueda por QR del cliente
    path('servicios/por-qr/<uuid:token>/', views.ServicioPorQRView.as_view(), name='servicio-por-qr'),

    # ── Solicitudes de refacción extra ────────────────────────────────────────
    path('solicitudes-extra/',              views.SolicitudRefaccionExtraListView.as_view(), name='solicitud-extra-list'),
    path('solicitudes-extra/<int:pk>/aprobar/',  views.AprobarSolicitudView.as_view(),  name='solicitud-extra-aprobar'),
    path('solicitudes-extra/<int:pk>/rechazar/', views.RechazarSolicitudView.as_view(), name='solicitud-extra-rechazar'),

    # ── App cliente ───────────────────────────────────────────────────────────
    path('mis-servicios/',          views.MisServiciosView.as_view(),      name='mis-servicios'),
    path('mis-servicios/<int:pk>/', views.MiServicioDetailView.as_view(),  name='mi-servicio-detail'),
]
