from django.contrib import admin
from .models import Categoria, Producto, Stock, EntradaInventario, AuditoriaInventario, AuditoriaItem


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name',)


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('sku', 'name', 'price', 'cost', 'categoria', 'is_active')
    list_filter = ('is_active', 'categoria')
    search_fields = ('sku', 'name')


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ('producto', 'sede', 'quantity', 'min_quantity', 'updated_at')
    list_filter = ('sede',)


@admin.register(EntradaInventario)
class EntradaInventarioAdmin(admin.ModelAdmin):
    list_display = ('producto', 'sede', 'quantity', 'cost_unit', 'created_by', 'created_at')
    list_filter = ('sede',)
    readonly_fields = ('created_at',)


@admin.register(AuditoriaInventario)
class AuditoriaInventarioAdmin(admin.ModelAdmin):
    list_display = ('sede', 'fecha', 'status', 'created_by', 'created_at')
    list_filter = ('sede', 'status')


@admin.register(AuditoriaItem)
class AuditoriaItemAdmin(admin.ModelAdmin):
    list_display = ('auditoria', 'producto', 'stock_sistema', 'stock_fisico')
