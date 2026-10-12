import type { AdminTeacher } from '../types';
import { normalizeGrade, normalizeCurriculum } from '../../shared/academicLabels';

export { normalizeGrade, normalizeCurriculum };

// Grade/curriculum the teacher list should be narrowed to; null = don't narrow.
export interface TeachingContext { school: string | null; grade: string | null; curriculum: string | null }

type TeachEntry = AdminTeacher['teaches'][number];

// Onboarding saves { curriculum, grade, subjects: [] }; older rows have a
// single { grade, subject }. Accept both.
function entrySubjects(e: TeachEntry): string[] {
  const list = Array.isArray(e.subjects) ? e.subjects : [];
  return [...list, ...(e.subject ? [e.subject] : [])].filter(Boolean);
}

// An entry missing a grade (older single-subject rows) isn't a mismatch — it just can't narrow.
function entryFits(t: AdminTeacher, e: TeachEntry, ctx: TeachingContext): boolean {
  if (ctx.grade && e.grade && normalizeGrade(e.grade) !== ctx.grade) return false;
  if (ctx.curriculum && normalizeCurriculum(e.curriculum || t.curriculum) !== ctx.curriculum) return false;
  return true;
}

export function teacherFits(t: AdminTeacher, ctx: TeachingContext): boolean {
  if (ctx.school && t.school !== ctx.school) return false;
  if (!ctx.grade && !ctx.curriculum) return true;
  const entries = (t.teaches || []) as TeachEntry[];
  // No teaching entries saved yet — fall back to the teacher's profile curriculum.
  if (entries.length === 0) return !ctx.grade && normalizeCurriculum(t.curriculum) === ctx.curriculum;
  return entries.some((e) => entryFits(t, e, ctx));
}

// Subjects the teacher teaches for this grade/curriculum (all of them if the context is open).
export function subjectsFor(t: AdminTeacher, ctx: TeachingContext): string[] {
  const set = new Set<string>();
  ((t.teaches || []) as TeachEntry[])
    .filter((e) => entryFits(t, e, ctx))
    .forEach((e) => entrySubjects(e).forEach((s) => set.add(s)));
  return [...set];
}
