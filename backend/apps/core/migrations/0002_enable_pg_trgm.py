"""Enable pg_trgm for fuzzy product search. No-op on non-PostgreSQL engines
(bare-metal SQLite dev), so the migration graph stays portable."""

from django.db import migrations


def enable_pg_trgm(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")


class Migration(migrations.Migration):
    dependencies = [("core", "0001_initial")]

    operations = [migrations.RunPython(enable_pg_trgm, migrations.RunPython.noop)]
