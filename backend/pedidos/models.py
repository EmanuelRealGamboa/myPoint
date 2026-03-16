"""
Pedidos de Bodega — MotoQFox
==============================
PedidoBodega     — solicitud de una cajera hacia bodega
PedidoBodegaItem — líneas del pedido (producto + cantidad + ubicación snapshot)
"""
from django.db import models


class PedidoBodega(models.Model):

    class Status(models.TextChoices):
        PENDIENTE  = 'PENDIENTE',  'Pendiente'
        ENTREGADO  = 'ENTREGADO',  'Entregado'
        CANCELADO  = 'CANCELADO',  'Cancelado'

    sede      = models.ForeignKey(
        'branches.Sede', on_delete=models.PROTECT,
        related_name='pedidos_bodega', verbose_name='Sede'
    )
    cajero    = models.ForeignKey(
        'users.CustomUser', on_delete=models.PROTECT,
        related_name='pedidos_creados', verbose_name='Cajero'
    )
    notas     = models.CharField(max_length=300, blank=True, default='', verbose_name='Notas')
    status    = models.CharField(
        max_length=20, choices=Status.choices,
        default=Status.PENDIENTE, verbose_name='Estado'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado')

    class Meta:
        db_table = 'pedidos_bodega'
        ordering = ['-created_at']
        verbose_name = 'Pedido de Bodega'
        verbose_name_plural = 'Pedidos de Bodega'

    def __str__(self):
        return f'Pedido #{self.id} — {self.sede.name} [{self.status}]'


class PedidoBodegaItem(models.Model):
    pedido    = models.ForeignKey(
        PedidoBodega, on_delete=models.CASCADE,
        related_name='items', verbose_name='Pedido'
    )
    producto  = models.ForeignKey(
        'inventory.Producto', on_delete=models.PROTECT,
        related_name='pedido_items', verbose_name='Producto'
    )
    cantidad  = models.PositiveIntegerField(verbose_name='Cantidad')
    # Snapshot de la ubicación al momento de crear el pedido
    ubicacion = models.CharField(max_length=100, blank=True, default='', verbose_name='Ubicación en almacén')

    class Meta:
        db_table = 'pedidos_bodega_items'
        verbose_name = 'Ítem de Pedido'
        verbose_name_plural = 'Ítems de Pedido'

    def __str__(self):
        return f'[Pedido #{self.pedido_id}] {self.producto.sku} ×{self.cantidad}'
