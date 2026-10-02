// Read Aloud has stories for Grades 3–5 only; other grades stay out of the menu until more exist.
export const READ_ALOUD_GRADES = [3, 4, 5];

export function hasReadAloudStories(grade?: string | null): boolean {
  const n = Number(String(grade ?? '').match(/\d{1,2}/)?.[0]);
  return READ_ALOUD_GRADES.includes(n);
}
