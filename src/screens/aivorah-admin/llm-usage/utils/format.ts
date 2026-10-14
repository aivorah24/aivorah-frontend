const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmtInt = (n: number) => Math.round(n || 0).toLocaleString('en-US');

export function fmtCompact(n: number): string {
  const v = Math.abs(n || 0);
  if (v >= 1e6) return `${+(n / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${+(n / 1e3).toFixed(1)}K`;
  return `${Math.round(n || 0)}`;
}

// Small per-day costs need more decimals than dollar totals to stay readable.
export function fmtCost(n: number): string {
  const v = n || 0;
  if (v === 0) return '$0';
  if (v < 0.01) return `$${v.toFixed(4)}`;
  if (v < 1) return `$${v.toFixed(3)}`;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms || 0)}ms`);

// "2026-10-06" → "Oct 6" (date-only strings, no timezone shift).
export function fmtDay(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[(m || 1) - 1]} ${d}`;
}

export function fmtTime(isoTs: string): string {
  const d = new Date(isoTs);
  const hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${hh % 12 || 12}:${mm} ${hh < 12 ? 'am' : 'pm'}`;
}

// Change vs the previous window; "new" when there was nothing before.
export function delta(current: number, previous: number): { text: string; dir: 'up' | 'down' | 'flat' } {
  if (!previous && !current) return { text: '—', dir: 'flat' };
  if (!previous) return { text: 'new', dir: 'up' };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return { text: '0%', dir: 'flat' };
  return { text: `${pct > 0 ? '+' : ''}${pct.toFixed(Math.abs(pct) < 10 ? 1 : 0)}%`, dir: pct > 0 ? 'up' : 'down' };
}
