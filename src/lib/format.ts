/** Small formatting helpers shared by the pages. */

export const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

/** Today as YYYY-MM-DD in the browser's local time (matches how dates are stored). */
export function todayISO(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function shortDate(iso: string): string {
  return new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function timeAgo(iso: string, now = Date.now()): string {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'Yesterday' : days < 30 ? `${days} days ago` : shortDate(iso);
}

/** '08:00:00' -> '08:00' */
export const hhmm = (t: string) => t.slice(0, 5);

/** The last `n` calendar months as { key: '2026-11', label: 'Nov' }, oldest first. */
export function lastMonths(n: number, from = new Date()) {
  const out: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString(undefined, { month: 'short' }) });
  }
  return out;
}
