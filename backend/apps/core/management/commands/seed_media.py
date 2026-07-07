"""Copy the tracked seed images (backend/seed_media/) into MEDIA_ROOT so the
product fixture's image paths resolve on a fresh checkout or container.
Existing files are never overwritten — admin uploads always win."""

import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

SEED_DIR = Path(settings.BASE_DIR) / "seed_media"


class Command(BaseCommand):
    help = "Copy bundled seed images into MEDIA_ROOT (skips existing files)."

    def handle(self, *args, **options):
        if not SEED_DIR.exists():
            self.stdout.write("No seed_media directory; nothing to do.")
            return
        media_root = Path(settings.MEDIA_ROOT)
        copied = 0
        for src in SEED_DIR.rglob("*"):
            if not src.is_file():
                continue
            dest = media_root / src.relative_to(SEED_DIR)
            if dest.exists():
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)
            copied += 1
        self.stdout.write(self.style.SUCCESS(f"Seed media: {copied} file(s) copied."))
