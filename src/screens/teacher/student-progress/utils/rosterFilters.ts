interface ClassFilterable {
  grade: string | null;
  curriculum: string | null;
  section: string | null;
  class: string | null;
  scopedSubjects: string[];
}

export interface ClassFilters {
  curriculum?: string;
  grade?: string;
  subject?: string;
  class?: string; // real users.class column (e.g. "4A") — undefined = "All classes"
  section?: string; // undefined/omitted = "All sections"
}

// The teacher's own configured "teaches" grade (from Staff Subject Mapping,
// e.g. "Grade 7") and a real student's `users.grade` column (e.g. "7") use
// different formats for the SAME grade — exact-string comparison silently
// never matches. Compare on the digits only (falling back to a lowercased
// trim for non-numeric grades like "UKG"/"LKG").
export function normalizeGrade(grade: string | null | undefined): string {
  if (!grade) return '';
  const digits = grade.replace(/\D/g, '');
  return digits || grade.trim().toLowerCase();
}

// Shared client-side filter for both the roster table and the heatmap
// students — both now carry the same grade/curriculum/section/scopedSubjects
// shape. Client-side because the multi-curriculum-per-grade edge case (e.g.
// Grade 3 under IB AND Grade 4 under CBSE for the same teacher) can't be
// disambiguated by the heatmap route's grade-only query param, so the
// screen now does a single unfiltered fetch and filters everything here.
export function filterByClass<T extends ClassFilterable>(items: T[], filters: ClassFilters): T[] {
  return items.filter((s) => {
    if (filters.grade && normalizeGrade(s.grade) !== normalizeGrade(filters.grade)) return false;
    if (filters.curriculum && s.curriculum !== filters.curriculum) return false;
    if (filters.subject && !s.scopedSubjects.includes(filters.subject)) return false;
    if (filters.class && s.class !== filters.class) return false;
    if (filters.section && s.section !== filters.section) return false;
    return true;
  });
}

// Kept for the existing roster call site / tests — a thin wrapper over
// filterByClass with the older positional (subject, grade) signature.
export function filterRoster<T extends ClassFilterable>(
  roster: T[],
  subjectFilter: string | undefined,
  gradeFilter: string | undefined
): T[] {
  return filterByClass(roster, { subject: subjectFilter, grade: gradeFilter });
}
