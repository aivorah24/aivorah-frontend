import { hasReadAloudStories } from '../../utils/gradeAccess';

test.each([
  ['Grade 3', true], ['Grade 4', true], ['Grade 5', true], ['PYP 4', true], ['4', true],
  ['Grade 2', false], ['Grade 6', false], ['Grade 12', false], ['', false], [null, false], [undefined, false],
])('%s -> %s', (grade, want) => expect(hasReadAloudStories(grade as any)).toBe(want));
