from django.urls import path
from .views import PedidosListView, PedidoDetailView

urlpatterns = [
    path('',       PedidosListView.as_view()),
    path('<int:pk>/', PedidoDetailView.as_view()),
]
