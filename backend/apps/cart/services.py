from django.db import transaction
from django.db.models import F
from django.http import HttpRequest

from apps.cart.models import Cart, CartItem


def get_or_create_cart(request: HttpRequest) -> Cart:
    """Resolve the caller's cart.

    Authenticated → the user's cart (merging any pending guest cart from the
    same session). Anonymous → a session-keyed cart.
    """
    if request.user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(user=request.user)
        session_key = request.session.session_key
        if session_key:
            guest = Cart.objects.filter(session_key=session_key, user__isnull=True).first()
            if guest:
                merge_carts(source=guest, target=cart)
        return cart

    if not request.session.session_key:
        request.session.create()
    cart, _ = Cart.objects.get_or_create(
        session_key=request.session.session_key,
        user__isnull=True,
        defaults={"session_key": request.session.session_key},
    )
    return cart


@transaction.atomic
def merge_carts(source: Cart, target: Cart) -> None:
    """Fold a guest cart into the user's cart, summing quantities on conflict."""
    for item in source.items.select_related("variant"):
        existing = target.items.filter(variant=item.variant).first()
        if existing:
            existing.quantity = F("quantity") + item.quantity
            existing.save(update_fields=["quantity"])
        else:
            CartItem.objects.create(cart=target, variant=item.variant, quantity=item.quantity)
    source.delete()
