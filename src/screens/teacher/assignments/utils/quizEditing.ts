// Edits a teacher makes to a generated quiz in the Edit tab: question text,
// answers, options, hint, solution, and pictures (remove, add, move between
// the task and its questions). Every function returns a NEW quiz with the
// cached preview cleared, so the Preview tab always shows the edited quiz.
//
// Where pictures live:
//   - the task picture, shown once above the task's questions
//     (task.sharedImageUrl; generated quizzes mark it with task.sharedImage
//     and put it on the first question instead - read both, write the first);
//   - a question's own picture (question.imageUrl). In a matching task each
//     item card shows its own picture, so "the picture in the answer box" is
//     a question picture, and "the question picture" is the task picture.

export type PictureSlot = { kind: 'task' } | { kind: 'question'; qi: number };

const clone = (quiz: any) => ({
  ...quiz,
  tasks: JSON.parse(JSON.stringify(quiz.tasks || [])),
  _previewHTML: null,
});

/** The task picture, or null. */
export function taskPicture(task: any): string | null {
  if (!task) return null;
  if (task.sharedImageUrl) return task.sharedImageUrl;
  const q0 = (task.questions || [])[0];
  return task.sharedImage && q0 && q0.imageUrl ? q0.imageUrl : null;
}

/** A question's own picture (not the task picture), or null. */
export function questionPicture(task: any, qi: number): string | null {
  const q = (task?.questions || [])[qi];
  if (!q || !q.imageUrl) return null;
  if (qi === 0 && !task.sharedImageUrl && task.sharedImage) return null; // it is the task picture
  return q.imageUrl;
}

export function getPicture(task: any, slot: PictureSlot): string | null {
  return slot.kind === 'task' ? taskPicture(task) : questionPicture(task, slot.qi);
}

// A generated task picture lives on question 1: make it the task's own so the
// first question can hold a picture of its own.
function separateTaskPicture(task: any) {
  if (task.sharedImageUrl || !task.sharedImage) return;
  const q0 = (task.questions || [])[0];
  if (q0 && q0.imageUrl) {
    task.sharedImageUrl = q0.imageUrl;
    delete q0.imageUrl;
  }
}

function putPicture(task: any, slot: PictureSlot, url: string | null) {
  separateTaskPicture(task);
  if (slot.kind === 'task') {
    if (url) {
      task.sharedImageUrl = url;
      task.sharedImage = true;
    } else {
      delete task.sharedImageUrl;
      task.sharedImage = false;
    }
    return;
  }
  const q = task.questions?.[slot.qi];
  if (!q) return;
  if (url) {
    q.imageUrl = url;
    q.hasImage = true;
  } else {
    delete q.imageUrl;
    q.hasImage = false;
  }
}

/** Sets (url) or removes (null) a picture. */
export function setPicture(quiz: any, ti: number, slot: PictureSlot, url: string | null) {
  const u = clone(quiz);
  if (u.tasks[ti]) putPicture(u.tasks[ti], slot, url);
  return u;
}

/** Moves a picture; whatever was at the destination goes back to where it came from. */
export function movePicture(quiz: any, ti: number, from: PictureSlot, to: PictureSlot) {
  const u = clone(quiz);
  const task = u.tasks[ti];
  if (!task) return u;
  separateTaskPicture(task);
  const moving = getPicture(task, from);
  if (!moving) return u;
  const displaced = getPicture(task, to);
  putPicture(task, to, moving);
  putPicture(task, from, displaced);
  return u;
}

export function setQuestionField(quiz: any, ti: number, qi: number, field: 'question' | 'hint' | 'solution', value: string) {
  const u = clone(quiz);
  const q = u.tasks[ti]?.questions?.[qi];
  if (q) q[field] = value;
  return u;
}

const optionLabel = (o: any) => (typeof o === 'string' ? o : String(o?.label ?? ''));
const relabel = (o: any, label: string) => (typeof o === 'string' ? label : { ...o, label });

/**
 * Sets an answer. The options that showed the old answer change with it - in
 * this question, or, in a matching task, every item's options and the answer
 * chips (they all share one pool of answers).
 */
export function setAnswer(quiz: any, ti: number, qi: number, value: string) {
  const u = clone(quiz);
  const task = u.tasks[ti];
  const q = task?.questions?.[qi];
  if (!q) return u;
  const old = typeof q.answer === 'string' || typeof q.answer === 'number' ? String(q.answer).trim() : '';
  q.answer = value;
  if (!old) return u;
  const scope = task._matchTask ? task.questions : [q];
  for (const item of scope) {
    if (Array.isArray(item.options)) item.options = item.options.map((o: any) => (optionLabel(o).trim() === old ? relabel(o, value) : o));
  }
  if (Array.isArray(task._wordBank)) task._wordBank = task._wordBank.map((w: string) => (String(w).trim() === old ? value : w));
  return u;
}

/** Edits an option's text; if it was the answer, the answer follows. */
export function setOption(quiz: any, ti: number, qi: number, oi: number, label: string) {
  const u = clone(quiz);
  const q = u.tasks[ti]?.questions?.[qi];
  if (!q || !Array.isArray(q.options) || oi >= q.options.length) return u;
  const old = optionLabel(q.options[oi]);
  q.options[oi] = relabel(q.options[oi], label);
  if (String(q.answer ?? '').trim() === old.trim()) q.answer = label;
  return u;
}

/** Makes one option the correct answer. */
export function markCorrectOption(quiz: any, ti: number, qi: number, oi: number) {
  const u = clone(quiz);
  const q = u.tasks[ti]?.questions?.[qi];
  if (!q || !Array.isArray(q.options) || oi >= q.options.length) return u;
  q.answer = optionLabel(q.options[oi]);
  q.options = q.options.map((o: any, i: number) => (typeof o === 'string' ? o : { ...o, correct: i === oi }));
  return u;
}

/** Every place a picture of this task can go, labelled for a menu. */
export function pictureSlots(task: any, labelOf: (qi: number) => string): { slot: PictureSlot; label: string }[] {
  return [
    { slot: { kind: 'task' }, label: 'Task picture (above the questions)' },
    ...(task?.questions || []).map((_: any, qi: number) => ({ slot: { kind: 'question', qi } as PictureSlot, label: `${labelOf(qi)} picture` })),
  ];
}

export const sameSlot = (a: PictureSlot, b: PictureSlot) =>
  a.kind === b.kind && (a.kind === 'task' || (b.kind === 'question' && a.qi === b.qi));
