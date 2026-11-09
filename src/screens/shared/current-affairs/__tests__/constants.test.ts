import { ageGroupForGrade, formatReadTime, categoryColors, CATEGORIES, AGE_GROUPS, BRAND, PASTEL } from '../constants';

test.each([
  ['Nursery', 'under-8'], ['LKG', 'under-8'], ['UKG', 'under-8'], ['Pre-KG', 'under-8'],
  ['Grade 1', '8-12'], ['Grade 5', '8-12'], ['Grade 8', '8-12'], ['8', '8-12'],
  ['Grade 9', '13+'], ['Grade 12', '13+'], ['10', '13+'],
  [undefined, '8-12'], ['', '8-12'], ['Unknown', '8-12'],
])('grade %p → %s', (grade, expected) => {
  expect(ageGroupForGrade(grade as any)).toBe(expected);
});

test('stories per day match the PRD', () => {
  expect(AGE_GROUPS['under-8'].storiesPerDay).toBe(3);
  expect(AGE_GROUPS['8-12'].storiesPerDay).toBe(10);
  expect(AGE_GROUPS['13+'].storiesPerDay).toBe(18);
});

test('all 7 categories have a label, emoji and colour', () => {
  expect(Object.keys(CATEGORIES).sort()).toEqual(['economy', 'environment', 'india', 'science', 'society', 'sports', 'world']);
  for (const key of Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]) {
    expect(CATEGORIES[key].emoji).toBeTruthy();
    expect(categoryColors(key, false)).toEqual({ fg: BRAND[CATEGORIES[key].tone], bg: PASTEL[CATEGORIES[key].tone] });
  }
  expect(BRAND.gold).toBe('#B4A467');
});

test('formatReadTime', () => {
  expect(formatReadTime(45)).toBe('45 sec read');
  expect(formatReadTime(10)).toBe('30 sec read');
  expect(formatReadTime(75)).toBe('1 min read');
  expect(formatReadTime(150)).toBe('3 min read');
});
