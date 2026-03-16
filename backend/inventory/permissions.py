from rest_framework.permissions import BasePermission


class IsAdministrator(BasePermission):
    """Allow access only to users with role ADMINISTRATOR."""
    message = 'No tienes permisos para esta acción. Se requiere rol Administrador.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_administrator)


class IsEncargado(BasePermission):
    """Allow access only to users with role ENCARGADO."""
    message = 'No tienes permisos para esta acción. Se requiere rol Encargado de Sede.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_encargado)


class IsAdministratorOrEncargado(BasePermission):
    """Allow access to ADMINISTRATOR and ENCARGADO roles."""
    message = 'No tienes permisos para esta acción. Se requiere rol Administrador o Encargado.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_administrator or request.user.is_encargado)
        )


class IsAdministratorOrWorker(BasePermission):
    """Allow access to ADMINISTRATOR, ENCARGADO, and WORKER roles."""
    message = 'No tienes permisos para esta acción.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_administrator or request.user.is_encargado or request.user.is_worker)
        )
