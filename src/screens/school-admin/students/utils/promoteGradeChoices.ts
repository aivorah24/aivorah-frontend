export const ALL_GRADE_CHIPS = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

export function gradeNum(g: string | null | undefined): number | null {
  if (!g) return null;
  const m = String(g).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function mergeGrades(facetGrades: string[]): string[] {
  const merged = Array.from(new Set([...ALL_GRADE_CHIPS, ...facetGrades]));
  return merged.sort((a, b) => (gradeNum(a) ?? -1) - (gradeNum(b) ?? -1));
}

export function promoteGradeChoices(facetGrades: string[], maxCurrentGradeNum: number | null, ibPool?: string[]): string[] {
  const pool = ibPool ?? mergeGrades(facetGrades);
  if (maxCurrentGradeNum === null) return pool;
  return pool.filter((g) => {
    const n = gradeNum(g);
    return n === null || n > maxCurrentGradeNum;
  });
}
