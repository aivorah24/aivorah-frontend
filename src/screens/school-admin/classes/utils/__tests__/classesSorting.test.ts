import { gradeSortKey, sortGradeOptions, filterAndSortClasses, rankPickerTeachers, ClassRow, TeacherOption } from '../classesSorting';

function cls(overrides: Partial<ClassRow> = {}): ClassRow {
  return { grade: 'Grade 1', section: 'A', studentCount: 0, classTeacherEmail: null, classTeacherName: null, ...overrides };
}

function teacher(overrides: Partial<TeacherOption> = {}): TeacherOption {
  return { id: 't1', name: 'Teacher', email: 't@x.com', teaches: [], ...overrides };
}

describe('gradeSortKey', () => {
  test('extracts the numeric portion of a grade name', () => {
    expect(gradeSortKey('Grade 2')).toBe(2);
    expect(gradeSortKey('Grade 10')).toBe(10);
  });

  test('sorts non-numeric names after every numbered grade', () => {
    expect(gradeSortKey('Kindergarten')).toBe(Number.MAX_SAFE_INTEGER);
    expect(gradeSortKey('')).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('sortGradeOptions', () => {
  test('dedupes and sorts numerically, not lexically ("Grade 2" before "Grade 10")', () => {
    const classes = [cls({ grade: 'Grade 10' }), cls({ grade: 'Grade 2' }), cls({ grade: 'Grade 2' })];
    expect(sortGradeOptions(classes)).toEqual(['Grade 2', 'Grade 10']);
  });

  test('returns an empty array for no classes', () => {
    expect(sortGradeOptions([])).toEqual([]);
  });

  test('falls back to alphabetical when numeric keys tie (both non-numeric)', () => {
    const classes = [cls({ grade: 'Bravo' }), cls({ grade: 'Alpha' })];
    expect(sortGradeOptions(classes)).toEqual(['Alpha', 'Bravo']);
  });
});

describe('filterAndSortClasses', () => {
  const classes = [
    cls({ grade: 'Grade 10', section: 'B' }),
    cls({ grade: 'Grade 2', section: 'B' }),
    cls({ grade: 'Grade 2', section: 'A' }),
  ];

  test('with no filter, sorts by grade then section', () => {
    expect(filterAndSortClasses(classes, '')).toEqual([
      cls({ grade: 'Grade 2', section: 'A' }),
      cls({ grade: 'Grade 2', section: 'B' }),
      cls({ grade: 'Grade 10', section: 'B' }),
    ]);
  });

  test('with a filter, only that grade\'s rows are returned', () => {
    const result = filterAndSortClasses(classes, 'Grade 2');
    expect(result.map((c) => `${c.grade}-${c.section}`)).toEqual(['Grade 2-A', 'Grade 2-B']);
  });

  test('a filter matching nothing returns an empty array', () => {
    expect(filterAndSortClasses(classes, 'Grade 99')).toEqual([]);
  });

  test('does not mutate the input array', () => {
    const original = [...classes];
    filterAndSortClasses(classes, '');
    expect(classes).toEqual(original);
  });
});

describe('rankPickerTeachers', () => {
  const pickerFor = cls({ grade: 'Grade 6' });

  test('returns an empty array when no class is being assigned', () => {
    expect(rankPickerTeachers([teacher()], null, '')).toEqual([]);
  });

  test('teachers who teach this grade surface first', () => {
    const a = teacher({ id: 'a', name: 'Alice', teaches: [] });
    const b = teacher({ id: 'b', name: 'Bob', teaches: [{ grade: 'Grade 6' }] });
    const result = rankPickerTeachers([a, b], pickerFor, '');
    expect(result.map((t) => t.id)).toEqual(['b', 'a']);
  });

  test('ties within the same teach-relevance group are sorted alphabetically by name', () => {
    const b = teacher({ id: 'b', name: 'Bob' });
    const a = teacher({ id: 'a', name: 'Alice' });
    expect(rankPickerTeachers([b, a], pickerFor, '').map((t) => t.id)).toEqual(['a', 'b']);
  });

  test('filters by name, case-insensitively', () => {
    const result = rankPickerTeachers([teacher({ name: 'Alice Smith' })], pickerFor, 'alice');
    expect(result).toHaveLength(1);
  });

  test('filters by email, case-insensitively', () => {
    const result = rankPickerTeachers([teacher({ email: 'Alice@School.com' })], pickerFor, 'alice@school');
    expect(result).toHaveLength(1);
  });

  test('a search matching nothing returns an empty array', () => {
    expect(rankPickerTeachers([teacher({ name: 'Alice' })], pickerFor, 'zzz')).toEqual([]);
  });

  test('an empty search returns every teacher', () => {
    expect(rankPickerTeachers([teacher(), teacher({ id: 't2' })], pickerFor, '')).toHaveLength(2);
  });

  test('treats a missing "teaches" array as teaching nothing, rather than throwing', () => {
    const noTeaches = { id: 'a', name: 'Alice', email: 'a@x.com' } as unknown as TeacherOption;
    const result = rankPickerTeachers([noTeaches], pickerFor, '');
    expect(result).toHaveLength(1);
  });

  test('treats a missing name as empty for both filtering and the alphabetical tiebreak', () => {
    const noName = { id: 'a', email: 'a@x.com', teaches: [] } as unknown as TeacherOption;
    const named = teacher({ id: 'b', name: 'Bob' });
    const result = rankPickerTeachers([named, noName], pickerFor, '');
    expect(result.map((t) => t.id)).toEqual(['a', 'b']);
  });
});
