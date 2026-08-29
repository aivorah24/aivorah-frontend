import type { RosterStudent } from '../types';

// Reported feedback: the Activity & Performance table (Section D) ignored
// the Subject/Grade filter pills entirely — filtering the heatmap above it
// to "Grade 3" left the table below still showing every grade, which read
// as broken/inconsistent. This is the client-side filter applied to the
// SAME roster fetch so one shared set of controls governs both sections
// (the roster endpoint itself has no subject/grade query params to filter
// server-side, unlike the heatmap route).
export function filterRoster(
  roster: RosterStudent[],
  subjectFilter: string | undefined,
  gradeFilter: string | undefined
): RosterStudent[] {
  return roster.filter((s) => {
    if (gradeFilter && s.grade !== gradeFilter) return false;
    if (subjectFilter && !s.scopedSubjects.includes(subjectFilter)) return false;
    return true;
  });
}
