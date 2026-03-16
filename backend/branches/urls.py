"""
URL Configuration for Branches (Sedes)
"""
from django.urls import path
from .views import SedeListCreateView, SedeDetailView, SedeSummaryView

app_name = 'branches'

urlpatterns = [
    path('',                  SedeListCreateView.as_view(), name='sede_list_create'),
    path('<int:pk>/',         SedeDetailView.as_view(),     name='sede_detail'),
    path('<int:pk>/summary/', SedeSummaryView.as_view(),    name='sede_summary'),
]
