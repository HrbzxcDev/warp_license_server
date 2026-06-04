import sqlite3
import os

DB_PATH = os.getenv("DB_PATH", "licenses.db")


def get_connection() -> sqlite3.Connection:
    """Return a SQLite connection with row_factory set for dict-like access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they don't exist yet."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS licenses (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            license_key TEXT    NOT NULL UNIQUE,
            product     TEXT    NOT NULL DEFAULT 'default',
            status      TEXT    NOT NULL DEFAULT 'inactive',
            machine_id  TEXT,
            activated_at TEXT,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
            notes       TEXT
        )
    """)

    conn.commit()
    conn.close()
    print(f"[DB] Database ready at: {DB_PATH}")
