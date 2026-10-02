import type { AssessResult, WordStatus } from '../types';

const GRADE_BASE_LEXILE: Record<string, number> = { 'Grade 1': 200, 'Grade 2': 300, 'Grade 3': 400, 'Grade 4': 500, 'Grade 5': 600 };
export const SKIPPED_CALIBRATION_LEXILE = 400;

// Starting Lexile from the reading check: the grade's base level, +/-100 by accuracy and speed.
export function calibrationLexile(grade: string, accuracy: number, wcpm: number): number {
  const base = GRADE_BASE_LEXILE[grade] || 400;
  if (accuracy >= 95 && wcpm >= 80) return base + 100;
  if (accuracy >= 80 && wcpm >= 50) return base;
  return base - 100;
}

export function calibrationFeedback(lexile: number): string {
  return `Awesome job! Based on your reading of this baseline passage, your initial Lexile level is set to ${lexile}L. Now let's explore stories tailored specifically for you!`;
}

// Words never reached by the end count as skipped.
export function finalizeStatuses(statuses: WordStatus[]): WordStatus[] {
  return statuses.map((s) => (s === 'pending' || s === 'current' ? 'skipped' : s));
}

// Server statuses padded/trimmed to the passage's word count.
export function alignServerStatuses(server: string[] | undefined, wordCount: number): WordStatus[] {
  const statuses: WordStatus[] = (server || []).slice(0, wordCount).map((s) =>
    (s === 'correct' || s === 'misread' || s === 'skipped' ? s : 'pending'));
  while (statuses.length < wordCount) statuses.push('pending');
  return statuses;
}

// Used when the server can't score the reading.
export function localAssessment(statuses: WordStatus[], durationSeconds: number): AssessResult {
  const total = statuses.length;
  const correct = statuses.filter((s) => s === 'correct').length;
  const ratio = total ? correct / total : 0;
  const minutes = durationSeconds / 60;
  return {
    accuracy: Math.round(ratio * 100),
    wcpm: minutes > 0 ? Math.round(correct / minutes) : 0,
    wpm: minutes > 0 ? Math.round(total / minutes) : 0,
    totalWords: total,
    correct,
    misread: statuses.filter((s) => s === 'misread').length,
    skipped: statuses.filter((s) => s === 'skipped').length,
    duration: Math.round(durationSeconds),
    errors: [],
    feedback: ratio >= 0.8 ? 'Good reading! Keep practising!' : 'Nice try! Practice makes perfect!',
    level: ratio >= 0.95 ? 'excellent' : ratio >= 0.8 ? 'good' : ratio >= 0.6 ? 'developing' : 'needs-practice',
  };
}

export function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
