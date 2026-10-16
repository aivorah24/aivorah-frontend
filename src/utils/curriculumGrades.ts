// Grades each curriculum covers. IB programmes are grade-bound (PYP 1–5,
// MYP 6–10, DP 11–12); every other board spans all grades. Shared by
// onboarding, Settings and the add/edit-child forms so the rule lives once.

const IB_RANGES: Record<string, [number, number]> = {
  'IB PYP': [1, 5],
  'IB MYP': [6, 10],
  'IB DP': [11, 12],
};

function ibKey(curriculum: string | null | undefined): string | null {
  const c = String(curriculum || '').trim().toUpperCase().replace(/[_\s]+/g, ' ');
  if (/^IB ?PYP$/.test(c)) return 'IB PYP';
  if (/^IB ?MYP$/.test(c)) return 'IB MYP';
  if (/^IB ?DP$/.test(c)) return 'IB DP';
  return null;
}

export function gradeNumber(grade: string | null | undefined): number | null {
  const m = String(grade || '').match(/(\d{1,2})/);
  return m ? parseInt(m[1], 10) : null;
}

/** The IB programme a grade belongs to (Grade 7 → IB MYP). */
export function ibProgrammeForGrade(grade: string | null | undefined): string | null {
  const n = gradeNumber(grade);
  if (n === null) return null;
  return Object.keys(IB_RANGES).find((k) => n >= IB_RANGES[k][0] && n <= IB_RANGES[k][1]) || null;
}

/**
 * null when the pair is valid; otherwise a message for the user, e.g.
 * "IB DP is only for Grade 11–12. Please choose Grade 11 or 12, or switch to IB MYP for Grade 7."
 */
export function curriculumGradeError(curriculum: string | null | undefined, grade: string | null | undefined): string | null {
  const key = ibKey(curriculum);
  if (!key || !grade) return null;
  const [from, to] = IB_RANGES[key];
  const n = gradeNumber(grade);
  if (n !== null && n >= from && n <= to) return null;
  const choose = to - from === 1 ? `Grade ${from} or ${to}` : `a grade from ${from} to ${to}`;
  const other = ibProgrammeForGrade(grade);
  const switchTo = other && other !== key ? `, or switch to ${other} for ${grade}` : '';
  return `${key} is only for Grade ${from}–${to}. Please choose ${choose}${switchTo}.`;
}
