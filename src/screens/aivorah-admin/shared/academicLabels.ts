// "5", "Grade 5" and programme-prefixed values like "PYP 5" are the same
// grade in the data — show one label for all of them.
export function normalizeGrade(g: string | undefined | null): string {
  const t = (g || '').trim();
  const m = t.match(/^(?:grade|pyp|myp|dp)?\s*(\d+)$/i);
  return m ? `Grade ${Number(m[1])}` : t;
}

// NCERT is the textbook body behind CBSE, not a separate board — treat them as one.
export function normalizeCurriculum(c: string | undefined | null): string {
  const t = (c || '').trim();
  return /^ncert$/i.test(t) ? 'CBSE' : t;
}

const UNKNOWN = /^(unknown|n\/?a|none|null|undefined|-|—)?$/i;

// E2E-suite fixtures ("E2E-ATT", "E2E Grade 1789…") — real data, but not something to filter by.
export function isTestLabel(s: string | undefined | null): boolean {
  return /\be2e\b/i.test(s || '');
}

export function isUnknownLabel(s: string | undefined | null): boolean {
  return UNKNOWN.test((s || '').trim());
}

const IB_FAMILY = ['IB PYP', 'IB MYP', 'IB DP'];
// Values schools.curriculum may hold (the backend accepts exactly these).
export const SCHOOL_BOARDS = ['IB', 'CBSE', 'ICSE', 'Cambridge'];
const BOARDS = [...IB_FAMILY, 'CBSE', 'ICSE', 'Cambridge'];

// Curricula a school's board allows: "IB" → the three IB programmes; a specific
// board → just that one; null/unrecognised → null (don't restrict).
export function curriculaForBoard(board: string | null | undefined): string[] | null {
  const b = normalizeCurriculum(board);
  if (!b) return null;
  if (/^ib$/i.test(b)) return IB_FAMILY;
  const hit = BOARDS.find((c) => c.toLowerCase() === b.toLowerCase());
  return hit ? [hit] : null;
}

// Curriculum a student in `grade` gets at a school on `board` — mirrors the
// server's resolveCurriculum(): IB → PYP (≤5) / MYP (6-10) / DP (11+).
export function resolveCurriculum(board: string | null | undefined, grade: string | null | undefined): string | null {
  const allowed = curriculaForBoard(board);
  if (!allowed) return null;
  if (allowed.length === 1) return allowed[0];
  const n = parseInt(String(grade || '').replace(/\D/g, ''), 10);
  if (!n || n <= 5) return 'IB PYP';
  return n <= 10 ? 'IB MYP' : 'IB DP';
}

// One-line label for a school's board: "IB PYP / MYP / DP (by grade)", "CBSE", or null.
export function describeBoard(board: string | null | undefined): string | null {
  const allowed = curriculaForBoard(board);
  if (!allowed) return null;
  return allowed.length > 1 ? 'IB PYP / MYP / DP (by grade)' : allowed[0];
}

// Merges a { rawLabel: count } map under normalized labels, dropping blank/"Unknown" buckets.
export function mergeCounts(
  map: Record<string, number>,
  normalize: (s: string) => string,
): { label: string; value: number }[] {
  const merged = new Map<string, number>();
  Object.entries(map).forEach(([raw, n]) => {
    const label = normalize(raw);
    if (UNKNOWN.test(label)) return;
    merged.set(label, (merged.get(label) || 0) + (Number(n) || 0));
  });
  return [...merged].map(([label, value]) => ({ label, value }));
}

// Grade 1, 2 … 12 in numeric order; anything non-numeric (e.g. "LKG") after.
export function compareGrades(a: string, b: string): number {
  const na = Number(a.match(/^Grade (\d+)$/)?.[1] ?? NaN);
  const nb = Number(b.match(/^Grade (\d+)$/)?.[1] ?? NaN);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  if (!isNaN(na)) return -1;
  if (!isNaN(nb)) return 1;
  return a.localeCompare(b);
}
