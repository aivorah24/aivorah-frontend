import { Platform } from 'react-native';
import SERVER_URL from '../../../../config/serverUrl';
import type { Question } from './types';

// Play a sound effect (web only)
export function playSound(name: 'gold' | 'silver' | 'bronze') {
  if (Platform.OS !== 'web') return;
  try {
    const audio = new Audio(`${SERVER_URL}/sounds/${name}.wav`);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {}
}

export function normalizeQuizQuestions(rawQs: any[]): Question[] {
  return (rawQs || []).map((q: any) => {
    // Fill-blank answers are free-text strings (e.g. "happily") — never coerce
    // them to an MCQ index, or the reveal shows "Answer: 0". Only MCQ answers
    // get letter/index normalization.
    if (q.type === 'fill_blank') {
      return {
        ...q,
        question: q.question || '',
        options: [],
        correct: typeof q.correct === 'string' ? q.correct.trim() : String(q.correct ?? ''),
      };
    }
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

    // Strip an option-letter prefix ONLY when it's a real prefix with a
    // delimiter — "A) ", "B.", "(C)", "[D]", "2." — NEVER a bare leading
    // character. The old regex stripped any leading A–D/0–4, which corrupted
    // real options ("Borrow"→"orrow") and numeric answers ("25"→"5").
    const cleaned = opts.map(opt => String(opt || '')
      .replace(/^\s*(?:\[[A-Da-d0-4]\]|\([A-Da-d0-4]\)|[A-Da-d0-4][.)\-:])\s*/, '')
      .trim()).filter(Boolean);

    return {
      ...q,
      question: q.question || '',
      options: cleaned.length > 0 ? cleaned : opts,
      correct: Math.min(Math.max(0, correct), Math.max(0, (cleaned.length || opts.length) - 1)),
    };
  });
}
