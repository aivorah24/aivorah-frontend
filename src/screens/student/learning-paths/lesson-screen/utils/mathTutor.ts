import type { ListenStep, MathStep, PlayLine } from '../types';
import { plainMathDeep } from './plainMath';

const str = (v: any): v is string => typeof v === 'string' && v.trim().length > 0;
const stop = (s: string) => (/[.!?…]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

// Stored Maths AI Tutor ({ intro?, examples: [{ title, problem, page, steps: [{ say, show }], answer, why, hint, yourTurn }] })
// -> one tutor step per book example. Each spoken line reveals one working line on the board.
export function buildMathTutorSteps(raw: any): ListenStep[] | null {
  const tutor = plainMathDeep(raw?.mathTutor);
  const examples = Array.isArray(tutor?.examples) ? tutor.examples : [];
  const steps: ListenStep[] = [];
  for (const ex of examples) {
    const parts = Array.isArray(ex?.steps) ? ex.steps.filter((s: any) => str(s?.say)) : [];
    if (!str(ex?.problem) || !parts.length || !str(ex?.answer)) continue;
    const lines: PlayLine[] = parts.map((s: any) => ({ speaker: 'Tutor', text: stop(s.say) }));
    const math: MathStep = {
      problem: ex.problem.trim(),
      shows: parts.map((s: any) => (str(s.show) ? s.show.trim() : '')),
      answer: ex.answer.trim(),
      ...(str(ex.why) ? { why: ex.why.trim() } : {}),
      ...(str(ex.hint) ? { hint: ex.hint.trim() } : {}),
      ...(Number.isInteger(ex.page) ? { page: ex.page } : {}),
      ...(str(ex.yourTurn?.question) && str(ex.yourTurn?.answer) ? { yourTurn: { question: ex.yourTurn.question.trim(), answer: ex.yourTurn.answer.trim() } } : {}),
    };
    const title = str(ex.title) ? ex.title.trim() : `Example ${steps.length + 1}`;
    steps.push({ label: title, heading: title, text: lines.map((l) => l.text).join(' '), lines, math });
  }
  if (!steps.length) return null;
  if (str(tutor.intro)) {
    steps.unshift({
      label: 'Introduction', heading: 'Introduction', text: stop(tutor.intro), lines: [{ speaker: 'Tutor', text: stop(tutor.intro) }],
      ...(str(tutor.keyIdea) ? { keyIdea: tutor.keyIdea.trim() } : {}),
    });
  }
  return steps;
}
