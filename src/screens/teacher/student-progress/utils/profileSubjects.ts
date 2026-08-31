import { normalizeGrade } from './rosterFilters';

interface TeachesEntry {
  grade?: string;
  curriculum?: string;
  subjects?: string[];
}

// The teacher's own configured Staff Subject Mapping (Settings → Teaching)
// — "if I'm a teacher who handles Mathematics and English, the dropdown
// should show both", even before any student is linked under a subject yet.
// Matched against the currently selected Curriculum+Grade so the option
// list still narrows correctly; grade comparison is normalized since
// `teaches[].grade` ("Grade 3") and a student's `users.grade` ("3") are
// different formats for the same grade.
export function profileSubjectsFor(
  teaches: TeachesEntry[] | undefined,
  curriculum: string | undefined,
  grade: string | undefined
): string[] {
  if (!Array.isArray(teaches)) return [];
  const subjects = new Set<string>();
  teaches.forEach((t) => {
    if (curriculum && t.curriculum !== curriculum) return;
    if (grade && normalizeGrade(t.grade) !== normalizeGrade(grade)) return;
    (t.subjects ?? []).forEach((s) => { if (s) subjects.add(s); });
  });
  return [...subjects];
}

// Every curriculum in the teacher's profile — merged into the Curriculum
// dropdown alongside real student data (see mergeGrades below for why Grade
// needs the same treatment). Without this, changing Curriculum/Grade in
// Settings has nowhere to go on this screen: the dropdown only ever showed
// curricula/grades that already had a real linked student, so a teacher who
// just reconfigured their teaching assignment couldn't even select the new
// one here — the filter looked "stuck" on their old subjects.
export function profileCurricula(teaches: TeachesEntry[] | undefined): string[] {
  if (!Array.isArray(teaches)) return [];
  return [...new Set(teaches.map((t) => t.curriculum).filter((c): c is string => !!c))];
}

// Grades configured for a given curriculum (or all, if curriculum is
// undefined) — same profile-merge treatment as Subject/Curriculum.
export function profileGradesFor(teaches: TeachesEntry[] | undefined, curriculum: string | undefined): string[] {
  if (!Array.isArray(teaches)) return [];
  return [...new Set(
    teaches
      .filter((t) => !curriculum || t.curriculum === curriculum)
      .map((t) => t.grade)
      .filter((g): g is string => !!g)
  )];
}

// Merges a real-data grade list with a profile-configured one, deduping by
// normalized grade so "3" (real student format) and "Grade 3" (however
// Settings happens to store it) don't show up as two separate rows for the
// same real grade.
export function mergeGrades(real: string[], profile: string[]): string[] {
  const byNormalized = new Map<string, string>();
  [...real, ...profile].forEach((g) => {
    const key = normalizeGrade(g);
    if (!byNormalized.has(key)) byNormalized.set(key, g);
  });
  return [...byNormalized.values()].sort();
}
