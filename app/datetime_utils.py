from datetime import datetime, timezone


def utc_now_iso() -> str:
    """UTC timestamp with explicit offset for clients (e.g. 2026-06-04T16:01:31+00:00)."""
    return datetime.now(timezone.utc).isoformat()


def normalize_db_timestamp(value: str | None) -> str | None:
    """
    SQLite datetime('now') stores UTC without a timezone suffix.
    Normalize to ISO-8601 with +00:00 so browsers parse correctly.
    """
    if value is None:
        return None
    s = value.strip()
    if not s:
        return None
    if s.endswith("Z") or "+" in s[10:] or "-" in s[10:]:
        return s
    if "T" not in s:
        s = s.replace(" ", "T", 1)
    return f"{s}+00:00"
