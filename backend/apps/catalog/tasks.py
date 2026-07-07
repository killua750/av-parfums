"""Image post-processing (Celery + Pillow): responsive variants for gallery
images so the frontend never ships multi-MB originals."""

import io
from pathlib import Path

from celery import shared_task
from django.core.files.base import ContentFile
from PIL import Image

VARIANTS = {"image_md": 800, "image_sm": 400}


@shared_task
def generate_image_variants(product_image_id: int) -> None:
    from apps.catalog.models import ProductImage

    try:
        pi = ProductImage.objects.get(pk=product_image_id)
    except ProductImage.DoesNotExist:
        return

    with pi.image.open("rb") as f:
        original = Image.open(f)
        original.load()

    if original.mode in ("RGBA", "P"):
        fmt, ext = "PNG", "png"
    else:
        fmt, ext = "JPEG", "jpg"

    stem = Path(pi.image.name).stem
    update_fields = []
    for field, width in VARIANTS.items():
        if original.width <= width:
            continue
        ratio = width / original.width
        resized = original.resize((width, int(original.height * ratio)), Image.LANCZOS)
        buf = io.BytesIO()
        resized.save(buf, format=fmt, quality=85, optimize=True)
        getattr(pi, field).save(f"{stem}_{width}w.{ext}", ContentFile(buf.getvalue()), save=False)
        update_fields.append(field)

    if update_fields:
        pi.save(update_fields=update_fields)
