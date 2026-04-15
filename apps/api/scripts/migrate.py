"""Run SQL migrations in order against the database."""

import asyncio
import os
import sys
from pathlib import Path

import asyncpg

MIGRATIONS_DIR = Path(__file__).parent.parent / "migrations"


async def run_migrations():
    database_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://togglebit:togglebit@localhost:5432/togglebit",
    )

    conn = await asyncpg.connect(database_url)

    try:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS _migrations (
                filename TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)

        applied = {
            row["filename"]
            for row in await conn.fetch("SELECT filename FROM _migrations")
        }

        migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))

        for migration_file in migration_files:
            if migration_file.name in applied:
                continue

            sql = migration_file.read_text()
            print(f"Applying {migration_file.name}...")

            async with conn.transaction():
                await conn.execute(sql)
                await conn.execute(
                    "INSERT INTO _migrations (filename) VALUES ($1)",
                    migration_file.name,
                )

            print(f"  Done.")

        print(f"Migrations complete. {len(migration_files) - len(applied)} new applied.")

    finally:
        await conn.close()


if __name__ == "__main__":
    try:
        asyncio.run(run_migrations())
    except Exception as e:
        print(f"Migration failed: {e}", file=sys.stderr)
        sys.exit(1)
