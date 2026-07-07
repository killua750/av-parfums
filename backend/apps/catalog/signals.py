from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.catalog.models import ProductImage
from apps.catalog.tasks import generate_image_variants


@receiver(post_save, sender=ProductImage)
def queue_image_variants(sender, instance: ProductImage, created: bool, **kwargs) -> None:
    if created and instance.image:
        generate_image_variants.delay(instance.pk)
