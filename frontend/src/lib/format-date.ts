/**
 * Parse timestamps from the API. SQLite legacy rows may be UTC without a
 * timezone suffix; ISO strings with +00:00 or Z are parsed as UTC.
 */
export function parseStoredUtc(value: string): Date {
  const trimmed = value.trim();
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  const normalized = trimmed.includes("T")
    ? trimmed
    : trimmed.replace(" ", "T");
  return new Date(`${normalized}Z`);
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return parseStoredUtc(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    });
  } catch {
    return value;
  }
}
