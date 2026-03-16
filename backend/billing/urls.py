from django.urls import path
from .views import ConfigFiscalSedeView, ConfigFiscalListView

app_name = 'billing'

urlpatterns = [
    path('config/',              ConfigFiscalListView.as_view(),  name='config_list'),
    path('config/<int:sede_id>/', ConfigFiscalSedeView.as_view(), name='config_sede'),
]
