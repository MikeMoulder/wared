const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: string | undefined | null): s is string {
  if (!s || !ISO.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function todayIso(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// Local calendar day (YYYY-MM-DD) of an ISO timestamp.
export function localDay(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function formatWhen(iso: string, today: string): string {
  const day = localDay(iso);
  const n = daysBetween(today, day);
  const prefix = n === 0 ? "Today" : n === -1 ? "Yesterday" : n === 1 ? "Tomorrow" : formatDate(day);
  return `${prefix}, ${formatTime(iso)}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso + "T00:00:00Z");
  const b = Date.parse(toIso + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}

export function formatDate(iso: string): string {
  if (!isIsoDate(iso)) return "—";
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function countdownLabel(dueIso: string, today: string): { label: string; tone: "overdue" | "soon" | "ok" } {
  const n = daysBetween(today, dueIso);
  if (n < 0) return { label: `${-n}d overdue`, tone: "overdue" };
  if (n === 0) return { label: "Due today", tone: "overdue" };
  if (n <= 7) return { label: `${n}d left`, tone: "soon" };
  return { label: `${n}d left`, tone: "ok" };
}
