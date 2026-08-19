import { CATEGORY_ICONS } from '../constants';
import type { QuizQuestion } from '../types';

export function categoryIcon(cat: string): any {
  return CATEGORY_ICONS[cat] ?? 'star';
}

export function normalizeQuizQuestions(rawQs: any[]): QuizQuestion[] {
  return (rawQs || []).map((q: any) => {
    let opts: string[] = Array.isArray(q.options) ? q.options.map((o: any) => typeof o === 'string' ? o : (o?.label || String(o || ''))) : [];
    let correct = typeof q.correct === 'number' ? q.correct : 0;
    if (typeof q.correct === 'string') {
      const LETTER_MAP: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
      correct = LETTER_MAP[q.correct.toUpperCase()] ?? 0;
    }

    if (opts.length === 6 || opts.length === 8) {
      const allEvenLetters = opts.every((opt, i) => {
        if (i % 2 !== 0) return true;
        const s = String(opt || '').trim();
        return /^[A-Da-d0-4][.)\]]?$/.test(s) || /^\[[A-Da-d0-4]\]$/.test(s);
      });
      if (allEvenLetters) {
        const extracted = [];
        for (let i = 1; i < opts.length; i += 2) {
          extracted.push(opts[i]);
        }
        opts = extracted;
        if (correct >= opts.length) correct = Math.floor(correct / 2);
      }
    }

    // The separator after the letter/digit is REQUIRED, not optional - see
    // the identical fix + comment in server/routes/daily-tidbit.js's own
    // copy of this function for why (this was corrupting real option text
    // like "Big bruise" -> "ig bruise").
    // Strips a leading "A. "/"B) "/"[C] " letter-or-digit label. The separator
    // (bracket close, punctuation, or whitespace) after the label is required,
    // not optional - otherwise a plain numeric option like "022" has its
    // leading "0" mistaken for a label prefix and stripped down to "22".
    const cleaned = opts.map(opt => String(opt || '').replace(/^\[[A-Da-d0-4]\]\s*|^[A-Da-d0-4](?:[.)\-:]\s*|\s+)/, '').trim()).filter(Boolean);

    return {
      ...q,
      question: q.question || '',
      options: cleaned.length > 0 ? cleaned : opts,
      correct: Math.min(Math.max(0, correct), Math.max(0, (cleaned.length || opts.length) - 1)),
    };
  });
}

export function quizCacheKey(headline: string) {
  const hash = headline.replace(/\W+/g, '').toLowerCase().slice(0, 24);
  return `quiz_done_${hash}_${new Date().toISOString().split('T')[0]}`;
}
