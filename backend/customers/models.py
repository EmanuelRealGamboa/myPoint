"""
Customers Models — MotoQFox
============================
ClienteProfile — extends CustomUser (role=CUSTOMER) with loyalty & QR data
"""
import uuid
from django.db import models


class ClienteProfile(models.Model):
    """
    One-to-one extension of CustomUser (role=CUSTOMER).
    Stores contact info, QR token and loyalty points.
    """
    usuario     = models.OneToOneField(
        'users.CustomUser', on_delete=models.PROTECT,
        related_name='cliente_profile', verbose_name='Usuario'
    )
    telefono    = models.CharField(max_length=20, blank=True, default='', verbose_name='Teléfono')
    fecha_nac   = models.DateField(null=True, blank=True, verbose_name='Fecha de nacimiento')
    qr_token    = models.UUIDField(default=uuid.uuid4, unique=True, verbose_name='Token QR')
    foto_url    = models.CharField(max_length=500, blank=True, default='', verbose_name='URL de foto')
    puntos      = models.PositiveIntegerField(default=0, verbose_name='Puntos acumulados')
    created_at  = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de registro')

    class Meta:
        db_table = 'customers_perfiles'
        ordering = ['-created_at']
        verbose_name = 'Perfil de cliente'
        verbose_name_plural = 'Perfiles de clientes'

    def __str__(self):
        return f'{self.usuario.get_full_name()} — {self.puntos} pts'
