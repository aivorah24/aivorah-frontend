import { STAMPS } from './constants';

export function formatDueDate(iso: string) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(iso); due.setHours(0,0,0,0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: 'Ready to submit', colorKey: 'accentYellow' as const, isOverdue: false };
  if (diff === 0) return { label: 'Due today', colorKey: 'accentYellow' as const, isOverdue: false };
  if (diff === 1) return { label: 'Due tomorrow', colorKey: 'accentYellow' as const, isOverdue: false };
  return { label: `Due ${due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, colorKey: 'textMuted' as const, isOverdue: false };
}

// Per-question score badge. A blank answer scores 0% (it used to show "--"),
// and one the AI could not grade waits for the teacher (it used to show "null%").
export function scoreBadge(q: { answered?: boolean; score?: number | null; needsReview?: boolean }) {
  if (q.needsReview) return { label: 'Review', colorKey: 'textDim' as const };
  if (q.answered === false) return { label: '0%', colorKey: 'accentRed' as const };
  const score = q.score ?? 0;
  return { label: `${score}%`, colorKey: score >= 80 ? 'accentGreen' as const : score >= 50 ? 'accentYellow' as const : 'accentRed' as const };
}

export function getStamp(score: number | null) {
  if (score == null) return STAMPS[2];
  return STAMPS.find(s => score >= s.min) ?? STAMPS[2];
}

// The assignment's own words (title, note, criteria, steps), for picking the answer-box typing language.
export function assignmentLanguageText(a: { title?: string; note?: string; successCriteria?: string[]; taskSteps?: { label?: string; instructions?: string }[] }): string {
  return [a.title, a.note, ...(a.successCriteria ?? []), ...(a.taskSteps ?? []).flatMap(s => [s.label, s.instructions])]
    .filter(Boolean).join(' ');
}
