from django.contrib import admin
from .models import Sede


@admin.register(Sede)
class SedeAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'phone', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'address')
    ordering = ('name',)
