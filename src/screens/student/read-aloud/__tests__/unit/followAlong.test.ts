import { advanceStatuses, followAlong, initialStatuses, newFollowState, revealFrame, UNKNOWN_WORD } from '../../utils/followAlong';
import { splitWords } from '../../utils/wordMatching';

const PASSAGE = splitWords('The water cycle is an incredible journey for every drop of water.');

function feed(state: ReturnType<typeof newFollowState>, spoken: string, hold = false) {
  const step = followAlong(state, PASSAGE, spoken.split(' ').filter(Boolean), hold);
  if (step) state.cursor = step.to;
  return step;
}

describe('followAlong', () => {
  test('advances one word at a time as the child reads', () => {
    const st = newFollowState();
    expect(feed(st, 'the')).toEqual({ to: 1, skipped: [], misread: [] });
    expect(feed(st, 'the water')).toEqual({ to: 2, skipped: [], misread: [] });
    expect(feed(st, 'the water cycle is')?.to).toBe(4);
  });

  test('noise and wrong words do not move the highlight', () => {
    const st = newFollowState();
    expect(feed(st, 'hello banana')).toBeNull();
    expect(st.cursor).toBe(0);
  });

  test('a content word a few ahead marks the jumped words skipped', () => {
    const st = newFollowState();
    feed(st, 'the water');
    expect(feed(st, 'the water incredible')).toEqual({ to: 6, skipped: [2, 3, 4], misread: [] });
  });

  test('a common word can never cause a jump', () => {
    const st = newFollowState();
    feed(st, 'the water cycle');
    expect(feed(st, 'the water cycle for')).toBeNull();
  });

  test('off-script speech before a jumped word marks it misread', () => {
    const st = newFollowState();
    feed(st, 'the water');
    expect(feed(st, `the water ${UNKNOWN_WORD} is`)).toEqual({ to: 4, skipped: [], misread: [2] });
    const st2 = newFollowState();
    feed(st2, 'the water');
    expect(feed(st2, `the water ${UNKNOWN_WORD} an`)).toBeNull();
    expect(feed(st2, `the water ${UNKNOWN_WORD} an incredible`)).toEqual({ to: 6, skipped: [3, 4], misread: [2] });
  });

  test('with Vosk, a long word is held until the next emission confirms it', () => {
    const st = newFollowState();
    feed(st, 'the water cycle is an', true);
    expect(st.cursor).toBe(5);
    expect(feed(st, 'the water cycle is an incredible', true)).toBeNull();
    expect(st.pending?.pos).toBe(5);
    expect(feed(st, 'the water cycle is an incredible', true)).toEqual({ to: 6, skipped: [], misread: [] });
  });

  test('Web Speech does not hold long words', () => {
    const st = newFollowState();
    feed(st, 'the water cycle is an');
    expect(feed(st, 'the water cycle is an incredible')?.to).toBe(6);
  });

  test('stops at the end of the passage', () => {
    const st = newFollowState();
    st.cursor = PASSAGE.length;
    expect(feed(st, 'water')).toBeNull();
  });
});

describe('advanceStatuses / revealFrame / initialStatuses', () => {
  const words = ['one', 'two', '...', 'three', 'four'];

  test('marks reached words and skips punctuation-only tokens', () => {
    const next = advanceStatuses(initialStatuses(words.length, true), words, 0, 2, { skipped: [1] });
    expect(next).toEqual({ pos: 3, statuses: ['correct', 'skipped', 'correct', 'current', 'pending'] });
  });

  test('never moves backwards', () => {
    expect(advanceStatuses([], words, 3, 2)).toBeNull();
  });

  test('the visible cursor glides halfway each frame', () => {
    const target = ['correct', 'correct', 'correct', 'correct', 'current'] as const;
    const f1 = revealFrame([...target], 0, 4);
    expect(f1).toEqual({ display: 2, visible: ['correct', 'correct', 'current', 'pending', 'pending'] });
    expect(revealFrame([...target], 4, 4)).toBeNull();
  });

  test('initial statuses', () => {
    expect(initialStatuses(3, true)).toEqual(['current', 'pending', 'pending']);
    expect(initialStatuses(0, true)).toEqual([]);
  });
});
