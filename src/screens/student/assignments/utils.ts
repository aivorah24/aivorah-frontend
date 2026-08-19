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

export function getStamp(score: number | null) {
  if (score == null) return STAMPS[2];
  return STAMPS.find(s => score >= s.min) ?? STAMPS[2];
}
