interface ClassFilterable {
  grade: string | null;
  curriculum: string | null;
  section: string | null;
  scopedSubjects: string[];
}

export interface ClassFilters {
  grade?: string;
  curriculum?: string;
  subject?: string;
  section?: string; // undefined/omitted = "All sections"
}

// Shared client-side filter for both the roster table and the heatmap
// students — both now carry the same grade/curriculum/section/scopedSubjects
// shape. Client-side because the multi-curriculum-per-grade edge case (e.g.
// Grade 3 under IB AND Grade 4 under CBSE for the same teacher) can't be
// disambiguated by the heatmap route's grade-only query param, so the
// screen now does a single unfiltered fetch and filters everything here.
export function filterByClass<T extends ClassFilterable>(items: T[], filters: ClassFilters): T[] {
  return items.filter((s) => {
    if (filters.grade && s.grade !== filters.grade) return false;
    if (filters.curriculum && s.curriculum !== filters.curriculum) return false;
    if (filters.subject && !s.scopedSubjects.includes(filters.subject)) return false;
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
