import { categoryIcon } from '../quizHelpers';

describe('categoryIcon', () => {
  test('returns the real mapped icon for a known category', () => {
    // Pull a real key straight from CATEGORY_ICONS to avoid guessing its contents.
    const { CATEGORY_ICONS } = require('../../constants');
    const [knownCategory, knownIcon] = Object.entries(CATEGORY_ICONS)[0] as [string, any];
    expect(categoryIcon(knownCategory)).toBe(knownIcon);
  });

  test('falls back to "star" for an unknown category', () => {
    expect(categoryIcon('Not A Real Category')).toBe('star');
  });
});
