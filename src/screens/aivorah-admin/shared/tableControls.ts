// Shared sort/search helpers for the Students/Teachers/Parents tables —
// plain client-side list ops (these datasets are already fully fetched, no
// server-side paging), kept generic so all three tables share one
// implementation instead of three copy-pasted ones.
export type SortDir = 'asc' | 'desc';
export interface SortState<T> { key: keyof T | null; dir: SortDir }

export function toggleSort<T>(current: SortState<T>, key: keyof T): SortState<T> {
  if (current.key !== key) return { key, dir: 'asc' };
  return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
}

export function sortRows<T>(rows: T[], sort: SortState<T>): T[] {
  if (!sort.key) return rows;
  const key = sort.key;
  const sorted = [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === 'number' && typeof bv === 'number') return av - bv;
    if (typeof av === 'boolean' && typeof bv === 'boolean') return Number(av) - Number(bv);
    return String(av ?? '').localeCompare(String(bv ?? ''));
  });
  return sort.dir === 'asc' ? sorted : sorted.reverse();
}

export function filterByText<T>(rows: T[], query: string, fields: (keyof T)[]): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => fields.some((f) => String(r[f] ?? '').toLowerCase().includes(q)));
}
