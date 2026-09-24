import { promoteGradeChoices } from '../promoteGradeChoices';

describe('promoteGradeChoices', () => {
  test('offers higher grades even when the school only has students in Grade 10', () => {
    expect(promoteGradeChoices(['Grade 10'], 10)).toEqual(['Grade 11', 'Grade 12']);
  });

  test('offers grades above a mid-range selection, in order, without duplicates', () => {
    expect(promoteGradeChoices(['Grade 5', 'Grade 6'], 5)).toEqual(['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']);
  });

  test('offers nothing above Grade 12', () => {
    expect(promoteGradeChoices(['Grade 12'], 12)).toEqual([]);
  });
});
