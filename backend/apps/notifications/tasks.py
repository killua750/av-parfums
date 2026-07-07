import structlog
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

logger = structlog.get_logger(__name__)


@shared_task
def send_order_confirmation(order_id: int) -> None:
    from apps.orders.models import Order

    try:
        order = Order.objects.select_related("shipping_address__wilaya").get(pk=order_id)
    except Order.DoesNotExist:
        logger.warning("order_confirmation.missing_order", order_id=order_id)
        return

    addr = order.shipping_address
    lines = [
        f"Commande {order.number}",
        f"Client: {addr.full_name} — {addr.phone}",
        f"Livraison: {addr.address}, {addr.commune}, {addr.wilaya}",
        "",
        *(
            f"  {item.product_name} ({item.variant_size}) × {item.quantity} "
            f"= {item.unit_price * item.quantity} DA"
            for item in order.items.all()
        ),
        "",
        f"Total: {order.total} DA (paiement à la livraison)",
    ]
    body = "\n".join(lines)

    recipients = [
        email
        for email in (order.user.email if order.user else None, settings.ORDER_NOTIFICATION_EMAIL)
        if email
    ]
    if recipients:
        send_mail(
            subject=f"AV Parfums — commande {order.number} reçue",
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=True,
        )
    logger.info("order_confirmation.sent", order=order.number, recipients=recipients)


@shared_task
def notify_low_stock(variant_id: int) -> None:
    from apps.catalog.models import ProductVariant

    try:
        variant = ProductVariant.objects.select_related("product").get(pk=variant_id)
    except ProductVariant.DoesNotExist:
        return

    logger.warning(
        "stock.low", product=variant.product.name, size=variant.size, stock=variant.stock
    )
    if settings.ORDER_NOTIFICATION_EMAIL:
        send_mail(
            subject=f"⚠ Stock bas: {variant.product.name} ({variant.size})",
            message=(
                f"Il ne reste que {variant.stock} unité(s) de "
                f"{variant.product.name} ({variant.size}, SKU {variant.sku})."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.ORDER_NOTIFICATION_EMAIL],
            fail_silently=True,
        )
