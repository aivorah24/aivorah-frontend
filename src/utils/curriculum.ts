// NCERT publishes the CBSE textbooks — it is not a curriculum. Legacy "NCERT"
// values (any case/spacing) are CBSE; everything else is only trimmed.
export function normalizeCurriculum(value: string): string;
export function normalizeCurriculum(value: string | null | undefined): string | undefined;
export function normalizeCurriculum(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return /^(ncert|cbse)$/i.test(s.replace(/\s+/g, '')) ? 'CBSE' : s;
}

export function isCbseCurriculum(value: string | null | undefined): boolean {
  return normalizeCurriculum(value) === 'CBSE';
}

// Boards with no official textbook in Aivorah yet (ICSE, Cambridge): their
// Learning Path is a browsable syllabus from aivorah-learning-paths-service
// (/curriculum/subjects + /curriculum/syllabus), with every topic "Coming soon".
export function isSyllabusOnlyCurriculum(value: string | null | undefined): boolean {
  return /^(icse|cambridge)$/i.test(String(value ?? '').trim());
}

// The monolith's /curriculum + /curriculum/subjects content for CBSE is keyed
// "NCERT" (the book series) — a content key, never a curriculum. This is the
// one place CBSE maps back to it; an unset curriculum keeps the old default.
export const NCERT_CONTENT_KEY = 'NCERT';

export function monolithContentCurriculum(value: string | null | undefined): string {
  const c = normalizeCurriculum(value);
  return !c || c === 'CBSE' ? NCERT_CONTENT_KEY : c;
}

type WithCurricula = {
  curriculum?: string;
  children?: { curriculum?: string }[];
  teaches?: { curriculum: string }[];
};

// Same object back when nothing needed normalising (keeps React state stable).
export function normalizeUserCurricula<T extends WithCurricula>(user: T): T;
export function normalizeUserCurricula<T extends WithCurricula>(user: T | null): T | null;
export function normalizeUserCurricula<T extends WithCurricula>(user: T | null): T | null {
  if (!user) return user;
  const needs = (c?: string) => c != null && normalizeCurriculum(c) !== c;
  if (!needs(user.curriculum) && !user.children?.some((c) => needs(c.curriculum)) && !user.teaches?.some((t) => needs(t.curriculum))) {
    return user;
  }
  return {
    ...user,
    ...(user.curriculum != null ? { curriculum: normalizeCurriculum(user.curriculum) } : {}),
    ...(user.children ? { children: user.children.map((c) => (c.curriculum != null ? { ...c, curriculum: normalizeCurriculum(c.curriculum) } : c)) } : {}),
    ...(user.teaches ? { teaches: user.teaches.map((t) => ({ ...t, curriculum: normalizeCurriculum(t.curriculum) })) } : {}),
  };
}
