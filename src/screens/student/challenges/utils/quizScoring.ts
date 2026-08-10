import type { Question } from '../types';

// Score a single question: mcq compares to the correct option,
// fill_blank checks the typed text against any accepted answer (case/space-insensitive),
// open_ended has no wrong answer — any non-empty response earns credit.
export function isQuestionCorrect(q: Question, given: string | null): boolean {
  if (given === null) return false;
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  if (q.type === 'fill_blank') {
    const accepted = (q.acceptAnswers && q.acceptAnswers.length > 0) ? q.acceptAnswers : [q.answer];
    return accepted.some(a => norm(a) === norm(given));
  }
  if (q.type === 'open_ended') {
    return given.trim().length > 0;
  }
  return given === q.answer;
}
