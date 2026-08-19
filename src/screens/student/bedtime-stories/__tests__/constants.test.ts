import { safeIcon, getPastelGradient } from '../constants';

describe('safeIcon', () => {
  test('a mapped icon name returns its real Feather icon', () => {
    expect(safeIcon('crown')).toBe('award');
  });

  test('an unmapped icon name falls back to "book-open"', () => {
    expect(safeIcon('does-not-exist')).toBe('book-open');
  });
});

describe('getPastelGradient', () => {
  test('a mapped cover color returns its real pastel gradient', () => {
    expect(getPastelGradient('#7c3aed')).toEqual(['#C5BD96', '#9FB2A4']);
  });

  test('an unmapped color falls back to the default gradient', () => {
    expect(getPastelGradient('#000000')).toEqual(['#9FB2A4', '#C5BD96']);
  });
});
