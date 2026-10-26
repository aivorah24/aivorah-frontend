import { STEP_DEFAULTS } from '../constants';
import type { TaskStep } from '../types';
/** Flatten a question answer (which may be a plain string, number, array, or a
 *  structured object like { table: [...] } for "organise the data" activity tasks)
 *  into readable, editable text for the Edit Answers screen. Prevents structured
 *  answers from rendering as "[object Object]" / appearing empty. */
export function answerToEditText(a: any): string {
  if (a == null) return '';
  if (typeof a === 'string') return a;
  if (typeof a === 'number' || typeof a === 'boolean') return String(a);
  // Structured table answer → one readable line per row.
  const rows = Array.isArray(a) ? a : (Array.isArray(a?.table) ? a.table : null);
  if (rows && rows.length && typeof rows[0] === 'object') {
    return rows
      .map((r: any) => Object.values(r).map((v) => (v == null ? '' : String(v))).join(' — '))
      .join('\n');
  }
  if (Array.isArray(a)) return a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ');
  try { return JSON.stringify(a, null, 2); } catch { return String(a); }
}

/**
 * Pre-publish validation for the interactive quiz (issue #6). Returns a blocking
 * error when the quiz must NOT be published:
 *  1. Wrong worksheet — the selected files changed after the quiz was generated
 *     (guards the "uploaded Telugu, got a Math quiz" mixup: file-ID must equal the
 *     processed file's ID).
 *  2. Empty task card — a task with a heading but no questions and no visual
 *     content (chart/table/pyramid/passage/diagram/matching/image), i.e. content
 *     was lost during extraction (the "Task 4 shows only a heading" bug).
 */
export function validateInteractiveQuizForPublish(
  quiz: any,
  docFiles: { name: string; url?: string }[],
): { ok: true } | { ok: false; error: string } {
  if (!quiz) return { ok: true };

  // 1) Correct-worksheet check: the file set must be identical to the one the
  //    quiz was generated from. If the teacher swapped/added/removed a worksheet
  //    after generating (or the quiz is stale from a previous upload), re-generate.
  if (quiz._sourceDocKey != null) {
    const currentKey = (docFiles || []).map((f) => f.url || f.name).sort().join('|');
    if (currentKey !== quiz._sourceDocKey) {
      return { ok: false, error: 'The selected worksheet has changed since this quiz was generated. Tap "Generate Interactive Quiz" again so the quiz matches the uploaded worksheet before publishing.' };
    }
  }

  // 2) No empty task cards — every task must carry renderable content.
  const tasks = Array.isArray(quiz.tasks) ? quiz.tasks : [];
  if (tasks.length === 0) {
    return { ok: false, error: 'This quiz has no tasks. Please re-generate before publishing.' };
  }
  const taskHasContent = (t: any): boolean => {
    if (Array.isArray(t.questions) && t.questions.length > 0) return true;
    if (t.chart && Array.isArray(t.chart.bars) && t.chart.bars.length) return true;
    if (Array.isArray(t.tables) && t.tables.length) return true;
    if (t.table && Array.isArray(t.table.rows) && t.table.rows.length) return true;
    if (Array.isArray(t.pyramids) && t.pyramids.length) return true;
    if (Array.isArray(t.diagramFillBlanks) && t.diagramFillBlanks.length) return true;
    if (t._matchTask || t.sharedImage) return true;
    if (t.passage && String(t.passage).trim()) return true;
    return false;
  };
  const emptyTasks = tasks.filter((t: any) => !taskHasContent(t));
  if (emptyTasks.length > 0) {
    const names = emptyTasks.map((t: any) => (t.title || 'Untitled task').replace(/\s+/g, ' ').trim().slice(0, 60)).join('; ');
    return { ok: false, error: `Some tasks are empty (content was not extracted): ${names}. Please re-generate — do not publish an incomplete quiz.` };
  }

  return { ok: true };
}

const BUILTIN_INSTRUCTIONS = new Set(
  Object.values(STEP_DEFAULTS).map(d => String(d.instructions || '').trim().toLowerCase()).filter(Boolean),
);

/** First task step a student couldn't act on (blank/default instructions or
 *  missing problems/questions/passage), as a teacher-facing message; null if all fine. */
export function findIncompleteTaskStep(steps: TaskStep[]): string | null {
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const name = `Question ${i + 1}${s.label?.trim() ? ` ("${s.label.trim()}")` : ''}`;
    const instr = String(s.instructions || '').trim();
    if (!instr || BUILTIN_INSTRUCTIONS.has(instr.toLowerCase())) {
      return `${name} needs instructions that say exactly what to do — write them or tap "Fill with AI".`;
    }
    if (s.type === 'problem_solving' && !(s.problems || []).some(p => p.trim())) return `${name} has no problems — add them or tap "Fill with AI".`;
    if (s.type === 'reading_comprehension' && !String(s.provocation || '').trim()) return `${name} has no reading passage — add one or tap "Fill with AI".`;
  }
  return null;
}
