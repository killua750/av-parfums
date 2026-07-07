"""Server-side authorization. Client-side role checks are cosmetic only —
every privileged endpoint must be guarded by one of these classes."""

from rest_framework.permissions import SAFE_METHODS, BasePermission


def _is_admin(user) -> bool:
    return bool(
        user and user.is_authenticated and (user.is_staff or getattr(user, "role", "") == "admin")
    )


class IsAdmin(BasePermission):
    def has_permission(self, request, view) -> bool:
        return _is_admin(request.user)


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view) -> bool:
        return request.method in SAFE_METHODS or _is_admin(request.user)


class IsOwnerOrAdmin(BasePermission):
    """Object-level: the object's `user` must be the requester (or admin)."""

    def has_object_permission(self, request, view, obj) -> bool:
        if _is_admin(request.user):
            return True
        owner = getattr(obj, "user", None)
        return owner is not None and owner == request.user
