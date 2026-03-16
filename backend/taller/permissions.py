from rest_framework.permissions import BasePermission


class IsJefeMecanicoOrAbove(BasePermission):
    """JEFE_MECANICO, ENCARGADO y ADMINISTRATOR."""
    ALLOWED = {'JEFE_MECANICO', 'ENCARGADO', 'ADMINISTRATOR'}
    message = 'Se requiere rol Jefe de Mecánicos o superior.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in self.ALLOWED
        )


class IsMecanicoOrAbove(BasePermission):
    """MECANICO, JEFE_MECANICO, ENCARGADO y ADMINISTRATOR."""
    ALLOWED = {'MECANICO', 'JEFE_MECANICO', 'ENCARGADO', 'ADMINISTRATOR'}
    message = 'Se requiere rol Mecánico o superior.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in self.ALLOWED
        )


class IsCajeroOrAbove(BasePermission):
    """CASHIER, ENCARGADO y ADMINISTRATOR (para gestión de servicios en caja)."""
    ALLOWED = {'CASHIER', 'ENCARGADO', 'ADMINISTRATOR'}
    message = 'Se requiere rol Cajero o superior.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in self.ALLOWED
        )


class IsTallerStaff(BasePermission):
    """Cualquier usuario del taller: mecánicos, jefes, cajeros, encargados y admin."""
    ALLOWED = {'MECANICO', 'JEFE_MECANICO', 'CASHIER', 'ENCARGADO', 'ADMINISTRATOR'}
    message = 'Se requiere ser parte del personal del taller.'

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in self.ALLOWED
        )
