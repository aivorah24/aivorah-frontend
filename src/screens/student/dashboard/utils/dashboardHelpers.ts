export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function parseDateOnly(v: string): Date | null {
  const p = v.split('-').map(Number);
  if (p.length !== 3 || p.some(isNaN)) return null;
  return new Date(p[0], p[1] - 1, p[2]);
}

export function isDueToday(v: string) {
  const d = parseDateOnly(v); if (!d) return false;
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export function formatDeadline(v: string) {
  if (isDueToday(v)) return 'Due Today';
  const d = parseDateOnly(v);
  return d ? `Due ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : v;
}

export function normalizeSearchText(v: string) {
  return (v || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
