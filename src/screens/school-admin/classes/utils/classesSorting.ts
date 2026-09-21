// Pure sorting/filtering logic for School Admin Classes — extracted verbatim
// from the legacy SchoolAdminClassesScreen.tsx (Grade x Section table +
// class-teacher assign picker) so it's unit-testable independent of React.

export interface ClassRow {
  grade: string;
  section: string;
  studentCount: number;
  classTeacherEmail: string | null;
  classTeacherName: string | null;
}

export interface TeacherOption {
  id: string;
  name: string;
  email: string;
  teaches: { grade: string }[];
}

// Numeric-aware sort key for grade names ("Grade 2" < "Grade 10"). Names with
// no digits (or non-finite results) sort last, after every numbered grade.
export function gradeSortKey(name: string): number {
  const n = parseInt(name.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

// Distinct grade names present in the class list, in display order.
export function sortGradeOptions(classes: ClassRow[]): string[] {
  const names = Array.from(new Set(classes.map((c) => c.grade)));
  return names.sort((a, b) => gradeSortKey(a) - gradeSortKey(b) || a.localeCompare(b));
}

// The visible table rows: optionally filtered to one grade, always sorted by
// grade then section.
export function filterAndSortClasses(classes: ClassRow[], gradeFilter: string): ClassRow[] {
  const filtered = gradeFilter ? classes.filter((c) => c.grade === gradeFilter) : classes;
  return [...filtered].sort(
    (a, b) => gradeSortKey(a.grade) - gradeSortKey(b.grade) || a.grade.localeCompare(b.grade) || a.section.localeCompare(b.section)
  );
}

// Teachers for the assign-picker, filtered by name/email search and ranked
// so a teacher who already teaches this class's grade surfaces first —
// the most likely pick for a class teacher assignment.
export function rankPickerTeachers(teachers: TeacherOption[], pickerFor: ClassRow | null, search: string): TeacherOption[] {
  if (!pickerFor) return [];
  const q = search.trim().toLowerCase();
  const filtered = teachers.filter((t) => !q || t.name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q));
  return [...filtered].sort((a, b) => {
    const aTeaches = (a.teaches || []).some((e) => e.grade === pickerFor.grade) ? 0 : 1;
    const bTeaches = (b.teaches || []).some((e) => e.grade === pickerFor.grade) ? 0 : 1;
    if (aTeaches !== bTeaches) return aTeaches - bTeaches;
    return (a.name || '').localeCompare(b.name || '');
  });
}
