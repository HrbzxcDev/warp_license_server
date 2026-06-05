#!/usr/bin/env python3
"""
One-time migration: copy licenses from local SQLite (licenses.db) to Neon Postgres.

Usage (from backend/, with DATABASE_URL in .env):
  .\\venv\\Scripts\\python.exe scripts/migrate_sqlite_to_neon.py
  .\\venv\\Scripts\\python.exe scripts/migrate_sqlite_to_neon.py --sqlite-path ./licenses.db
"""

from __future__ import annotations

import argparse
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

# Run from repo root
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import get_database_url  # noqa: E402
from app.models.license import Base, License  # noqa: E402


def parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    s = value.strip()
    if "T" in s or "+" in s[10:] or s.endswith("Z"):
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    # Legacy SQLite UTC naive: "YYYY-MM-DD HH:MM:SS"
    dt = datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S")
    return dt.replace(tzinfo=timezone.utc)


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate SQLite licenses to Neon Postgres")
    parser.add_argument(
        "--sqlite-path",
        default=os.getenv("SQLITE_PATH", "licenses.db"),
        help="Path to SQLite database file",
    )
    args = parser.parse_args()

    backend_dir = Path(__file__).resolve().parents[1]
    load_dotenv(backend_dir / ".env")

    sqlite_path = Path(args.sqlite_path)
    if not sqlite_path.exists():
        raise SystemExit(f"SQLite file not found: {sqlite_path}")

    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM licenses ORDER BY id").fetchall()
    conn.close()

    try:
        database_url = get_database_url()
    except RuntimeError:
        raise SystemExit("DATABASE_URL is required in backend/.env") from None

    engine = create_engine(database_url)
    Base.metadata.create_all(engine)

    inserted = 0
    skipped = 0

    with Session(engine) as session:
        for row in rows:
            key = row["license_key"]
            exists = session.scalar(select(License.id).where(License.license_key == key))
            if exists:
                skipped += 1
                continue

            session.add(
                License(
                    license_key=key,
                    product=row["product"] or "default",
                    status=row["status"] or "inactive",
                    machine_id=row["machine_id"],
                    activated_at=parse_timestamp(row["activated_at"]),
                    created_at=parse_timestamp(row["created_at"])
                    or datetime.now(timezone.utc),
                    notes=row["notes"],
                )
            )
            inserted += 1

        session.commit()

    print(f"Done. Inserted: {inserted}, skipped (duplicate): {skipped}")


if __name__ == "__main__":
    main()
