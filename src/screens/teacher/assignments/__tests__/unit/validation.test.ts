import { answerToEditText, validateInteractiveQuizForPublish } from '../../utils/validation';

describe('answerToEditText', () => {
  test('null/undefined -> empty string', () => {
    expect(answerToEditText(null)).toBe('');
    expect(answerToEditText(undefined)).toBe('');
  });
  test('plain string passes through', () => {
    expect(answerToEditText('42')).toBe('42');
  });
  test('number/boolean stringify', () => {
    expect(answerToEditText(42)).toBe('42');
    expect(answerToEditText(true)).toBe('true');
  });
  test('a structured table answer becomes one readable line per row', () => {
    const table = { table: [{ name: 'Apples', qty: 5 }, { name: 'Pears', qty: 3 }] };
    expect(answerToEditText(table)).toBe('Apples — 5\nPears — 3');
  });
  test('a plain array of primitives joins with commas', () => {
    expect(answerToEditText([1, 2, 3])).toBe('1, 2, 3');
  });
  test('an unrecognized object falls back to JSON', () => {
    expect(answerToEditText({ foo: 'bar' })).toBe(JSON.stringify({ foo: 'bar' }, null, 2));
  });
});

describe('validateInteractiveQuizForPublish', () => {
  const docFiles = [{ name: 'worksheet.pdf', url: 'https://x/worksheet.pdf' }];

  test('no quiz at all is allowed (nothing to validate)', () => {
    expect(validateInteractiveQuizForPublish(null, docFiles)).toEqual({ ok: true });
  });

  test('blocks publish when the worksheet set changed since generation', () => {
    const quiz = { _sourceDocKey: 'https://x/OLD.pdf', tasks: [{ title: 'T1', questions: [{ q: 1 }] }] };
    const result = validateInteractiveQuizForPublish(quiz, docFiles);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/worksheet has changed/i);
  });

  test('allows publish when the source doc key matches the current files', () => {
    const quiz = { _sourceDocKey: docFiles.map(f => f.url).sort().join('|'), tasks: [{ title: 'T1', questions: [{ q: 1 }] }] };
    expect(validateInteractiveQuizForPublish(quiz, docFiles)).toEqual({ ok: true });
  });

  test('blocks publish when there are zero tasks', () => {
    const result = validateInteractiveQuizForPublish({ tasks: [] }, docFiles);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no tasks/i);
  });

  test('blocks publish when a task has a heading but no renderable content (the "Task 4 shows only a heading" bug)', () => {
    const quiz = { tasks: [{ title: 'Task 4' }] };
    const result = validateInteractiveQuizForPublish(quiz, docFiles);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Task 4/);
  });

  test('a task with a chart counts as having content even with no questions array', () => {
    const quiz = { tasks: [{ title: 'Chart task', chart: { bars: [{ v: 1 }] } }] };
    expect(validateInteractiveQuizForPublish(quiz, docFiles)).toEqual({ ok: true });
  });

  test('a task with a passage counts as having content', () => {
    const quiz = { tasks: [{ title: 'Reading', passage: 'Once upon a time...' }] };
    expect(validateInteractiveQuizForPublish(quiz, docFiles)).toEqual({ ok: true });
  });

  test('a task with only a matching flag (_matchTask) counts as having content', () => {
    const quiz = { tasks: [{ title: 'Match', _matchTask: true }] };
    expect(validateInteractiveQuizForPublish(quiz, docFiles)).toEqual({ ok: true });
  });
});
