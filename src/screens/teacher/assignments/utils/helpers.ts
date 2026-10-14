export function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, overdue: true };
  if (days === 0) return { label: 'Due today', overdue: false };
  return { label: `Due in ${days}d`, overdue: false };
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// The extraction AI is instructed not to use a program/series banner (e.g. a
// grade label like "PYP: 4") as the title/chapter, but doesn't always follow
// that — grade already has its own dedicated field, so strip a leading
// "PYP <n>" / "PYP: <n>" / "Grade <n>" prefix if the model echoed it anyway.
export function stripGradePrefix(text: string): string {
  return (text || '').replace(/^\s*(PYP|Grade|Class)\s*:?\s*\d+\s*[:\-–]?\s*/i, '').trim();
}

// A worksheet's grade label ("PYP 4", "Grade 4", "4") → the grade pill to
// select: one of the teacher's options when it matches, else "Grade N" (the
// pill list always shows the selected grade, even one the teacher doesn't teach).
export function gradeFromLabel(rawGrade: string, gradeOptions: string[]): string {
  const raw = String(rawGrade || '').trim();
  const digits = raw.replace(/[^0-9]/g, '');
  const match = gradeOptions.find((g) => (digits && g.replace(/[^0-9]/g, '') === digits) || g.toLowerCase() === raw.toLowerCase());
  if (match) return match;
  return digits ? `Grade ${digits}` : raw;
}
