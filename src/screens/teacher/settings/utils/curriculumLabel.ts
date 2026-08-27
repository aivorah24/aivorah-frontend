// Pure formatting logic for the "Curriculum" field row in
// TeacherPreferencesCard.tsx — extracted out of the component so it can be
// unit-tested directly without rendering.
export function curriculumLabel(user: any): string {
  const teaches = Array.isArray(user?.teaches) ? user.teaches : [];
  const tCurricula = teaches.length > 0
    ? [...new Set(teaches.map((t: any) => t.curriculum).filter(Boolean))]
    : (user?.curriculum ? [user.curriculum] : ['IB PYP']);
  const tGrades = teaches.length > 0
    ? [...new Set(teaches.map((t: any) => t.grade).filter(Boolean))]
    : (user?.grade ? [user.grade] : []);
  const cLabel = tCurricula.join(', ');
  if (tGrades.length === 0) return cLabel || 'Not set — tap Update to add your grades';
  const gLabel = tGrades.map((g: string) => g.replace('Grade ', '')).join(', ');
  return `${cLabel} · Grade${tGrades.length > 1 ? 's' : ''} ${gLabel}`;
}
