from rest_framework.permissions import BasePermission


class IsCajeroOrAbove(BasePermission):
    """CASHIER, ENCARGADO, and ADMINISTRATOR can register sales."""
    ALLOWED = {'CASHIER', 'ENCARGADO', 'ADMINISTRATOR'}

    message = 'No tienes permisos para esta acción. Se requiere rol Cajero o superior.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in self.ALLOWED
        )


class IsAdministrator(BasePermission):
    """Only ADMINISTRATOR can access global sales reports."""
    message = 'Se requiere rol Administrador.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'ADMINISTRATOR'
        )


class IsEncargadoOrAbove(BasePermission):
    """ENCARGADO and ADMINISTRATOR can manage cash registers and generate codes."""
    ALLOWED = {'ENCARGADO', 'ADMINISTRATOR'}

    message = 'No tienes permisos para esta acción. Se requiere rol Encargado o superior.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in self.ALLOWED
        )
