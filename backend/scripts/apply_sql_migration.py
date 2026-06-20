from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


def resolve_db_url(cli_value: str | None) -> str | None:
    if cli_value:
        return cli_value

    for key in ("DATABASE_URL", "SUPABASE_DB_URL", "DB_URL", "POSTGRES_URL"):
        value = os.getenv(key)
        if value:
            return value

    return None


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Apply a SQL migration file to the configured PostgreSQL database using psql."
    )
    parser.add_argument(
        "--file",
        required=True,
        help="Path to the .sql migration file to apply.",
    )
    parser.add_argument(
        "--db-url",
        help="Explicit PostgreSQL connection string. Falls back to DATABASE_URL/SUPABASE_DB_URL/DB_URL/POSTGRES_URL.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    migration_path = Path(args.file).expanduser().resolve()
    if not migration_path.exists():
        print(f"Migration file not found: {migration_path}", file=sys.stderr)
        return 1

    db_url = resolve_db_url(args.db_url)
    if not db_url:
        print(
            "No database URL found. Set DATABASE_URL (or SUPABASE_DB_URL/DB_URL/POSTGRES_URL) "
            "or pass --db-url.",
            file=sys.stderr,
        )
        return 1

    psql_path = shutil.which("psql")
    if not psql_path:
        print("psql is not installed or not on PATH.", file=sys.stderr)
        return 1

    command = [
        psql_path,
        db_url,
        "-v",
        "ON_ERROR_STOP=1",
        "-f",
        str(migration_path),
    ]

    print(f"Applying migration: {migration_path}")
    completed = subprocess.run(command, check=False)
    if completed.returncode != 0:
        print("Migration failed.", file=sys.stderr)
        return completed.returncode

    print("Migration applied successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
