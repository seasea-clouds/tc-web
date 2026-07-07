/** Safely parse a D1 date string (ISO with T or SQLite with space separator). */
export function safeDate(d: string | null | undefined): string {
  if (!d) return "—";
  const normalized = d.includes("T") ? d : d.replace(" ", "T") + "Z";
  const dt = new Date(normalized);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("zh-CN");
}

export function safeDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  const normalized = d.includes("T") ? d : d.replace(" ", "T") + "Z";
  const dt = new Date(normalized);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("zh-CN");
}
