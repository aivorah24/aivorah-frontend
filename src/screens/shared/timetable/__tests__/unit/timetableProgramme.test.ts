import {
  programmeForGrade, computeProgrammes, computeActiveProgramme,
  computeGradesForSelector, computeSectionsForGrade, PROG_ORDER,
} from '../../utils/timetableProgramme';

const STRUCTURE = [
  { name: 'Grade 3', sections: ['A', 'B'] },
  { name: 'Grade 8', sections: ['A'] },
  { name: 'Grade 12', sections: [] },
];

describe('programmeForGrade', () => {
  test('non-IB schools always return null', () => {
    expect(programmeForGrade('Grade 8', false)).toBeNull();
  });

  test('grades 1-5 map to PYP', () => {
    expect(programmeForGrade('Grade 1', true)).toBe('PYP');
    expect(programmeForGrade('Grade 5', true)).toBe('PYP');
  });

  test('grades 6-10 map to MYP', () => {
    expect(programmeForGrade('Grade 6', true)).toBe('MYP');
    expect(programmeForGrade('Grade 10', true)).toBe('MYP');
  });

  test('grades 11-12 map to DP', () => {
    expect(programmeForGrade('Grade 11', true)).toBe('DP');
    expect(programmeForGrade('Grade 12', true)).toBe('DP');
  });

  test('a name with no parseable number defaults to PYP', () => {
    expect(programmeForGrade('Kindergarten', true)).toBe('PYP');
  });
});

describe('computeProgrammes', () => {
  test('non-IB returns an empty list', () => {
    expect(computeProgrammes(STRUCTURE, false)).toEqual([]);
  });

  test('IB returns only the programmes actually present, in PROG_ORDER', () => {
    expect(computeProgrammes(STRUCTURE, true)).toEqual(['PYP', 'MYP', 'DP']);
  });

  test('IB with only MYP grades returns just MYP', () => {
    expect(computeProgrammes([{ name: 'Grade 7', sections: [] }], true)).toEqual(['MYP']);
  });

  test('PROG_ORDER is the canonical PYP/MYP/DP sequence', () => {
    expect(PROG_ORDER).toEqual(['PYP', 'MYP', 'DP']);
  });
});

describe('computeActiveProgramme', () => {
  test('an explicit programme selection wins over everything else', () => {
    expect(computeActiveProgramme('DP', 'Grade 3', true, ['PYP', 'MYP', 'DP'])).toBe('DP');
  });

  test('falls back to the selected grade\'s programme when none is explicitly chosen', () => {
    expect(computeActiveProgramme(null, 'Grade 8', true, ['PYP', 'MYP', 'DP'])).toBe('MYP');
  });

  test('falls back to the first available programme when there is no selected grade', () => {
    expect(computeActiveProgramme(null, null, true, ['MYP', 'DP'])).toBe('MYP');
  });

  test('non-IB with nothing selected returns null', () => {
    expect(computeActiveProgramme(null, null, false, [])).toBeNull();
  });
});

describe('computeGradesForSelector', () => {
  test('non-IB returns the full structure unfiltered', () => {
    expect(computeGradesForSelector(STRUCTURE, false, 'PYP')).toEqual(STRUCTURE);
  });

  test('IB filters to grades matching the active programme', () => {
    expect(computeGradesForSelector(STRUCTURE, true, 'MYP')).toEqual([{ name: 'Grade 8', sections: ['A'] }]);
  });

  test('IB with no matching grades returns an empty list', () => {
    expect(computeGradesForSelector(STRUCTURE, true, null)).toEqual([]);
  });
});

describe('computeSectionsForGrade', () => {
  test('returns the sections for the selected grade', () => {
    expect(computeSectionsForGrade(STRUCTURE, 'Grade 3')).toEqual(['A', 'B']);
  });

  test('returns an empty list for a grade with no sections', () => {
    expect(computeSectionsForGrade(STRUCTURE, 'Grade 12')).toEqual([]);
  });

  test('returns an empty list when nothing is selected', () => {
    expect(computeSectionsForGrade(STRUCTURE, null)).toEqual([]);
  });

  test('returns an empty list for a grade not present in structure', () => {
    expect(computeSectionsForGrade(STRUCTURE, 'Grade 99')).toEqual([]);
  });
});
