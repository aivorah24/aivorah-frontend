import { ageGroupForGrade, formatReadTime, CATEGORIES, AGE_GROUPS, GOLD, SAGE } from '../constants';

test.each([
  ['Nursery', 'under-8'], ['LKG', 'under-8'], ['UKG', 'under-8'], ['Pre-KG', 'under-8'],
  ['Grade 1', '8-12'], ['Grade 5', '8-12'], ['Grade 8', '8-12'], ['8', '8-12'],
  ['Grade 9', '13+'], ['Grade 12', '13+'], ['10', '13+'],
  [undefined, '8-12'], ['', '8-12'], ['Unknown', '8-12'],
])('grade %p → %s', (grade, expected) => {
  expect(ageGroupForGrade(grade as any)).toBe(expected);
});

test('stories per day match the PRD', () => {
  expect(AGE_GROUPS['under-8'].storiesPerDay).toBe(5);
  expect(AGE_GROUPS['8-12'].storiesPerDay).toBe(6);
  expect(AGE_GROUPS['13+'].storiesPerDay).toBe(7);
});

test('all 7 categories have a label and a Feather icon (no emoji)', () => {
  expect(Object.keys(CATEGORIES).sort()).toEqual(['economy', 'environment', 'india', 'science', 'society', 'sports', 'world']);
  for (const cat of Object.values(CATEGORIES)) {
    expect(cat.label).toBeTruthy();
    expect(cat.icon).toMatch(/^[a-z-]+$/);
  }
});

test('uses the app palette (gold + sage, same as World & You / Daily Habits)', () => {
  expect(GOLD).toBe('#BAA467');
  expect(SAGE).toBe('#9FB2A4');
});

test('formatReadTime', () => {
  expect(formatReadTime(45)).toBe('45 sec read');
  expect(formatReadTime(10)).toBe('30 sec read');
  expect(formatReadTime(75)).toBe('1 min read');
  expect(formatReadTime(150)).toBe('3 min read');
});
