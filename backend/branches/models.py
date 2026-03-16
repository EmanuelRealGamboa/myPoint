"""
Sede (Branch) model for MotoQFox multi-branch support
"""
from django.db import models


class Sede(models.Model):
    """
    Represents a physical branch/location of MotoQFox.
    Workers and cashiers are assigned to a specific sede.
    Administrators have access to all sedes.
    """
    name = models.CharField(
        verbose_name='Nombre',
        max_length=100
    )
    address = models.CharField(
        verbose_name='Dirección',
        max_length=255
    )
    phone = models.CharField(
        verbose_name='Teléfono',
        max_length=20,
        blank=True,
        default=''
    )
    is_active = models.BooleanField(
        verbose_name='Activa',
        default=True
    )
    created_at = models.DateTimeField(
        verbose_name='Fecha de creación',
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        verbose_name='Fecha de actualización',
        auto_now=True
    )

    class Meta:
        verbose_name = 'Sede'
        verbose_name_plural = 'Sedes'
        db_table = 'branches_sedes'
        ordering = ['name']

    def __str__(self):
        return self.name
