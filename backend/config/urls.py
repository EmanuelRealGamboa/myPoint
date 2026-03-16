"""
URL Configuration for MotoQFox POS System
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/branches/', include('branches.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/sales/',    include('sales.urls')),
    path('api/billing/',    include('billing.urls')),
    path('api/customers/',  include('customers.urls')),
    path('api/pedidos/',    include('pedidos.urls')),
    path('api/taller/',     include('taller.urls')),
]

# Serve uploaded media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
