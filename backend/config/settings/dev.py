from .base import *  # noqa
from .base import env

DEBUG = True

# No worker needed on bare metal: tasks run inline unless the env says otherwise.
CELERY_TASK_ALWAYS_EAGER = env("CELERY_TASK_ALWAYS_EAGER", default=True)

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Manifest storage requires collectstatic; plain storage is friendlier in dev.
STORAGES["staticfiles"] = {  # noqa: F405
    "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
}
