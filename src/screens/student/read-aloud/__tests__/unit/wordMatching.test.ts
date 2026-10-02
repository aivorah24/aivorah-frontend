import { fuzzyMatch, isEquivalent, levenshtein, normalize, splitWords, spokenWordsOf } from '../../utils/wordMatching';

describe('splitWords / normalize / spokenWordsOf', () => {
  test('splits on whitespace and dashes', () => {
    expect(splitWords('The three Rs — Reduce, Reuse')).toEqual(['The', 'three', 'Rs', 'Reduce,', 'Reuse']);
    expect(splitWords('')).toEqual([]);
  });

  test('normalizes punctuation and case', () => {
    expect(normalize('"Hello,')).toBe('hello');
    expect(normalize("Earth's")).toBe("earth's");
  });

  test('turns a recognizer transcript into words', () => {
    expect(spokenWordsOf('  The SUN, heats 2 water! ')).toEqual(['the', 'sun', 'heats', 'water']);
  });
});

describe('fuzzyMatch', () => {
  test('exact, homophones and spelling variants match', () => {
    expect(fuzzyMatch('sun', 'sun')).toBe(true);
    expect(isEquivalent('two', 'to')).toBe(true);
    expect(fuzzyMatch('four', 'for')).toBe(true);
    expect(fuzzyMatch('colors', 'colours')).toBe(true);
  });

  test('a wrong tense or plural is not accepted live', () => {
    expect(fuzzyMatch('work', 'worked')).toBe(false);
    expect(fuzzyMatch('plant', 'plants')).toBe(false);
  });

  test('small slips on long words pass, short or unrelated words do not', () => {
    expect(fuzzyMatch('beautifull', 'beautiful')).toBe(true);
    expect(fuzzyMatch('cat', 'cut')).toBe(false);
    expect(fuzzyMatch('river', 'mountain')).toBe(false);
    expect(fuzzyMatch('', 'river')).toBe(false);
  });

  test('levenshtein', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
  });
});
