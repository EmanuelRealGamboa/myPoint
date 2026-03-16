from django.urls import path
from .views import (
    RegistroClienteView,
    MiPerfilView,
    MiQRView,
    MisComprasView,
    BuscarClienteView,
    ClientePorQRView,
)

urlpatterns = [
    path('registro/',          RegistroClienteView.as_view()),
    path('perfil/',            MiPerfilView.as_view()),
    path('mi-qr/',             MiQRView.as_view()),
    path('mis-compras/',       MisComprasView.as_view()),
    path('buscar/',            BuscarClienteView.as_view()),
    path('por-qr/<uuid:token>/', ClientePorQRView.as_view()),
]
