import { splitWords, buildParagraphs, buildBoundaries } from '../textFormatting';

describe('splitWords', () => {
  test('splits on whitespace, keeping trailing spaces with each word', () => {
    const result = splitWords('Hello world');
    expect(result.join('')).toBe('Hello world');
  });

  test('rejoining always reconstructs the exact original text', () => {
    const text = 'The quick brown fox   jumps over the lazy dog.';
    expect(splitWords(text).join('')).toBe(text);
  });
});

describe('buildParagraphs', () => {
  test('a single paragraph with no blank line stays as one group', () => {
    const result = buildParagraphs('One two three');
    expect(result).toHaveLength(1);
  });

  test('a blank line splits into a new paragraph group', () => {
    const result = buildParagraphs('First paragraph.\n\nSecond paragraph.');
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  test('global word index (gi) is preserved across paragraph groups (for highlight sync)', () => {
    const result = buildParagraphs('One two.\n\nThree four.');
    const flatGis = result.flat().map(t => t.gi);
    // gi values must be sequential across the whole text, not reset per paragraph.
    expect(flatGis).toEqual([...flatGis].sort((a, b) => a - b));
    expect(new Set(flatGis).size).toBe(flatGis.length); // no duplicates
  });
});

describe('buildBoundaries', () => {
  test('boundaries are monotonically increasing and end at 1.0', () => {
    const tokens = ['The ', 'quick ', 'brown ', 'fox. '];
    const result = buildBoundaries(tokens);
    expect(result[result.length - 1]).toBeCloseTo(1.0, 5);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
    }
  });

  test('a longer/punctuated word gets a bigger share of the timeline than a short function word', () => {
    // "a" (function word, 1 syllable) vs "elephant." (content word + sentence-end pause)
    const tokens = ['a ', 'elephant. '];
    const result = buildBoundaries(tokens);
    const aShare = result[0];
    const elephantShare = result[1] - result[0];
    expect(elephantShare).toBeGreaterThan(aShare);
  });

  test('single token -> one boundary at 1.0', () => {
    expect(buildBoundaries(['Hello.'])).toEqual([1]);
  });

  test('empty token list -> empty boundaries (no crash)', () => {
    expect(buildBoundaries([])).toEqual([]);
  });

  test('a function word (e.g. "the") gets a smaller share than an equal-syllable content word, isolated from any punctuation pause', () => {
    // Both "the " and "cat " are single-syllable, no punctuation — isolates the
    // FUNCTION_WORDS 30%-faster discount from the sentence-end pause bonus.
    const tokens = ['the ', 'cat '];
    const result = buildBoundaries(tokens);
    const funcShare    = result[0];
    const contentShare = result[1] - result[0];
    expect(funcShare).toBeLessThan(contentShare);
  });

  test('a comma pause adds weight, but less than a full sentence-end pause', () => {
    const commaTokens = ['wait, ', 'then '];
    const periodTokens = ['wait. ', 'then '];
    const commaShare  = buildBoundaries(commaTokens)[0];
    const periodShare = buildBoundaries(periodTokens)[0];
    expect(commaShare).toBeLessThan(periodShare);
  });

  test('a silent trailing "e" is corrected away — "large" (1 real syllable) gets a smaller share than "open" (2 syllables)', () => {
    const result = buildBoundaries(['large ', 'open ']);
    const largeShare = result[0];
    const openShare = result[1] - result[0];
    expect(largeShare).toBeLessThan(openShare);
  });
});
